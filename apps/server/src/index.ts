import { createServer } from "node:http";
import express from "express";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { MahjongRoom } from "./rooms/MahjongRoom.js";

const port = Number(process.env.PORT ?? 2567);
const app = express();

app.get("/health", (_request, response) => {
  response.json({ ok: true, service: "jade-court-server" });
});

const server = createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server })
});

gameServer.define("mahjong", MahjongRoom).filterBy(["private"]);

server.listen(port, () => {
  console.log(`Mahjong server listening on ws://localhost:${port}`);
});
