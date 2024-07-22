type Values<T> = T[keyof T];

/**
 * Mapping from short names to TypedArray constructors.
 */
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
/**
 * TypedArray constructor type.
 */
export type TypedArrayConstructor = Values<typeof TypedArray>
/**
 * An instamce of a TypedArray is a view onto the underlying ArrayBuffer.
 */
export type TypedArray = InstanceType<TypedArrayConstructor>;

/**
 * Enum of struct member types.
 * @enum {TypedArray}
 */
export const PropertyType: { [P in keyof typeof TypedArray]: P } = (() => {
  const result: Record<string, string> = {};
  let key: keyof typeof TypedArray;
  for (key in TypedArray) {
    result[key] = key;
  }
  return result as typeof PropertyType;
})();

/**
 * Values of PropertyType enum.
 */
export type PropertyType = Values<typeof PropertyType>;

/**
 * A member of a struct.
 *
 * @template Type  the type of the member.
 * @template Name  the name of the member.
 * @template Count the count of the member. If 1, the value can be accessed on an instance directly (no wrwpping array).
 */
export type Member<
  Type extends PropertyType = PropertyType,
  Name extends string = string,
  Count extends number = number,
> = {
  type: Type;
  name: Name;
  count: Count;
};

/**
 * A member of a struct compiled for tge template.
 *
 * @template Descriptor the source member descriptor.
 */
export type TemplateMember<Descriptor extends Member = Member> = {
  type: Descriptor["type"];
  count: Descriptor["count"];
  index: number;
};

/**
 * Processea a schema of a struct into a template's schema.
 *
 * @template S the unprocessed schema
 */
export type Schema<S extends Member[] = Member[]> = {
  [P in S[number] as P["name"]]: TemplateMember<P>;
};

/**
 * Stores meta information about a struct to (de-)serialize structs
 * and verify the correctness of processed data.
 *
 * @template S the unprocessed schema input.
 */
export interface StructTemplate<S extends Member[] = Member[]> {
  size: number;
  alignment: number;
  schema: Schema<S>;
}

/**
 * Mutable version of {@link ArrayLike<T>}.
 *
 * @template T the element type.
 *
 * @see {@link ArrayLike<T>} for readonly version.
 */
export interface MutableArrayLike<T> extends ArrayLike<T> {
  [index: number]: T;
}

/**
 * Single element type for a given member type enum.
 *
 * @template P the member type to retreive the type for.
 */
export type ElementType<P extends PropertyType> = NonNullable<
  InstanceType<(typeof TypedArray)[P]>[0]
>;

/**
 * Mutable array type for a given member type enum.
 *
 * @template P the member type enum to retreive the type for.
 *
 * @see {@link ArrayType<P>} for readonly version.
 */
export type MutableArrayType<P extends PropertyType> = P extends PropertyType
  ? MutableArrayLike<ElementType<P>>
  : never;

/**
 * Readonly array type for a given member type enum.
 *
 * @template P the member type enum to retreive the type for.
 *
 * @see {@link MutableArrayType<P>} for mutable version.
 */
export type ArrayType<P extends PropertyType> = P extends PropertyType
  ? ArrayLike<ElementType<P>>
  : never;

/**
 * Processes a struct member descriptor of a template into a
 * readonly instance's member variable's type.
 *
 * @template M the member of the template to process.
 *
 * @see {@link MutableJsType<M>} for mutable version.
 */
export type JsType<M extends TemplateMember> = 1 extends M["count"]
  ? number extends M["count"]
    ? ElementType<M["type"]> | ArrayType<M["type"]>
    : ElementType<M["type"]>
  : ArrayType<M["type"]>;

/**
 * Processes a struct member descriptor of a template into a
 * mutable instance's member variable's type.
 *
 * @template M the member of the template to process.
 *
 * @see {@link JsType<M>} for readonly version.
 */
export type MutableJsType<M extends TemplateMember> = 1 extends M["count"]
  ? number extends M["count"]
    ? ElementType<M["type"]> | MutableArrayType<M["type"]>
    : ElementType<M["type"]>
  : MutableArrayType<M["type"]>;

/**
 * A readonly instance of a struct template.
 *
 * @template T the template that describes this instance.
 *
 * @see {@link MutableStruct<T>} for mutable version.
 */
export type Struct<T extends StructTemplate = StructTemplate> = {
  readonly [P in keyof T["schema"]]: JsType<T["schema"][P]>;
} & { readonly [templateSym]: T };

/**
 * A mutable instance of a struct template.
 *
 * @template T the template that describes this instance.
 *
 * @see {@link Struct<T>} for readonly version.
 */
export type MutableStruct<T extends StructTemplate = StructTemplate> = {
  [P in keyof T["schema"]]: MutableJsType<T["schema"][P]>;
} & { readonly [templateSym]: T };

