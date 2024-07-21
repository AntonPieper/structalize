import { describe, expect, expectTypeOf, it } from "vitest";
import struct, {
  FLOAT32_MAX_VALUE,
  MutableStruct,
  prop,
  Struct,
} from "./struct";

describe("struct", () => {
  const Message = struct([
    prop.i64("big"),
    prop.u8("smol", 3),
    prop.f32("float"),
  ]);
  type Message = Struct<typeof Message>;
  type MutableMessage = MutableStruct<typeof Message>;

  const MESSAGE_SIZE = 8 + 3 + 1 + 4;

  describe("Message structure", () => {
    it("should have the correct size and schema indices", () => {
      expect(Message.size).toBe(MESSAGE_SIZE);
      expect(Message.schema.big.index).toBe(0 / 8);
      expect(Message.schema.smol.index).toBe(8 / 1);
      expect(Message.schema.float.index).toBe(12 / 4);
    });
  });

  describe("Creating and reading messages", () => {
    const createSampleData = () => {
      const data = new ArrayBuffer(MESSAGE_SIZE);
      new BigInt64Array(data).set([1n]);
      new Uint8Array(data, 8).set([2, 3, 4]);
      new Float32Array(data, 12).set([0.1]);
      return data;
    };

    it("should create a message with default values", () => {
      const msg = struct.new(Message);
      expectTypeOf(msg).toEqualTypeOf<MutableMessage>();
      expect(msg).toBeDefined();
      expect(msg.big).toBeTypeOf("bigint");
      expect(msg.smol).toEqual(new Uint8Array([0, 0, 0]));
      expect(msg.float).toBeTypeOf("number");
    });

    it("should read a message from ArrayBuffer", () => {
      const data = createSampleData();
      const msg = struct.read(Message, data);
      expectTypeOf(msg).toEqualTypeOf<MutableMessage>();
      expect(msg.big).toBe(1n);
      expect(msg.smol).toEqual(new Uint8Array([2, 3, 4]));
      expect(msg.float).toBeCloseTo(0.1, 5);
    });

    it("should read a message from ArrayBufferView", () => {
      const data = createSampleData();
      const viewBuffer = new ArrayBuffer(MESSAGE_SIZE + 24);
      const view = new Uint8Array(viewBuffer, 24);
      view.set(new Uint8Array(data));

      const msg = struct.read(Message, view);
      expectTypeOf(msg).toEqualTypeOf<MutableMessage>();
      expect(msg.big).toBe(1n);
      expect(msg.smol).toEqual(new Uint8Array([2, 3, 4]));
      expect(msg.float).toBeCloseTo(0.1, 5);
    });

    it("should handle unaligned read from ArrayBufferView gracefully", () => {
      const viewBuffer = new ArrayBuffer(MESSAGE_SIZE + 20);
      const view = new Uint8Array(viewBuffer, 20);
      expect(() => struct.read(Message, view)).toThrowError();
    });

    it("should handle empty data buffer gracefully", () => {
      expect(() => struct.read(Message, new ArrayBuffer(0))).toThrowError();
    });
  });

  describe("Writing messages", () => {
    const writeMessageToBuffer = (msg: MutableMessage) => {
      const buffer = new ArrayBuffer(Message.size);
      struct.write(msg, buffer);
      return new DataView(buffer);
    };

    it("should write a message to ArrayBuffer", () => {
      const msg = struct.new(Message);
      msg.big = 4n;
      msg.smol = new Uint8Array([0, 2, 8]);
      msg.float = 4.5;
      const view = writeMessageToBuffer(msg);

      expect(view.getBigInt64(0, true)).toBe(4n);
      expect(view.getUint8(8)).toBe(0);
      expect(view.getUint8(9)).toBe(2);
      expect(view.getUint8(10)).toBe(8);
      expect(view.getFloat32(12, true)).toBeCloseTo(4.5, 5);
    });

    it("should write a message to ArrayBufferView", () => {
      const msg = struct.new(Message);
      msg.big = 4n;
      msg.smol = new Uint8Array([0, 2, 8]);
      msg.float = 4.5;
      const buffer = new ArrayBuffer(Message.size + 24);
      const viewBuffer = new Uint8Array(buffer, 24);
      struct.write(msg, viewBuffer);
      const dataView = new DataView(
        viewBuffer.buffer,
        viewBuffer.byteOffset,
        viewBuffer.byteLength,
      );
      expect(dataView.getBigInt64(0, true)).toBe(4n);
      expect(dataView.getUint8(8)).toBe(0);
      expect(dataView.getUint8(9)).toBe(2);
      expect(dataView.getUint8(10)).toBe(8);
      expect(dataView.getFloat32(12, true)).toBeCloseTo(4.5, 5);
    });

    it("should handle unaligned write to ArrayBufferView gracefully", () => {
      const msg = struct.new(Message);
      const buffer = new ArrayBuffer(Message.size + 20);
      const view = new Uint8Array(buffer, 20);
      expect(() => struct.write(msg, view)).toThrowError();
    });

    it("should handle empty buffer writes gracefully", () => {
      const msg = struct.new(Message);
      expect(() => struct.write(msg, new ArrayBuffer(1))).toThrowError();
    });

    it("should handle boundary values correctly", () => {
      const BoundaryMessage = struct([
        prop.i64("big"),
        prop.u8("smol", 3),
        prop.f32("float"),
        prop.f64("double"),
      ]);
      const BOUNDARY_MSG_SIZE = 8 + 3 + 1 + 4 + 8;
      expect(BoundaryMessage.size).toBe(BOUNDARY_MSG_SIZE);

      const msg = struct.new(BoundaryMessage);
      msg.big = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
      msg.smol = new Uint8Array([255, 255, 255]);
      msg.float = FLOAT32_MAX_VALUE;
      msg.double = Number.MAX_VALUE;

      const buffer = new ArrayBuffer(BoundaryMessage.size);
      struct.write(msg, buffer);
      const view = new DataView(buffer);

      expect(view.getBigInt64(0, true)).toBe(
        BigInt(Number.MAX_SAFE_INTEGER) + 1n,
      );
      expect(view.getUint8(8)).toBe(255);
      expect(view.getUint8(9)).toBe(255);
      expect(view.getUint8(10)).toBe(255);
      expect(view.getFloat32(12, true)).toBe(FLOAT32_MAX_VALUE);
      expect(view.getFloat64(16, true)).toBe(Number.MAX_VALUE);
    });

    it("should modify an existing message correctly", () => {
      const msg = struct.new(Message);
      msg.big = 4n;
      msg.smol = new Uint8Array([0, 2, 8]);
      msg.float = 4.5;

      // Modify the message
      msg.big = 10n;
      msg.smol[1] = 5;
      msg.float = 9.9;

      const view = writeMessageToBuffer(msg);

      expect(view.getBigInt64(0, true)).toBe(10n);
      expect(view.getUint8(8)).toBe(0);
      expect(view.getUint8(9)).toBe(5);
      expect(view.getUint8(10)).toBe(8);
      expect(view.getFloat32(12, true)).toBeCloseTo(9.9, 5);
    });
  });
});
