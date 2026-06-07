const wallCountEl = document.querySelector("#wallCount");
const wallCenterEl = document.querySelector("#wallCenter");
const discardCountEl = document.querySelector("#discardCount");
const turnWindEl = document.querySelector("#turnWind");
const handCountEl = document.querySelector("#handCount");
const messageEl = document.querySelector("#message");
const playerHandEl = document.querySelector("#playerHand");
const riverEl = document.querySelector("#river");
const examplesEl = document.querySelector("#examples");
const shapeTitleEl = document.querySelector("#shapeTitle");
const shapeTextEl = document.querySelector("#shapeText");

const winds = ["East", "South", "West", "North"];
const suits = [
  { id: "bam", name: "Bam", symbols: ["一", "二", "三", "四", "五", "六", "七", "八", "九"], color: "#0d8c6f" },
  { id: "dot", name: "Dot", symbols: ["1", "2", "3", "4", "5", "6", "7", "8", "9"], color: "#c8942e" },
  { id: "char", name: "Char", symbols: ["萬", "萬", "萬", "萬", "萬", "萬", "萬", "萬", "萬"], color: "#bd2f2b" },
];
const honors = [
  { id: "east", name: "East", symbol: "東", color: "#265d94" },
  { id: "south", name: "South", symbol: "南", color: "#265d94" },
  { id: "west", name: "West", symbol: "西", color: "#265d94" },
  { id: "north", name: "North", symbol: "北", color: "#265d94" },
  { id: "red", name: "Red", symbol: "中", color: "#bd2f2b" },
  { id: "green", name: "Green", symbol: "發", color: "#147a62" },
  { id: "white", name: "White", symbol: "白", color: "#7a6857" },
];
const flowers = [
  { id: "plum", name: "Plum", symbol: "梅", color: "#a32967" },
  { id: "orchid", name: "Orchid", symbol: "蘭", color: "#a32967" },
  { id: "chrysanthemum", name: "Chrys", symbol: "菊", color: "#a32967" },
  { id: "bamboo-flower", name: "Flower", symbol: "竹", color: "#a32967" },
  { id: "spring", name: "Spring", symbol: "春", color: "#6b7431" },
  { id: "summer", name: "Summer", symbol: "夏", color: "#6b7431" },
  { id: "autumn", name: "Autumn", symbol: "秋", color: "#6b7431" },
  { id: "winter", name: "Winter", symbol: "冬", color: "#6b7431" },
];

let wall = [];
let hands = {};
let playerHand = [];
let river = [];
let turnIndex = 0;
let drawnTileId = null;

function makeTile(base, copy) {
  return {
    ...base,
    key: base.id,
    uid: `${base.id}-${copy}-${Math.random().toString(16).slice(2)}`,
  };
}

function buildWall() {
  const tiles = [];
  suits.forEach((suit) => {
    suit.symbols.forEach((symbol, index) => {
      const rank = index + 1;
      for (let copy = 0; copy < 4; copy += 1) {
        tiles.push(makeTile({
          id: `${suit.id}-${rank}`,
          suit: suit.id,
          rank,
          name: `${rank} ${suit.name}`,
          symbol: suit.id === "char" ? `${rank}` : symbol,
          color: suit.color,
        }, copy));
      }
    });
  });
  honors.forEach((tile) => {
    for (let copy = 0; copy < 4; copy += 1) {
      tiles.push(makeTile(tile, copy));
    }
  });
  flowers.forEach((tile, copy) => tiles.push(makeTile({ ...tile, flower: true }, copy)));
  return shuffle(tiles);
}

