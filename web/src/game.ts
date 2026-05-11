import { GameConfig, GameResult, GameState } from "./game-objects.js";
import { Vector } from "./vector.js";
import { DisplayDriver } from "./display-driver.js";
import { Grid } from "./grid.js";
import { UI, UIMode } from "./ui.js";
import { Notifier } from "./notifier.js";
import { GameEvent, GameEventType } from "./game-event.js";
import { WsDriver } from "./ws-driver.js";

const WS_URL = "ws";

function elementToScreenCoords(elementP: Vector): Vector {
  return elementP.mul(window.devicePixelRatio).round();
}

enum Layer {
  UI,
  Grid,
}

export class Game {
  notifier: Notifier;
  displayDriver: DisplayDriver;
  wsDriver: WsDriver;
  grid: Grid | null = null;
  ui: UI;
  isPointerDown = false;
  layer: Layer = Layer.UI;
  freeze: boolean = false;
  states: {
    mainMenu: StateGame;
    waitingForRoom: StateGame;
    waitingRoom: StateGame;
    inGame: StateGame;
  };
  state: StateGame;

  constructor(ctx: CanvasRenderingContext2D) {
    this.notifier = new Notifier(this);
    this.wsDriver = new WsDriver(WS_URL, this.notifier);
    const canvas = ctx.canvas;
    this.initEventListeners(canvas);

    const inputElement = this.createInputElement();
    ctx.canvas.parentNode?.insertBefore(inputElement, null);
    this.ui = new UI(this.notifier, inputElement);
    this.displayDriver = new DisplayDriver(ctx, null, this.ui);

    window.addEventListener("resize", () => {
      this.resize();
    });
    this.resize();

    this.states = {
      mainMenu: new GameStateMainMenu(this),
      waitingForRoom: new GameStateWaitForRoom(this),
      waitingRoom: new GameStateWaitingRoom(this),
      inGame: new GameStateInGame(this),
    };
    this.state = this.states.mainMenu;
  }

  public update(event: GameEvent) {
    this.state.update(event);
  }

  public setState(state: StateGame) {
    this.state = state;
    this.state.onEnter();
  }

  public run() {
    this.draw(0);
  }

  private initEventListeners(canvas: HTMLCanvasElement) {
    canvas.addEventListener("pointerdown", (e: PointerEvent) => {
      const screenP = elementToScreenCoords(new Vector(e.offsetX, e.offsetY));
      this.handlePointerStart(screenP);
    });
    canvas.addEventListener("pointerup", (e: PointerEvent) => {
      const screenP = elementToScreenCoords(new Vector(e.offsetX, e.offsetY));
      this.handlePointerEnd(screenP);
    });
    canvas.addEventListener("pointermove", (e: PointerEvent) => {
      const screenP = elementToScreenCoords(new Vector(e.offsetX, e.offsetY));
      this.handlePointerMove(screenP);
    });
  }

  private createInputElement(): HTMLInputElement {
    const e = document.createElement("input");
    e.setAttribute("id", "in-game-input");
    e.setAttribute("type", "text");
    e.setAttribute("placeholder", "code");
    return e;
  }

  public initGrid(config: GameConfig) {
    const gameState = new GameState(config);
    this.grid = new Grid(
      gameState,
      this.displayDriver,
      config,
    );
    this.displayDriver.gameState = gameState;
    this.displayDriver.reset();
  }

  public removeGrid() {
    this.grid = null;
    this.displayDriver.gameState = null;
  }

  private handlePointerStart(p: Vector) {
    this.isPointerDown = true;
    this.layer = this.ui.collides(p) ? Layer.UI : Layer.Grid;
    if (this.layer === Layer.UI) {
      this.ui.handlePointerStart(p);
    } else {
      this.grid?.handlePointerStart(p);
    }
  }

  private handlePointerEnd(p: Vector) {
    this.isPointerDown = false;
    if (this.layer === Layer.UI) {
      this.ui.handlePointerEnd(p);
    } else {
      this.grid?.handlePointerEnd(p);
    }
    this.layer = Layer.UI;
  }

  private handlePointerMove(p: Vector) {
    if (!this.isPointerDown) return;
    if (this.layer === Layer.UI) {
      this.ui.handlePointerMove(p);
    } else {
      this.grid?.handlePointerMove(p);
    }
  }

  private draw(curT: number) {
    this.displayDriver.draw(this.freeze);
    this.grid?.setT(curT);
    requestAnimationFrame((t: number) => {
      this.draw(t);
    });
  }

