import { Room, Client } from "colyseus";
import {
  GameState,
  Wind,
  createGame,
  discardTile,
  drawTile,
  sortHand
} from "@jade-court/mahjong-core";

interface JoinOptions {
  name?: string;
}

interface PlayerSession {
  sessionId: string;
  seat: Wind;
  name: string;
}

const seats: Wind[] = ["east", "south", "west", "north"];

export class MahjongRoom extends Room {
  maxClients = 4;
  private players: PlayerSession[] = [];
  private game: GameState | null = null;

  onCreate() {
    this.setMetadata({ kind: "mahjong" });

    this.onMessage("start", () => {
      if (this.players.length < 4) {
        this.broadcastSnapshot("Need four players before starting.");
        return;
      }
      this.game = createGame(this.players.map((player) => player.name));
      this.broadcastSnapshot("Hand started. East discards first.");
    });

    this.onMessage("draw", (client) => {
      const seat = this.seatFor(client);
      if (!this.game || !seat) return;
      this.game = drawTile(this.game, seat);
      this.broadcastSnapshot(`${seat} drew from the wall.`);
    });

    this.onMessage("discard", (client, tileId: string) => {
      const seat = this.seatFor(client);
      if (!this.game || !seat) return;
      this.game = discardTile(this.game, seat, tileId);
      this.broadcastSnapshot(`${seat} discarded.`);
    });

    this.onMessage("sort", (client) => {
      const seat = this.seatFor(client);
      const player = this.game?.players.find((item) => item.seat === seat);
      if (!player) return;
      player.hand = sortHand(player.hand);
      this.broadcastSnapshot(`${seat} sorted their hand.`);
    });
  }

  onJoin(client: Client, options: JoinOptions) {
    const seat = seats[this.players.length];
    const name = options.name?.trim() || `Player ${this.players.length + 1}`;
    this.players.push({ sessionId: client.sessionId, seat, name });
    this.broadcastSnapshot(`${name} joined as ${seat}.`);
  }

  onLeave(client: Client) {
    this.players = this.players.filter((player) => player.sessionId !== client.sessionId);
    this.game = null;
    this.broadcastSnapshot("A player left. The table reset.");
  }

  private seatFor(client: Client): Wind | null {
    return this.players.find((player) => player.sessionId === client.sessionId)?.seat ?? null;
  }

  private broadcastSnapshot(message: string) {
    this.broadcast("snapshot", {
      message,
      players: this.players.map(({ sessionId: _sessionId, ...player }) => player),
      game: this.game
    });
  }
}
