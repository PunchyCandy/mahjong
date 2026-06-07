export type Wind = "east" | "south" | "west" | "north";
export type Suit = "bamboo" | "dots" | "characters";
export type Honor = "east" | "south" | "west" | "north" | "red" | "green" | "white";
export type Flower = "plum" | "orchid" | "chrysanthemum" | "bamboo" | "spring" | "summer" | "autumn" | "winter";

export type Tile =
  | {
      id: string;
      kind: "suited";
      suit: Suit;
      rank: number;
      label: string;
      symbol: string;
      copy: number;
    }
  | {
      id: string;
      kind: "honor";
      honor: Honor;
      label: string;
      symbol: string;
      copy: number;
    }
  | {
      id: string;
      kind: "flower";
      flower: Flower;
      label: string;
      symbol: string;
      copy: number;
    };

export type PlayerId = string;

export interface PlayerState {
  id: PlayerId;
  name: string;
  seat: Wind;
  hand: Tile[];
  discards: Tile[];
  exposedSets: Tile[][];
}

export interface GameState {
  id: string;
  wall: Tile[];
  deadWall: Tile[];
  players: PlayerState[];
  dealer: Wind;
  turn: Wind;
  phase: "waiting" | "discard" | "draw" | "finished";
  lastDiscard: Tile | null;
}

const winds: Wind[] = ["east", "south", "west", "north"];
const suitData: Array<{ suit: Suit; label: string; symbols: string[] }> = [
  { suit: "bamboo", label: "Bam", symbols: ["一", "二", "三", "四", "五", "六", "七", "八", "九"] },
  { suit: "dots", label: "Dot", symbols: ["1", "2", "3", "4", "5", "6", "7", "8", "9"] },
  { suit: "characters", label: "Char", symbols: ["萬", "萬", "萬", "萬", "萬", "萬", "萬", "萬", "萬"] }
];
const honorData: Array<{ honor: Honor; label: string; symbol: string }> = [
  { honor: "east", label: "East", symbol: "東" },
  { honor: "south", label: "South", symbol: "南" },
  { honor: "west", label: "West", symbol: "西" },
  { honor: "north", label: "North", symbol: "北" },
  { honor: "red", label: "Red Dragon", symbol: "中" },
  { honor: "green", label: "Green Dragon", symbol: "發" },
  { honor: "white", label: "White Dragon", symbol: "白" }
];
const flowerData: Array<{ flower: Flower; label: string; symbol: string }> = [
  { flower: "plum", label: "Plum", symbol: "梅" },
  { flower: "orchid", label: "Orchid", symbol: "蘭" },
  { flower: "chrysanthemum", label: "Chrysanthemum", symbol: "菊" },
  { flower: "bamboo", label: "Bamboo Flower", symbol: "竹" },
  { flower: "spring", label: "Spring", symbol: "春" },
  { flower: "summer", label: "Summer", symbol: "夏" },
  { flower: "autumn", label: "Autumn", symbol: "秋" },
  { flower: "winter", label: "Winter", symbol: "冬" }
];

export function createWall(): Tile[] {
  const tiles: Tile[] = [];

  suitData.forEach(({ suit, label, symbols }) => {
    symbols.forEach((symbol, index) => {
      const rank = index + 1;
      for (let copy = 0; copy < 4; copy += 1) {
        tiles.push({
          id: `${suit}-${rank}-${copy}`,
          kind: "suited",
          suit,
          rank,
          label: `${rank} ${label}`,
          symbol: suit === "characters" ? String(rank) : symbol,
          copy
        });
      }
    });
  });

  honorData.forEach(({ honor, label, symbol }) => {
    for (let copy = 0; copy < 4; copy += 1) {
      tiles.push({ id: `${honor}-${copy}`, kind: "honor", honor, label, symbol, copy });
    }
  });

  flowerData.forEach(({ flower, label, symbol }, copy) => {
    tiles.push({ id: `${flower}-${copy}`, kind: "flower", flower, label, symbol, copy });
  });

  return tiles;
}

export function shuffleTiles<T>(input: T[], random = Math.random): T[] {
  const tiles = [...input];
  for (let index = tiles.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [tiles[index], tiles[swapIndex]] = [tiles[swapIndex], tiles[index]];
  }
  return tiles;
}

