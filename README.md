# War Game

A two-player, turn-based **tank strategy game** played on a hexagonal map in the browser. Players join the same room with a shared code, then plan their tanks' moves and shots each turn while hidden by fog of war. To keep the action close, the battlefield **shrinks** as the game goes on.

The server is written in **C# / ASP.NET Core 9** and talks to the browser over **WebSockets**. The client is written in **TypeScript** and draws the game on an HTML canvas with sprites and sound.

## Gameplay

- **2 players, 2 tanks each**, on a hex grid with buildings (*sites*) that block movement
- Each turn, give every tank one order:
  - **Move** along a path of up to **5** hexes, or
  - **Fire** in one of the six hex directions, up to **3** hexes away
- **Fog of war**: enemy tanks are only visible within **2** hexes of one of yours
- Click **send turn** to submit your orders. Once both players have submitted, the server resolves the turn and both clients replay the results as animations (movement, shots, explosions, wrecks)
- **Shrinking map**: from turn 2 the arena shrinks every 3 turns, with a one-turn warning. Tanks caught outside are destroyed
- The game ends when one side, or both, has no tanks left: **win**, **lose**, or **draw**
- Leaving or closing the tab mid-game counts as quitting

## Features

- Room-based matchmaking: type any code, and the first two players with the same code are paired
- Authoritative server: all rules are resolved server-side and each player only receives what they're allowed to see
- Responsive canvas UI with zoom (**+ / -**), **mute / unmute**, **join room**, **quit room**, and **quit game**
- Sprite sheet rendering and sound effects

## Tech Stack

| Layer     | Technology |
| --------- | ---------- |
| Server    | C#, .NET 9, ASP.NET Core (minimal hosting), `System.Net.WebSockets`, `System.Text.Json` |
| Client    | TypeScript (compiled to ES modules), HTML5 Canvas, Web Audio |
| Protocol  | JSON messages over a single WebSocket (`/ws`) |

## Project Structure

```
war-game/
├── Program.cs                     # DI setup, static files, WebSocket endpoint
├── Game/
│   ├── GameRoom.cs                # One match: players, turn collection, lifecycle
│   ├── GameState.cs               # The rules: moves, fire, visibility, shrinking, outcome
│   └── PlayerConnection.cs        # WebSocket wrapper (JSON ↔ DTOs)
├── Services/
│   ├── GameWebSocketHandler.cs    # Per-connection message loop
│   ├── RoomManager.cs             # Creates and tracks rooms by code
│   └── BasicGameConfigFactory.cs  # The map, starting tanks, and rule values
├── Models/                        # Vector (axial hex coords), Hex, Tank, GameConfig, enums
├── Dtos/                          # Client/server message contracts
├── web/src/                       # TypeScript client
│   ├── app.ts  game.ts  grid.ts  game-objects.ts
│   ├── display-driver.ts  sprites.ts  ui.ts
│   ├── audio-driver.ts  ws-driver.ts  notifier.ts
└── wwwroot/                       # index.html, styles.css, assets (compiled JS goes here)
```

## Getting Started

### Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) (only to compile the TypeScript client)

### 1. Build the client

The compiled JavaScript isn't committed (`wwwroot/*.js` is git-ignored), so compile it first:

```bash
git clone https://github.com/SifeYassine/war-game.git
cd war-game
npx -p typescript tsc
```

This compiles `web/src/*.ts` into `wwwroot/`. Add `--watch` while developing.

### 2. Run the server

```bash
dotnet run
```

The game is served at **<http://localhost:8000>**, with the WebSocket at `ws://localhost:8000/ws`.

### 3. Play

1. Open <http://localhost:8000> in two browser windows (or on two machines that can reach the server).
2. Enter the **same room code** in both and click **join room**.
3. When the second player joins, the match starts.

## WebSocket Protocol

**Client → Server**

| Type | Name       | Payload |
| ---- | ---------- | ------- |
| 1    | `JoinRoom` | `roomCode` |
| 2    | `SendTurn` | `actions[]`: `{ type: 1 (Move), id, path[] }` or `{ type: 2 (Fire), id, dir }` |
| 3    | `QuitRoom` | none |

**Server → Client**

| Type | Name               | Payload |
| ---- | ------------------ | ------- |
| 1    | `StartGame`        | Player-specific config: own/enemy tanks, hexes, sites, ranges |
| 2    | `TurnResults`      | Events: `Move2`, `Move3`, `Fire`, `Explosion`, `Destroyed`, `Visible`, `Shrink` |
| 3    | `RoomJoined`       | none |
| 4    | `RoomDisconnected` | none |
| 5    | `GameFinished`     | `result`: Win / Draw / Lose |

## Customizing the Map

Edit `Services/BasicGameConfigFactory.cs` to change the hex layout, buildings, starting positions, `DriveRange`, `VisibilityRange`, `FireRange`, `ShrinkAfter`, and `ShrinkInterval`.

## Author

**Sifeddine Yassine** · [@SifeYassine](https://github.com/SifeYassine)