/**
 * A shorthand version of the {@link prop} function.
 *
 * @template Type the type this shorthand binds to.
 */
export type ShorthandPropFn<Type extends PropertyType> = {
  /**
   * Creates a Member with the given parameters and this shorthand's type.
   *
   * @param name  The name of the member.
   * @param count The amount of values of this member's type to store. Defaults to `1`.
   *
   * @see {@link prop}
   */
  <Name extends string>(name: Name, count?: undefined): Member<Type, Name, 1>;

  /**
   * Creates a Member with the given parameters and this shorthand's type.
   *
   * @param name  The name of the member.
   * @param count The amount of values of this member's type to store. Defaults to `1`.
   *
   * @see {@link prop}
   */
  <Name extends string, Count extends number>(
    name: Name,
    count: Count,
  ): Member<Type, Name, Count>;
};

/**
 * Factory functions to create {@link Member} descriptors.
 */
export type PropFn = {
  /**
   * Creates a Member with the given parameters.
   *
   * @param type  The type of the member.
   * @param name  The name of the member.
   * @param count The amount of values of this member's type to store. Defaults to `1`.
   */
  <Type extends PropertyType, Name extends string>(
    type: Type,
    name: Name,
    count?: undefined,
  ): Member<Type, Name, 1>;

  /**
   * Creates a Member with the given parameters.
   *
   * @param type  The type of the member.
   * @param name  The name of the member.
   * @param count The amount of values of this member's type to store. Defaults to `1`.
   */
  <Type extends PropertyType, Name extends string, Count extends number>(
    type: Type,
    name: Name,
    count: Count,
  ): Member<Type, Name, 1>;
} & {
  /**
   * A shorthand for the type `P`.
   */
  [P in PropertyType]: ShorthandPropFn<P>;
};

/**
 * Struct declaration, creation, serialization and deserialization
 * functions.
 */
export type StructFn = {
  /**
   * Creates a template for a struct. Can be used to {@link StructFn.read read}, {@link StructFn.write write} and {@link StructFn.new create} instances.
   *
   * @param schema the schema for this template.
   */
  <const S extends Member[]>(schema: S): StructTemplate<S>;

  /**
   * Creates an instance of the passed `template` by reading from the
   * given `buffer`.
   *
   * @param template The template that describes the structure.
   * @param buffer   The data to deserialize.
   */
  read<const T extends StructTemplate>(
    template: T,
    buffer: ArrayBufferLike,
  ): MutableStruct<T>;

  /**
   * Creates a zero-initialized instance of `template`.
   *
   * @param template The template that describes the structure.
   */
  "new"<T extends StructTemplate>(template: T): MutableStruct<T>;

  /**
   * Writes the given `struct` into the `buffer`.
   *
   * @param struct The struct to serialize.
   * @param buffer The buffer to erite to.
   */
  write(struct: Struct, buffer: ArrayBufferLike): void;
};

/**
 * Factory functions to create {@link Member} descriptors.
 */
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

/**
 * Symbol used to store the templaze inside the instances without
 * limiting the struct's member names.
 */
const templateSym = Symbol("template");

/**
 * Struct declaration, creation, serialization and deserialization
 * functions.
 */
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

/**
 * Zero values of the correct type for each struxt member type.
 */
const defaultValues = (() => {
  const result: Record<string, ElementType<PropertyType>> = {};
  let name: PropertyType;
  for (name in TypedArray) {
    result[name] = new TypedArray[name](1)[0];
  }
  return result as { [P in PropertyType]: ElementType<P> };
})();

/**
 * Aligns `size` to the next `alignment`.
 *
 * @param size      The size to align.
 * @param alignment The alignment to use.
 */
function alignTo(size: number, alignment: number): number {
  return Math.ceil(size / alignment) * alignment;
}

/**
 * Creates views for all types present in `template`.
 *
 * @param buffer   The array buffer to view.
 * @param template The schema to process the views for.
 */
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

/**
 * Type preducate to determine whether `obj` is {@link ArrayLike}
 */
function isArrayLike(obj: any): obj is ArrayLike<any> {
  return obj != null && typeof obj.length === "number" && obj.length >= 0;
}

/**
 * Helper function to create a view for any array buffer.
 */
function viewBuffer(buffer: ArrayBufferLike): Uint8Array {
  if (ArrayBuffer.isView(buffer)) {
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }
  return new Uint8Array(buffer, 0, buffer.byteLength);
}

/**
 * Maximum finite 32-Bit floating point value.
 */
export const FLOAT32_MAX_VALUE: number = new Float32Array(
  new Uint32Array([0x7f7fffff]).buffer,
  0,
  1,
)[0];

export default struct;
