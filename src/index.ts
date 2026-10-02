import { decode, encode } from "cbor-x";
import Emitter from "component-emitter";
import type { Packet } from "socket.io-parser";
import { PacketType } from "socket.io-parser";

/**
 * Event names that socket.io and the Node.js EventEmitter give a meaning of
 * their own. A peer that sends an event with one of these names would run the
 * receiver's own listeners, such as `socket.on("disconnect")`, while the
 * socket stays connected. This is the list that socket.io-parser rejects.
 */
const RESERVED_EVENTS: ReadonlySet<string> = new Set([
  "connect",
  "connect_error",
  "disconnect",
  "disconnecting",
  "newListener",
  "removeListener",
]);

function isEventNameValid(eventName: unknown): boolean {
  return (
    typeof eventName === "number" ||
    (typeof eventName === "string" && !RESERVED_EVENTS.has(eventName))
  );
}

class Encoder {
  /**
   * Encode a packet into a list of strings/buffers
   */
  encode(packet: Packet): Buffer[] {
    return [encode(packet)];
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

class Decoder extends Emitter {
  /**
   * Receive a chunk (string or buffer) and optionally emit a "decoded" event with the reconstructed packet
   */
  add(chunk: Buffer | Uint8Array): void {
    if (!ArrayBuffer.isView(chunk)) {
      chunk = new Uint8Array(chunk);
    }

    const packet: Packet = decode(chunk);
    if (this.isPacketValid(packet)) {
      this.emit("decoded", packet);
    } else {
      throw new Error("invalid format");
    }
  }

  isPacketValid({ type, data, nsp, id }: Packet): boolean {
    const isNamespaceValid = typeof nsp === "string";
    const isAckIdValid = id === undefined || Number.isInteger(id);
    if (!isNamespaceValid || !isAckIdValid) {
      return false;
    }
    switch (type) {
      case PacketType.CONNECT: {
        // CONNECT
        return data === undefined || isObject(data);
      }
      case PacketType.DISCONNECT: {
        // DISCONNECT
        return data === undefined;
      }
      case PacketType.EVENT: // EVENT
      case PacketType.BINARY_EVENT: {
        // BINARY_EVENT
        return Array.isArray(data) && isEventNameValid(data[0]);
      }
      case PacketType.ACK: // ACK
      case PacketType.BINARY_ACK: {
        // BINARY_ASK
        return Array.isArray(data);
      }
      case PacketType.CONNECT_ERROR: {
        // CONNECT_ERROR
        return typeof data === "object";
      }
      default: {
        return false;
      }
    }
  }
  /**
   * Clean up internal buffers
   */
  destroy(): void {}
}

export const parser = { Encoder, Decoder };
