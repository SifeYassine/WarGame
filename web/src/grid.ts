import { DisplayDriver } from "./display-driver.js";
import {
  GameConfig,
  GameState,
} from "./game-objects.js";
import {
  Vector,
} from "./vector.js";

enum PointerMode {
  None,
  Drag,
}

export class Grid {
  gameState: GameState;
  displayDriver: DisplayDriver;
  config: {
    visibilityRange: number;
  };
  lastPoint: Vector = Vector.zero();
  curT = 0;
  isPointerDown = false;
  curMode: PointerMode = PointerMode.None;

  constructor(
    gameState: GameState,
    displayDriver: DisplayDriver,
    config: GameConfig,
  ) {
    this.gameState = gameState;
    this.displayDriver = displayDriver;
    this.config = {
      visibilityRange: config.visibilityRange,
    };
    this.recalculateVisibleHexes();
  }

  public handlePointerStart(p: Vector) {
    this.lastPoint = p;
    this.isPointerDown = true;

    this.curMode = PointerMode.Drag;
  }

  public handlePointerMove(p: Vector) {
    if (!this.isPointerDown) return;
    switch (this.curMode) {
      case PointerMode.None:
        break;
      case PointerMode.Drag:
        this.handleDrag(p);
        break;
    }
    this.lastPoint = p;
  }

  public handlePointerEnd(p: Vector) {
    this.isPointerDown = false;
    this.curMode = PointerMode.None;
  }

  public setT(t: number) {
    this.curT = t;
  }

  private handleDrag(p: Vector) {
    if (this.lastPoint === null) return;
    this.displayDriver.addCameraOffset(p.sub(this.lastPoint));
  }

  public recalculateVisibleHexes() {
    this.gameState.visibleHexes.clear();

    for (const tank of this.gameState.playerTanks) {
      if (!tank.visible) continue;
      for (const hex of this.gameState.hexes.values()) {
        if (tank.p.gridDistance(hex.p) <= this.config.visibilityRange) {
          this.gameState.visibleHexes.add(hex.p.toString());
        }
      }
    }
  }
}