export function createGame(playerNames: string[], random = Math.random): GameState {
  const wall = shuffleTiles(createWall(), random);
  const players = winds.map((seat, index) => ({
    id: `player-${index + 1}`,
    name: playerNames[index] ?? seat,
    seat,
    hand: [] as Tile[],
    discards: [] as Tile[],
    exposedSets: [] as Tile[][]
  }));

  for (let round = 0; round < 13; round += 1) {
    players.forEach((player) => {
      const tile = wall.pop();
      if (tile) player.hand.push(tile);
    });
  }

  const dealer = players[0];
  const dealerTile = wall.pop();
  if (dealerTile) dealer.hand.push(dealerTile);

  return {
    id: cryptoSafeId(),
    wall,
    deadWall: [],
    players,
    dealer: "east",
    turn: "east",
    phase: "discard",
    lastDiscard: null
  };
}

export function discardTile(state: GameState, seat: Wind, tileId: string): GameState {
  if (state.turn !== seat || state.phase !== "discard") return state;
  const player = state.players.find((item) => item.seat === seat);
  if (!player) return state;
  const tileIndex = player.hand.findIndex((tile) => tile.id === tileId);
  if (tileIndex === -1) return state;

  const next = cloneState(state);
  const nextPlayer = next.players.find((item) => item.seat === seat);
  if (!nextPlayer) return state;
  const [tile] = nextPlayer.hand.splice(tileIndex, 1);
  nextPlayer.discards.push(tile);
  next.lastDiscard = tile;
  next.turn = nextWind(seat);
  next.phase = "draw";
  return next;
}

export function drawTile(state: GameState, seat: Wind): GameState {
  if (state.turn !== seat || state.phase !== "draw") return state;
  if (state.wall.length === 0) return { ...cloneState(state), phase: "finished" };

  const next = cloneState(state);
  const player = next.players.find((item) => item.seat === seat);
  const tile = next.wall.pop();
  if (!player || !tile) return state;
  player.hand.push(tile);
  next.phase = "discard";
  return next;
}

export function analyzeHand(hand: Tile[]) {
  const suited = hand.filter((tile): tile is Extract<Tile, { kind: "suited" }> => tile.kind === "suited");
  const counts = hand.reduce<Record<string, number>>((memo, tile) => {
    const key = tileKey(tile);
    memo[key] = (memo[key] ?? 0) + 1;
    return memo;
  }, {});

  const pairs = Object.values(counts).filter((count) => count >= 2).length;
  const pungs = Object.values(counts).filter((count) => count >= 3).length;
  const kongs = Object.values(counts).filter((count) => count === 4).length;
  const chows = countChows(suited);

  return {
    pairs,
    pungs,
    kongs,
    chows,
    visibleSets: pungs + chows,
    looksComplete: pungs + chows >= 4 && pairs >= 1
  };
}

export function sortHand(hand: Tile[]): Tile[] {
  const kindOrder: Record<Tile["kind"], number> = { suited: 1, honor: 2, flower: 3 };
  const suitOrder: Record<Suit, number> = { bamboo: 1, dots: 2, characters: 3 };
  return [...hand].sort((a, b) => {
    const kindDiff = kindOrder[a.kind] - kindOrder[b.kind];
    if (kindDiff) return kindDiff;
    if (a.kind === "suited" && b.kind === "suited") {
      return suitOrder[a.suit] - suitOrder[b.suit] || a.rank - b.rank;
    }
    return a.label.localeCompare(b.label);
  });
}

function countChows(hand: Array<Extract<Tile, { kind: "suited" }>>): number {
  let count = 0;
  suitData.forEach(({ suit }) => {
    for (let rank = 1; rank <= 7; rank += 1) {
      const hasRun = [rank, rank + 1, rank + 2].every((candidate) =>
        hand.some((tile) => tile.suit === suit && tile.rank === candidate)
      );
      if (hasRun) count += 1;
    }
  });
  return count;
}

function tileKey(tile: Tile): string {
  if (tile.kind === "suited") return `${tile.suit}-${tile.rank}`;
  if (tile.kind === "honor") return tile.honor;
  return tile.flower;
}

function nextWind(wind: Wind): Wind {
  return winds[(winds.indexOf(wind) + 1) % winds.length];
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    wall: [...state.wall],
    deadWall: [...state.deadWall],
    players: state.players.map((player) => ({
      ...player,
      hand: [...player.hand],
      discards: [...player.discards],
      exposedSets: player.exposedSets.map((set) => [...set])
    })),
    lastDiscard: state.lastDiscard ? { ...state.lastDiscard } : null
  };
}

function cryptoSafeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `game-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