function shuffle(list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function dealHand() {
  wall = buildWall();
  hands = { South: [], West: [], North: [] };
  playerHand = [];
  river = [];
  turnIndex = 0;
  drawnTileId = null;

  for (let round = 0; round < 13; round += 1) {
    playerHand.push(wall.pop());
    winds.slice(1).forEach((wind) => hands[wind].push(wall.pop()));
  }
  playerHand.push(wall.pop());
  drawnTileId = playerHand[playerHand.length - 1].uid;
  sortPlayerHand(false);
  setMessage("East starts with 14 tiles. Discard one tile to finish the turn.");
  updateShape("Build toward mahjong", "A standard hand wins with four sets and one pair.");
  renderExamples();
  render();
}

function drawTile() {
  if (playerHand.length % 3 !== 1) {
    setMessage("Discard first. A normal turn is draw, then discard.");
    return;
  }
  if (!wall.length) {
    setMessage("The wall is empty. This hand ends in a draw.");
    return;
  }
  const tile = wall.pop();
  playerHand.push(tile);
  drawnTileId = tile.uid;
  setMessage(`Drew ${tile.name}. Choose a discard.`);
  render();
}

function discardTile(uid) {
  const index = playerHand.findIndex((tile) => tile.uid === uid);
  if (index === -1) return;
  const [tile] = playerHand.splice(index, 1);
  river.push(tile);
  drawnTileId = null;
  turnIndex = (turnIndex + 1) % winds.length;
  setMessage(`Discarded ${tile.name}. ${winds[turnIndex]} takes the next turn.`);
  analyzeHand(false);
  render();
}

function sortPlayerHand(shouldRender = true) {
  const suitOrder = { bam: 1, dot: 2, char: 3 };
  playerHand.sort((a, b) => {
    const aOrder = suitOrder[a.suit] || (a.flower ? 5 : 4);
    const bOrder = suitOrder[b.suit] || (b.flower ? 5 : 4);
    return aOrder - bOrder || (a.rank || 0) - (b.rank || 0) || a.name.localeCompare(b.name);
  });
  if (shouldRender) render();
}

function countKeys() {
  return playerHand.reduce((counts, tile) => {
    counts[tile.key] = (counts[tile.key] || 0) + 1;
    return counts;
  }, {});
}

function findChow() {
  for (const suit of suits) {
    for (let rank = 1; rank <= 7; rank += 1) {
      const keys = [`${suit.id}-${rank}`, `${suit.id}-${rank + 1}`, `${suit.id}-${rank + 2}`];
      if (keys.every((key) => playerHand.some((tile) => tile.key === key))) {
        return keys.map((key) => playerHand.find((tile) => tile.key === key));
      }
    }
  }
  return [];
}

function analyzeHand(showMessage = true) {
  const counts = countKeys();
  const pairs = Object.values(counts).filter((count) => count >= 2).length;
  const pungs = Object.values(counts).filter((count) => count >= 3).length;
  const kongs = Object.values(counts).filter((count) => count === 4).length;
  const chow = findChow();

  if (showMessage) {
    setMessage(`This hand shows ${pairs} pair${pairs === 1 ? "" : "s"}, ${pungs} pung${pungs === 1 ? "" : "s"}, and ${chow.length ? "at least one chow" : "no chow yet"}.`);
  }

  const setCount = pungs + (chow.length ? 1 : 0);
  if (setCount >= 4 && pairs >= 1) {
    updateShape("Mahjong shape spotted", "This hand has enough visible groups to resemble four sets plus a pair.");
  } else if (pungs || chow.length || pairs) {
    updateShape("Useful shapes found", "Keep related suited tiles for chows and duplicate honors for pungs or a pair.");
  } else {
    updateShape("Still scattered", "Draw and discard toward sequences in one suit or duplicates in honors.");
  }
  renderExamples({ counts, chow, kongs });
}

function updateShape(title, text) {
  shapeTitleEl.textContent = title;
  shapeTextEl.textContent = text;
}

function renderTile(tile, size = "") {
  const button = document.createElement("button");
  button.className = `tile ${size}`.trim();
  button.type = "button";
  button.style.setProperty("--tile-color", tile.color);
  button.setAttribute("aria-label", tile.name);
  button.innerHTML = `<span class="tile__symbol">${tile.symbol}</span><span class="tile__name">${tile.name}</span>`;
  return button;
}

function renderExamples(state = { counts: countKeys(), chow: findChow(), kongs: 0 }) {
  const examples = [
    { label: "Pair", tiles: sampleByCount(state.counts, 2) },
    { label: "Chow", tiles: state.chow },
    { label: "Pung", tiles: sampleByCount(state.counts, 3) },
    { label: "Kong", tiles: sampleByCount(state.counts, 4) },
    { label: "Win", tiles: sampleWinningShape() },
  ];
  examplesEl.innerHTML = "";
  examples.forEach((example) => {
    const card = document.createElement("div");
    card.className = "example";
    const title = document.createElement("strong");
    title.textContent = example.label;
    const row = document.createElement("div");
    row.className = "mini-row";
    example.tiles.forEach((tile) => row.append(renderTile(tile, "tile--small")));
    card.append(title, row);
    examplesEl.append(card);
  });
}

function sampleByCount(counts, minimum) {
  const key = Object.keys(counts).find((item) => counts[item] >= minimum);
  const tile = playerHand.find((item) => item.key === key) || playerHand[0];
  return tile ? Array.from({ length: minimum }, () => tile) : [];
}

function sampleWinningShape() {
  return [
    { symbol: "二", name: "Chow", color: "#0d8c6f" },
    { symbol: "三", name: "Chow", color: "#0d8c6f" },
    { symbol: "四", name: "Chow", color: "#0d8c6f" },
    { symbol: "中", name: "Pair", color: "#bd2f2b" },
    { symbol: "中", name: "Pair", color: "#bd2f2b" },
  ];
}

function renderBacks(elementId, count, vertical = false) {
  const element = document.querySelector(elementId);
  element.innerHTML = "";
  const visible = vertical ? 8 : 13;
  for (let index = 0; index < Math.min(count, visible); index += 1) {
    const tile = document.createElement("i");
    tile.className = "tile-back";
    element.append(tile);
  }
}

function render() {
  wallCountEl.textContent = wall.length;
  wallCenterEl.textContent = wall.length;
  discardCountEl.textContent = river.length;
  turnWindEl.textContent = winds[turnIndex];
  handCountEl.textContent = `${playerHand.length} tiles`;
  document.querySelector("#drawTile").disabled = playerHand.length % 3 !== 1 || !wall.length;

  renderBacks("#southHand", hands.South?.length || 13, true);
  renderBacks("#westHand", hands.West?.length || 13, true);
  renderBacks("#northHand", hands.North?.length || 13);

  playerHandEl.innerHTML = "";
  playerHand.forEach((tile) => {
    const button = renderTile(tile);
    if (tile.uid === drawnTileId) button.classList.add("is-drawn");
    button.addEventListener("click", () => discardTile(tile.uid));
    playerHandEl.append(button);
  });

  riverEl.innerHTML = "";
  river.slice(-24).forEach((tile) => riverEl.append(renderTile(tile, "tile--small")));
}

function setMessage(text) {
  messageEl.textContent = text;
}

document.querySelector("#dealHand").addEventListener("click", dealHand);
document.querySelector("#newGameHero").addEventListener("click", dealHand);
document.querySelector("#drawTile").addEventListener("click", drawTile);
document.querySelector("#sortHand").addEventListener("click", () => sortPlayerHand(true));
document.querySelector("#analyzeHand").addEventListener("click", () => analyzeHand(true));
document.querySelector("#scrollToBoard").addEventListener("click", () => {
  document.querySelector("#game").scrollIntoView({ behavior: "smooth" });
});

dealHand();
