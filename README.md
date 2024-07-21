# structalize

`structalize` is a TypeScript library for defining and manipulating structured binary data. It provides a type-safe way to create, read, and write binary structures using typed arrays.

## Installation

You can install `structalize` via npm:

```bash
npm install structalize
```

## Usage

### Defining a Structure

To define a structure, use the `prop` function to define the properties of the structure and the `struct` function to create the structure template.

```ts
import struct, { prop } from 'structalize';

const MyStruct = struct([
  prop.i32('id'),
  prop.f32('value'),
  prop.u8('flags', 4)
]);
```

### Creating a New Structure Instance

You can create a new instance of the defined structure with default values using `struct.new`.

```ts
const instance = struct.new(MyStruct);
console.log(instance.id);    // Default value for i32, typically 0
console.log(instance.value); // Default value for f32, typically 0.0
console.log(instance.flags); // Default value for u8 array, typically [0, 0, 0, 0]
```

### Reading a Structure from a Buffer

You can read data from an `ArrayBuffer` into a structure using `struct.read`.

```ts
const buffer = new ArrayBuffer(MyStruct.size);
// Fill buffer with your binary data...
const instance = struct.read(MyStruct, buffer);
console.log(instance.id);
console.log(instance.value);
console.log(instance.flags);
```

### Writing a Structure to a Buffer

You can write the data from a structure instance back into an `ArrayBuffer` using `struct.write`.

```ts
const buffer = new ArrayBuffer(MyStruct.size);
struct.write(instance, buffer);
// Now buffer contains the binary representation of the instance
```

## API Reference

### TypedArray

`structalize` provides a set of typed arrays to define the types of properties in a structure:

- `i8`: `Int8Array`
- `u8`: `Uint8Array`
- `u8_clamped`: `Uint8ClampedArray`
- `i16`: `Int16Array`
- `u16`: `Uint16Array`
- `i32`: `Int32Array`
- `u32`: `Uint32Array`
- `i64`: `BigInt64Array`
- `u64`: `BigUint64Array`
- `f32`: `Float32Array`
- `f64`: `Float64Array`

### PropertyType

A utility type representing the keys of `TypedArray`.

### Member

Represents a member (property) of a structure:

```ts
type Member<Type extends PropertyType = PropertyType, Name extends string = string, Count extends number = number> = {
  type: Type;
  name: Name;
  count: Count;
};
```

### StructTemplate

Represents the template of a structure:

```ts
interface StructTemplate<S extends Member[] = Member[]> {
  size: number;
  alignment: number;
  schema: Schema<S>;
}
```

### prop

A function to define members of a structure. It also provides shorthand functions for each property type:

```ts
prop.i32('name');
prop.u8('name', 4);
```

### struct

A function to create a structure template and methods to read and write structures:

```ts
const MyStruct = struct([
  prop.i32('id'),
  prop.f32('value'),
  prop.u8('flags', 4)
]);

const instance = struct.new(MyStruct);
const buffer = new ArrayBuffer(MyStruct.size);
struct.write(instance, buffer);
const readInstance = struct.read(MyStruct, buffer);
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## License

This project is licensed under the MIT License.
