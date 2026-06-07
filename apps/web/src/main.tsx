import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { analyzeHand, createGame, discardTile, drawTile, sortHand, Tile, Wind } from "@jade-court/mahjong-core";
import "./styles.css";

const tileColors: Record<string, string> = {
  bamboo: "#0d8c6f",
  dots: "#c8942e",
  characters: "#bd2f2b",
  honor: "#265d94",
  flower: "#a32967"
};

function App() {
  const [mode, setMode] = useState<"local" | "online">("local");
  const [game, setGame] = useState(() => createGame(["You", "South", "West", "North"]));
  const east = game.players.find((player) => player.seat === "east") ?? game.players[0];
  const analysis = useMemo(() => analyzeHand(east.hand), [east.hand]);

  function reset() {
    setGame(createGame(["You", "South", "West", "North"]));
  }

  function draw() {
    setGame((current) => drawTile(current, current.turn));
  }

  function discard(tile: Tile) {
    setGame((current) => discardTile(current, "east", tile.id));
  }

  function sort() {
    setGame((current) => ({
      ...current,
      players: current.players.map((player) =>
        player.seat === "east" ? { ...player, hand: sortHand(player.hand) } : player
      )
    }));
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero__shade" />
        <div className="hero__content">
          <p className="eyebrow">Live four-player mahjong</p>
          <h1>Jade Court Mahjong</h1>
          <p className="subtitle">A realtime table architecture for four players, with a local practice mode while multiplayer comes online.</p>
          <div className="hero__actions">
            <button className="primary-action" onClick={reset} type="button">Deal hand</button>
            <button className="ghost-action" onClick={() => document.querySelector("#table")?.scrollIntoView({ behavior: "smooth" })} type="button">Table</button>
          </div>
        </div>
      </section>

      <section className="game-section" id="table">
        <header className="game-header">
          <div>
            <p className="eyebrow">Practice table</p>
            <h2>Four Winds Table</h2>
          </div>
          <div className="stats">
            <Stat label="Wall" value={game.wall.length} />
            <Stat label="Discards" value={game.players.reduce((total, player) => total + player.discards.length, 0)} />
            <Stat label="Turn" value={game.turn} />
          </div>
        </header>

        <div className="mode-row" role="tablist" aria-label="Game mode">
          <button className={mode === "local" ? "is-active" : ""} onClick={() => setMode("local")} type="button">Local practice</button>
          <button className={mode === "online" ? "is-active" : ""} onClick={() => setMode("online")} type="button">Online room</button>
        </div>

        {mode === "online" ? (
          <section className="online-panel">
            <p className="eyebrow">Next milestone</p>
            <h3>Realtime rooms are scaffolded on the server.</h3>
            <p>Run the Colyseus server, then connect this panel to room create/join, seat assignment, and synchronized snapshots.</p>
          </section>
        ) : (
          <div className="table-wrap">
            <aside className="side-panel">
              <div className="control-row">
                <button className="icon-button" onClick={reset} type="button" aria-label="Deal hand">⟲</button>
                <button className="icon-button" onClick={draw} type="button" aria-label="Draw tile" disabled={game.phase !== "draw"}>+</button>
                <button className="icon-button" onClick={sort} type="button" aria-label="Sort hand">⇅</button>
                <button className="icon-button" type="button" aria-label="Analyze hand">✦</button>
              </div>
              <div className="message">
                {game.phase === "discard" ? "East has 14 tiles. Choose a discard." : "Draw from the wall to continue East's next turn."}
              </div>
              <div className="legend">
                <span><i className="dot dot--jade" />Chows: {analysis.chows}</span>
                <span><i className="dot dot--red" />Pungs: {analysis.pungs}</span>
                <span><i className="dot dot--gold" />Pairs: {analysis.pairs}</span>
                <span><i className="dot dot--blue" />Mahjong shape: {analysis.looksComplete ? "yes" : "not yet"}</span>
              </div>
            </aside>

            <div className="board-frame">
              <div className="mahjong-table">
                <Opponent seat="north" count={13} variant="top" />
                <Opponent seat="west" count={13} variant="left" />
                <Opponent seat="south" count={13} variant="right" />
                <div className="wall-box"><span>Live wall</span><strong>{game.wall.length}</strong></div>
                <div className="river">
                  {east.discards.slice(-24).map((tile) => <TileView key={tile.id} tile={tile} small />)}
                </div>
                <div className="player-area">
                  <div className="hand-label"><span>East hand</span><strong>{east.hand.length} tiles</strong></div>
                  <div className="hand">
                    {east.hand.map((tile, index) => (
                      <button className={`tile ${index === east.hand.length - 1 ? "is-drawn" : ""}`} key={tile.id} onClick={() => discard(tile)} type="button">
                        <TileFace tile={tile} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="trainer">
                <div>
                  <p className="eyebrow">Hand shape</p>
                  <h3>{analysis.looksComplete ? "Mahjong shape spotted" : "Build toward mahjong"}</h3>
                  <p>A standard hand wins with four sets and one pair. The server package will enforce the official turn and call rules.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>;
}

function Opponent({ seat, count, variant }: { seat: Wind; count: number; variant: "top" | "left" | "right" }) {
  return (
    <div className={`opponent opponent--${variant}`}>
      <span>{seat}</span>
      <div className={variant === "top" ? "concealed-row" : "concealed-stack"}>
        {Array.from({ length: variant === "top" ? count : 8 }, (_, index) => <i className="tile-back" key={index} />)}
      </div>
    </div>
  );
}

function TileView({ tile, small = false }: { tile: Tile; small?: boolean }) {
  return <div className={`tile ${small ? "tile--small" : ""}`}><TileFace tile={tile} /></div>;
}

function TileFace({ tile }: { tile: Tile }) {
  const colorKey = tile.kind === "suited" ? tile.suit : tile.kind;
  return (
    <>
      <span className="tile__symbol" style={{ color: tileColors[colorKey] }}>{tile.symbol}</span>
      <span className="tile__name">{tile.label}</span>
    </>
  );
}

createRoot(document.querySelector("#root")!).render(<App />);
