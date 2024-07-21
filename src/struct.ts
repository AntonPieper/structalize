type Values<T> = T[keyof T];

export const TypedArray = {
  i8: Int8Array,
  u8: Uint8Array,
  u8_clamped: Uint8ClampedArray,
  i16: Int16Array,
  u16: Uint16Array,
  i32: Int32Array,
  u32: Uint32Array,
  i64: BigInt64Array,
  u64: BigUint64Array,
  f32: Float32Array,
  f64: Float64Array,
} as const;
export type TypedArrayConstructor = Values<typeof TypedArray>;
export type TypedArray = InstanceType<TypedArrayConstructor>;

export const PropertyType: { [P in keyof typeof TypedArray]: P } = (() => {
  const result: Record<string, string> = {};
  let key: keyof typeof TypedArray;
  for (key in TypedArray) {
    result[key] = key;
  }
  return result as typeof PropertyType;
})();
export type PropertyType = Values<typeof PropertyType>;

export type Member<
  Type extends PropertyType = PropertyType,
  Name extends string = string,
  Count extends number = number,
> = {
  type: Type;
  name: Name;
  count: Count;
};

export type TemplateMember<Descriptor extends Member = Member> = {
  type: Descriptor["type"];
  count: Descriptor["count"];
  index: number;
};

export type Schema<S extends Member[] = Member[]> = {
  [P in S[number] as P["name"]]: TemplateMember<P>;
};

export interface StructTemplate<S extends Member[] = Member[]> {
  size: number;
  alignment: number;
  schema: Schema<S>;
}
type ElementType<P extends PropertyType> = NonNullable<
  InstanceType<(typeof TypedArray)[P]>[0]
>;
export interface MutableArrayLike<T> extends ArrayLike<T> {
  [index: number]: T;
}
type MutableArrayType<P extends PropertyType> = P extends PropertyType
  ? MutableArrayLike<ElementType<P>>
  : never;
type ArrayType<P extends PropertyType> = P extends PropertyType
  ? ArrayLike<ElementType<P>>
  : never;
type JsType<M extends TemplateMember> = 1 extends M["count"]
  ? number extends M["count"]
    ? ElementType<M["type"]> | ArrayType<M["type"]>
    : ElementType<M["type"]>
  : ArrayType<M["type"]>;

type MutableJsType<M extends TemplateMember> = 1 extends M["count"]
  ? number extends M["count"]
    ? ElementType<M["type"]> | MutableArrayType<M["type"]>
    : ElementType<M["type"]>
  : MutableArrayType<M["type"]>;
export type Struct<T extends StructTemplate = StructTemplate> = {
  readonly [P in keyof T["schema"]]: JsType<T["schema"][P]>;
} & { readonly [templateSym]: T };

export type MutableStruct<T extends StructTemplate = StructTemplate> = {
  [P in keyof T["schema"]]: MutableJsType<T["schema"][P]>;
} & { readonly [templateSym]: T };

export type ShorthandPropFn<Type extends PropertyType> = {
  <Name extends string>(name: Name, count?: undefined): Member<Type, Name, 1>;
  <Name extends string, Count extends number>(
    name: Name,
    count: Count,
  ): Member<Type, Name, Count>;
};

export type PropFn = {
  <Type extends PropertyType, Name extends string>(
    type: Type,
    name: Name,
    count?: undefined,
  ): Member<Type, Name, 1>;
  <Type extends PropertyType, Name extends string, Count extends number>(
    type: Type,
    name: Name,
    count: Count,
  ): Member<Type, Name, 1>;
} & {
  [P in PropertyType]: ShorthandPropFn<P>;
};

export type StructFn = {
  <const S extends Member[]>(schema: S): StructTemplate<S>;
  read<const T extends StructTemplate>(
    template: T,
    buffer: ArrayBufferLike,
  ): MutableStruct<T>;
  "new"<T extends StructTemplate>(template: T): MutableStruct<T>;
  write(struct: Struct, buffer: ArrayBufferLike): void;
};

export const prop: PropFn = (() => {
  function prop(type: PropertyType, name: string, count = 1): Member {
    return { type: PropertyType[type], name, count };
  }
  function shorthand(type: PropertyType) {
    return prop.bind(undefined, type);
  }
  let name: PropertyType;
  for (name in PropertyType) {
    (prop as any)[name] = shorthand(name);
  }
  return prop as PropFn;
})();

const templateSym = Symbol("template");