  private resize() {
    this.displayDriver.resize();
  }
}

interface StateGame {
  str: string;
  update(event: GameEvent): void;
  onEnter(): void;
}

class GameStateMainMenu implements StateGame {
  str = "main-menu";
  game: Game;
  constructor(game: Game) {
    this.game = game;
  }

  onEnter(): void {
  }

  update(event: GameEvent) {
    switch (event.type) {
      case GameEventType.WsOpen:
        this.game.ui.setOnlineGameAvailability(true);
        break;
      case GameEventType.WsClose:
        this.game.freeze = false;
        this.game.ui.setOnlineGameAvailability(false);
        this.game.ui.addModal("connection lost");
        break;
      case GameEventType.ButtonJoinRoom:
        const code = this.game.ui.getRoomCode();
        this.game.wsDriver.sendStartGame(code);
        this.game.freeze = true;
        this.game.setState(this.game.states.waitingForRoom);
        break;
    }
  }
}

class GameStateWaitForRoom implements StateGame {
  str = "wait-for-room";
  game: Game;
  constructor(game: Game) {
    this.game = game;
  }

  onEnter(): void {
  }

  update(event: GameEvent): void {
    switch (event.type) {
      case GameEventType.WsOpen:
        this.game.ui.setOnlineGameAvailability(true);
        break;
      case GameEventType.WsClose:
        this.game.freeze = false;
        this.game.ui.setOnlineGameAvailability(false);
        this.game.ui.addModal("connection lost");
        this.game.setState(this.game.states.mainMenu);
        break;
      case GameEventType.RoomJoined:
        this.game.freeze = false;
        this.game.ui.enableMode(UIMode.WaitingRoom);
        this.game.setState(this.game.states.waitingRoom);
        break;
      case GameEventType.RoomDisconnected:
        this.game.freeze = false;
        this.game.ui.addModal("cant join room");
        this.game.setState(this.game.states.mainMenu);
        break;
    }
  }
}
class GameStateWaitingRoom implements StateGame {
  str = "waiting-room";
  game: Game;
  constructor(game: Game) {
    this.game = game;
  }

  onEnter(): void {
  }

  update(event: GameEvent): void {
    switch (event.type) {
      case GameEventType.WsOpen:
        this.game.ui.setOnlineGameAvailability(true);
        break;
      case GameEventType.WsClose:
        this.game.ui.setOnlineGameAvailability(false);
        this.game.ui.addModal("connection lost");
        this.game.ui.enableMode(UIMode.Main);
        this.game.setState(this.game.states.mainMenu);
        break;
      case GameEventType.StartGame:
        this.game.initGrid(event.config);
        this.game.ui.enableMode(UIMode.InGame);
        this.game.setState(this.game.states.inGame);
        break;
      case GameEventType.RoomDisconnected:
        this.game.ui.addModal("room disconnected");
        this.game.ui.enableMode(UIMode.Main);
        this.game.setState(this.game.states.mainMenu);
        this.game.freeze;
        break;
      case GameEventType.ButtonQuitGame:
        this.game.wsDriver.sendQuitRoom();
        this.game.ui.enableMode(UIMode.Main);
        this.game.setState(this.game.states.mainMenu);
        break;
    }
  }
}
class GameStateInGame implements StateGame {
  game: Game;

  str = "in-game";
  gameFinished: boolean = false;

  constructor(game: Game) {
    this.game = game;
  }

  onEnter() {
    this.gameFinished = false;
  }

  update(event: GameEvent): void {
    switch (event.type) {
      case GameEventType.WsClose:
        this.game.ui.setOnlineGameAvailability(false);
        this.game.ui.addModal("server disconnected");
        this.game.removeGrid();
        this.game.ui.enableMode(UIMode.Main);
        this.game.setState(this.game.states.mainMenu);
        break;
      case GameEventType.RoomDisconnected:
        this.game.ui.addModal("room disconnected");
        this.game.removeGrid();
        this.game.ui.enableMode(UIMode.Main);
        this.game.setState(this.game.states.mainMenu);
        break;
      case GameEventType.ButtonQuitGame:
        if (!this.gameFinished) {
          this.game.wsDriver.sendQuitRoom();
        }
        this.game.removeGrid();
        this.game.ui.enableMode(UIMode.Main);
        this.game.setState(this.game.states.mainMenu);
        break;
    }
  }
}
