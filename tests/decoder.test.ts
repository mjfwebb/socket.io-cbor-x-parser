import { describe, expect, test } from "vitest";

import type { Packet } from "socket.io-parser";
import { PacketType } from "socket.io-parser";
import { parser } from "../src/index.ts";

function decode(packet: Packet): Packet[] {
  const [chunk] = new parser.Encoder().encode(packet);
  const decoder = new parser.Decoder();
  const decoded: Packet[] = [];
  decoder.on("decoded", (decodedPacket: Packet) => decoded.push(decodedPacket));
  decoder.add(chunk);
  return decoded;
}

describe("Decoder", () => {
  test.each([
    "connect",
    "connect_error",
    "disconnect",
    "disconnecting",
    "newListener",
    "removeListener",
  ])('rejects an event named "%s"', (eventName) => {
    for (const type of [PacketType.EVENT, PacketType.BINARY_EVENT]) {
      expect(() =>
        decode({ type, nsp: "/", data: [eventName, "payload"] }),
      ).toThrow("invalid format");
    }
  });

  test("rejects an event named by neither a string nor a number", () => {
    expect(() =>
      decode({ type: PacketType.EVENT, nsp: "/", data: [{ name: "hello" }] }),
    ).toThrow("invalid format");
  });

  test("rejects an event with no name", () => {
    expect(() =>
      decode({ type: PacketType.EVENT, nsp: "/", data: [] }),
    ).toThrow("invalid format");
  });

  test.each(["hello", 7])("decodes an event named %s", (eventName) => {
    const packet: Packet = {
      type: PacketType.EVENT,
      nsp: "/",
      data: [eventName, { a: "b" }],
    };

    expect(decode(packet)).toEqual([packet]);
  });

  test("decodes an ack whose first argument is a reserved name", () => {
    const packet: Packet = {
      type: PacketType.ACK,
      nsp: "/",
      id: 3,
      data: ["disconnect"],
    };

    expect(decode(packet)).toEqual([packet]);
  });
});
