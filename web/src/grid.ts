import { DisplayDriver } from "./display-driver.js";
import {
  GameConfig,
  GameState,
  Tank,
} from "./game-objects.js";
import {
  includesVector,
  isNeighbor,
  Vector,
} from "./vector.js";

enum PointerMode {
  None,
  Drag,
  TankNavigation,
}

export class Grid {
  gameState: GameState;
  displayDriver: DisplayDriver;
  config: {
    driveRange: number;
    visibilityRange: number;
  };
  lastPoint: Vector = Vector.zero();
  curT = 0;
  isPointerDown = false;
  curMode: PointerMode = PointerMode.None;

  curTank: Tank | null = null;

  constructor(
    gameState: GameState,
    displayDriver: DisplayDriver,
    config: GameConfig,
  ) {
    this.gameState = gameState;
    this.displayDriver = displayDriver;
    this.config = {
      driveRange: config.driveRange,
      visibilityRange: config.visibilityRange,
    };
    this.recalculateVisibleHexes();
  }

  public handlePointerStart(p: Vector) {
    this.lastPoint = p;
    this.isPointerDown = true;

    const tank = this.getCollidingTank(p);
    if (tank !== null) {
      this.curMode = PointerMode.TankNavigation;
      tank.path = [];
      tank.shooting = false;
      tank.shootingDir = 0;
      this.curTank = tank;
      this.saveOrder(tank.id);
      return;
    }

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
      case PointerMode.TankNavigation:
          this.handleTankNavigation(p);
        break;
    }
    this.lastPoint = p;
  }

  public handlePointerEnd(p: Vector) {
    this.isPointerDown = false;
    this.curMode = PointerMode.None;
    this.curTank = null;
  }

  public tick() {
    if (this.isPointerDown && this.curMode === PointerMode.TankNavigation) {
      this.handlePointerMove(this.lastPoint);
    }
  }

  public setT(t: number) {
    this.curT = t;
  }

  private saveOrder(id: number) {
    this.removeOrder(id);
    this.gameState.turnOrder.push(id);
  }

  private removeOrder(id: number) {
    const idx = this.gameState.turnOrder.indexOf(id);
    if (idx !== -1) {
      this.gameState.turnOrder.splice(idx, 1);
    }
  }

  private handleDrag(p: Vector) {
    if (this.lastPoint === null) return;
    this.displayDriver.addCameraOffset(p.sub(this.lastPoint));
  }

  private handleTankNavigation(p: Vector) {
    if (this.curTank === null) return;
    const gridP = this.displayDriver.screenToGridCoords(p);
    if (this.curTank.path.length > this.config.driveRange) return;
    if (gridP.eq(this.curTank.p)) return;
    const lastOnPath =
      this.curTank.path.length > 0
        ? this.curTank.path[this.curTank.path.length - 1]
        : this.curTank.p;
    if (!isNeighbor(lastOnPath, gridP)) return;
    if (includesVector(this.curTank.path, gridP)) return;
    if (!this.gameState.hexes.has(gridP.toString())) return;
    if (!this.gameState.hexes.get(gridP.toString())?.traversable) return;

    if (this.curTank.path.length === 0) {
      this.curTank.path.push(this.curTank.p);
    }
    this.curTank.path.push(gridP);
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

  private getCollidingTank(p: Vector): Tank | null {
    const gridP = this.displayDriver.screenToGridCoords(p);
    for (const tank of this.gameState.playerTanks) {
      if (tank.visible && tank.p.eq(gridP)) {
        return tank;
      }
    }
    return null;
  }
}