export const struct: StructFn = (() => {
  function struct<const S extends Member[]>(schema: S): StructTemplate<S> {
    const result: StructTemplate = {
      size: 0,
      alignment: 0,
      schema: {},
    };
    for (const { type, name, count } of schema) {
      const elementSize = TypedArray[type].BYTES_PER_ELEMENT;
      result.size = alignTo(result.size, elementSize);
      result.alignment = Math.max(result.alignment, elementSize);
      result.schema[name] = {
        type,
        count,
        index: result.size / elementSize,
      };
      result.size += elementSize * count;
    }
    result.size = alignTo(result.size, result.alignment);
    return result as StructTemplate<S>;
  }
  struct.read = <const T extends StructTemplate>(
    template: T,
    buffer: ArrayBufferLike,
  ): MutableStruct<T> => {
    if (buffer.byteLength < template.size) {
      throw new Error(
        `Not enough space in buffer: Need ${template.size} B, Got ${buffer.byteLength} B`,
      );
    }
    const views = createViews(buffer, template);
    const result: Record<PropertyKey, unknown> = {};
    const schema = template.schema;
    let name: keyof typeof schema;
    for (name in schema) {
      const member = schema[name];
      if (member.count === 1) {
        result[name] = views[member.type]![member.index];
      } else {
        result[name] = views[member.type]!.slice(
          member.index,
          member.index + member.count,
        );
      }
    }
    result[templateSym] = template;
    return result as MutableStruct<T>;
  };
  struct.new = <T extends StructTemplate>(template: T): MutableStruct<T> => {
    const result: MutableStruct = {
      [templateSym]: template,
    };
    const schema = template.schema;
    let name: keyof typeof schema;
    for (name in schema) {
      const member = schema[name];
      const defaultValue = defaultValues[member.type];
      if (member.count === 1) {
        result[name] = defaultValue;
      } else {
        result[name] = new TypedArray[member.type](member.count);
      }
    }
    return result as MutableStruct<T>;
  };

  struct.write = (struct: Struct, buffer: ArrayBufferLike) => {
    const template = struct[templateSym];
    if (buffer.byteLength < template.size) {
      throw new Error(
        `Not enough space in buffer: Need ${template.size} B, Got ${buffer.byteLength} B`,
      );
    }
    const schema = template.schema;
    let name: keyof typeof schema;
    const views = createViews(buffer, template);
    for (name in schema) {
      const member = schema[name];
      const value = struct[name];
      if (isArrayLike(value)) {
        views[member.type]!.set(value as any, member.index);
      } else {
        views[member.type]![member.index] = value;
      }
    }
  };
  return struct;
})();

const defaultValues = (() => {
  const result: Record<string, ElementType<PropertyType>> = {};
  let name: PropertyType;
  for (name in TypedArray) {
    result[name] = new TypedArray[name](1)[0];
  }
  return result as { [P in PropertyType]: ElementType<P> };
})();

function alignTo(size: number, alignment: number): number {
  return Math.ceil(size / alignment) * alignment;
}

function createViews(
  buffer: ArrayBufferLike,
  template: StructTemplate,
): {
  [P in PropertyType]?: InstanceType<(typeof TypedArray)[P]>;
} {
  const result: Record<string, TypedArray> = {};
  const view = viewBuffer(buffer);
  if (view.byteOffset % template.alignment !== 0) {
    throw new Error(
      `Invalid alignment for struct: ${view.byteOffset} is not divsible by ${template.alignment}`,
    );
  }
  const types = new Set<PropertyType>();
  const schema = template.schema;
  for (const name in schema) {
    types.add(schema[name].type);
  }
  for (const name of types) {
    const type = TypedArray[name];
    result[name] = new type(
      view.buffer,
      view.byteOffset,
      view.byteLength / type.BYTES_PER_ELEMENT,
    );
  }
  return result as ReturnType<typeof createViews>;
}

function isArrayLike(obj: any): obj is ArrayLike<any> {
  return obj != null && typeof obj.length === "number" && obj.length >= 0;
}

function viewBuffer(buffer: ArrayBufferLike): Uint8Array {
  if (ArrayBuffer.isView(buffer)) {
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }
  return new Uint8Array(buffer, 0, buffer.byteLength);
}

export const FLOAT32_MAX_VALUE: number = new Float32Array(
  new Uint32Array([0x7f7fffff]).buffer,
  0,
  1,
)[0];
export default struct;
