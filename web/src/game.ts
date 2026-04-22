import { Vector } from "./vector.js";
import { DisplayDriver } from "./display-driver.js";
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
  ui: UI;
  isPointerDown = false;
  layer: Layer = Layer.UI;
  freeze: boolean = false;
  states: {
    mainMenu: StateGame;
    waitingForRoom: StateGame;
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

  private handlePointerStart(p: Vector) {
    this.isPointerDown = true;
    this.layer = this.ui.collides(p) ? Layer.UI : Layer.Grid;
    if (this.layer === Layer.UI) {
      this.ui.handlePointerStart(p);
    }
  }

  private handlePointerEnd(p: Vector) {
    this.isPointerDown = false;
    if (this.layer === Layer.UI) {
      this.ui.handlePointerEnd(p);
    }
    this.layer = Layer.UI;
  }

  private handlePointerMove(p: Vector) {
    if (!this.isPointerDown) return;
    if (this.layer === Layer.UI) {
      this.ui.handlePointerMove(p);
    }
  }

  private draw(curT: number) {
    this.displayDriver.draw(this.freeze);
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
        break;
      case GameEventType.RoomDisconnected:
        this.game.freeze = false;
        this.game.ui.addModal("cant join room");
        this.game.setState(this.game.states.mainMenu);
        break;
    }
  }
}
