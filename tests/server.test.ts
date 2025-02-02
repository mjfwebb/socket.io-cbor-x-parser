import { describe, expect, test } from "vitest";

import { Server } from "socket.io";
import { io as ioc } from "socket.io-client";
import { parser } from "../src/index.ts";

describe("parser", () => {
  test("allows connection", () => {
    const PORT = 54000;
    const server = new Server(PORT, {
      parser,
    });

    server.on("connect", (socket) => {
      socket.on("hello", () => {
        client.close();
        server.close();
      });
    });

    const client = ioc("ws://localhost:" + PORT, {
      parser,
    });

    client.on("connect", () => {
      client.emit("hello");
    });
  });

  test("supports binary", () => {
    const PORT = 54001;
    const server = new Server(PORT, {
      parser,
    });

    server.on("connect", (socket) => {
      socket.on("binary", (arg1, arg2, arg3) => {
        expect(arg1).to.eql([]);
        expect(arg2).to.eql({ a: "b" });
        expect(Buffer.isBuffer(arg3)).toEqual(true);
        client.close();
        server.close();
      });
    });

    const client = ioc("ws://localhost:" + PORT, {
      parser,
    });

    client.on("connect", () => {
      const buf = Buffer.from("asdfasdf", "utf8");
      client.emit("binary", [], { a: "b" }, buf);
    });
  });

  test("supports acknowledgements", () => {
    const PORT = 54002;
    const server = new Server(PORT, {
      parser,
    });

    server.on("connect", (socket) => {
      socket.on("ack", (arg1, callback) => {
        callback(42);
      });
    });

    const client = ioc("ws://localhost:" + PORT, {
      parser,
    });

    client.on("connect", () => {
      client.emit("ack", "question", (answer) => {
        expect(answer).to.eql(42);
        client.close();
        server.close();
      });
    });
  });

  test("supports multiplexing", () => {
    const PORT = 54003;
    const server = new Server(PORT, {
      parser,
    });

    server.of("/chat").on("connect", (socket) => {
      socket.on("hi", () => {
        client.close();
        server.close();
      });
    });

    const client = ioc("ws://localhost:" + PORT + "/chat", {
      parser,
    });

    client.on("connect", () => {
      client.emit("hi");
    });
  });

  test("supports namespace error", () => {
    const PORT = 54004;
    const server = new Server(PORT, {
      parser,
    });

    server.use((socket, next) => {
      next(new Error("invalid"));
    });

    const client = ioc("ws://localhost:" + PORT, {
      parser,
    });

    client.on("connect_error", (err) => {
      expect(err.message).to.eql("invalid");
      client.close();
      server.close();
    });
  });

  test("supports broadcasting", () => {
    const PORT = 54005;
    const server = new Server(PORT, {
      parser,
    });

    server.on("connect", (socket) => {
      server.emit("hey", "you");
    });

    const client = ioc("ws://localhost:" + PORT, {
      parser,
    });

    client.on("hey", (arg1) => {
      expect(arg1).to.eql("you");
      client.close();
      server.close();
    });
  });
});
