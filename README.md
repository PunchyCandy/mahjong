# Jade Court Mahjong

A multiplayer-first mahjong website scaffold.

## Architecture

- `apps/web`: React + Vite frontend.
- `apps/server`: Colyseus realtime game server.
- `packages/mahjong-core`: shared TypeScript rules/state package.
- `prisma`: Postgres schema for users, games, seats, and event history.

The current web app includes local practice mode. The server package is ready for realtime room join/start/draw/discard messages.

## Run Locally

Install dependencies:

```bash
npm install
```

Run the web app:

```bash
npm run dev
```

Run the realtime server in another terminal:

```bash
npm run dev:server
```

Useful URLs:

- Web: `http://127.0.0.1:5173`
- Server health: `http://127.0.0.1:2567/health`

The old root `index.html` prototype is still present for reference while the app moves into `apps/web`.
