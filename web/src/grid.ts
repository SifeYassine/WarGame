import { DisplayDriver } from "./display-driver.js";
import { GameEventType } from "./game-event.js";
import {
  GameConfig,
  GameState,
  getTankById,
  newTankFire,
  newTankMove,
  Tank,
  TankAction,
  TurnResult,
  TurnResultType,
} from "./game-objects.js";
import { Notifier } from "./notifier.js";
import {
  idxToUnitVector,
  includesVector,
  isNeighbor,
  Vector,
} from "./vector.js";

const T_PRESS_TO_FIRE = 700;

enum PointerMode {
  None,
  Drag,
  TankNavigation,
  TankFire,
  Animation,
}

export class Grid {
  gameState: GameState;
  displayDriver: DisplayDriver;
  notifier: Notifier;
  config: {
    driveRange: number;
    visibilityRange: number;
  };
  lastPoint: Vector = Vector.zero();
  curT = 0;
  pointerStartTime: number = 0;
  isPointerDown = false;
  curMode: PointerMode = PointerMode.None;

  curTank: Tank | null = null;

  turnResults: TurnResult[] = [];
  curTurnResultIdx: number = 0;
  animationResolver: Resolver;
  prevResult: TurnResult | null = null;
  curResult: TurnResult | null = null;

  constructor(
    gameState: GameState,
    displayDriver: DisplayDriver,
    config: GameConfig,
    notifier: Notifier,
  ) {
    this.gameState = gameState;
    this.displayDriver = displayDriver;
    this.config = {
      driveRange: config.driveRange,
      visibilityRange: config.visibilityRange,
    };
    this.recalculateVisibleHexes();
    this.animationResolver = new ResolverIdle(this);
    this.notifier = notifier;
  }

  public transition() {
    this.nextTurnResult();

    const nextAnimationResolver = this.getAnimationResolver();
    this.animationResolver = nextAnimationResolver;
    this.animationResolver.animate();
  }

  private getAnimationResolver(): Resolver {
    if (this.curResult === null) {
      return new ResolverIdle(this);
    }
    if (this.curResult.type === TurnResultType.EndTurn) {
      return new ResolverFinish(this);
    }

    return new ResolverRest(this);
  }

  public getActions(): TankAction[] {
    const actions: TankAction[] = [];
    for (const idx of this.gameState.turnOrder) {
      const tank = getTankById(this.gameState.playerTanks, idx);
      if (tank === null) continue;
      if (tank.shooting) {
        const shootingVec = idxToUnitVector(tank.shootingDir);
        if (shootingVec === null) continue;
        actions.push(newTankFire(idx, shootingVec));
      } else if (tank.path.length >= 1) {
        actions.push(newTankMove(idx, tank.path));
      }
    }
    return actions;
  }

  public handlePointerStart(p: Vector) {
    this.lastPoint = p;
    this.isPointerDown = true;
    this.pointerStartTime = this.curT;

    if (this.curMode === PointerMode.Animation) {
      return;
    }

    const tank = this.getCollidingTank(p);
    if (tank !== null) {
      this.notifier.notify({ type: GameEventType.TankManipulation });
      this.curMode = PointerMode.TankNavigation;
      tank.path = [];
      tank.shooting = false;
      tank.shootingDir = 0;
      this.curTank = tank;
      this.recalculateTraversable();
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
        if (
          this.curTank?.path.length === 0 &&
          this.curT - this.pointerStartTime > T_PRESS_TO_FIRE &&
          this.curTank?.p.eq(this.displayDriver.screenToGridCoords(p))
        ) {
          this.curMode = PointerMode.TankFire;
          this.curTank.shooting = true;
          this.curTank.shootingDir = 0;
          this.gameState.availableHexes.clear();
          this.gameState.conditionallyAvailableHexes.clear();
          this.handleTankFire(p);
        } else {
          this.handleTankNavigation(p);
        }
        break;
      case PointerMode.TankFire:
        this.handleTankFire(p);
        break;
      case PointerMode.Animation:
        this.handleDrag(p);
        break;
    }
    this.lastPoint = p;
  }

  public handlePointerEnd(p: Vector) {
    this.isPointerDown = false;
    if (this.curMode === PointerMode.Animation) return;
    if (
      this.curMode === PointerMode.TankNavigation ||
      this.curMode === PointerMode.TankFire
    ) {
      this.handleEndTankNavigationFire();
    }
    this.curMode = PointerMode.None;
    this.curTank = null;
    this.recalculateTraversable();
  }

  public tick() {
    this.animationResolver.animate();
    if (this.isPointerDown && this.curMode === PointerMode.TankNavigation) {
      this.handlePointerMove(this.lastPoint);
    }
  }

  public handleStartAnimation() {
    this.handlePointerEnd(Vector.zero());
    this.curMode = PointerMode.Animation;
  }

  public handleEndAnimation() {
    this.handlePointerEnd(Vector.zero());
    this.curMode = PointerMode.None;
    this.notifier.notify({ type: GameEventType.AnimationEnd });
  }

  public setT(t: number) {
    this.curT = t;
  }

  public nextTurnResult() {
    this.prevResult = this.curResult;
    if (this.curTurnResultIdx >= this.turnResults.length) {
      this.curResult = null;
      return;
    }
    this.curResult = this.turnResults[this.curTurnResultIdx];
    this.curTurnResultIdx++;
  }

  public peekTurnResult(): TurnResult | null {
    if (this.curTurnResultIdx >= this.turnResults.length) {
      return null;
    }
    return this.turnResults[this.curTurnResultIdx];
  }

  public pushResults(turnResults: TurnResult[]) {
    this.clearPathsAndAims();

    if (this.curTurnResultIdx >= this.turnResults.length) {
      this.turnResults = turnResults;
      this.curTurnResultIdx = 0;
    } else {
      this.turnResults.push(...turnResults);
    }
    this.turnResults.push({ type: TurnResultType.EndTurn });
  }

  private handleEndTankNavigationFire() {
    if (
      this.curTank !== null &&
      this.curMode === PointerMode.TankNavigation &&
      this.curTank.path.length === 0
    ) {
      this.removeOrder(this.curTank.id);
    }
  }

  private clearPathsAndAims() {
    for (const tank of this.gameState.playerTanks) {
      tank.path = [];
      tank.shooting = false;
      tank.shootingDir = 0;
    }
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

  private handleTankFire(p: Vector) {
    if (this.curTank === null) return;
    const v = p.sub(this.displayDriver.gridToScreenCoords(this.curTank.p));
    this.curTank.shootingDir = Math.floor((v.angle() + 30) / 60) % 6;
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

    this.recalculateTraversable();
  }

  private recalculateTraversable() {
    this.recalculateAvailableHexes(this.gameState.availableHexes, false);
    this.recalculateAvailableHexes(
      this.gameState.conditionallyAvailableHexes,
      true,
    );
  }

  private recalculateAvailableHexes(set: Set<string>, conditional: boolean) {
    set.clear();
    if (this.curTank === null) {
      return;
    }
    let start = this.curTank.p;
    let range = this.config.driveRange;
    if (this.curTank.path.length > 0) {
      start = this.curTank.path[this.curTank.path.length - 1];
      range -= this.curTank.path.length - 1;
    }
    if (range <= 0) {
      return;
    }

    const unavailable: Set<string> = new Set();
    if (!conditional) {
      for (const tank of this.gameState.playerTanks) {
        if (!tank.visible || tank.id === this.curTank.id) continue;
        unavailable.add(tank.p.toString());
      }
      for (const tank of this.gameState.enemyTanks) {
        if (!tank.visible) continue;
        unavailable.add(tank.p.toString());
      }
    }

    for (let i = 0; i < this.curTank.path.length - 1; i++) {
      if (unavailable.has(this.curTank.path[i].toString()) && !conditional) {
        set.clear();
        return;
      }
      unavailable.add(this.curTank.path[i].toString());
    }
    if (
      this.curTank.path.length > 0 &&
      unavailable.has(
        this.curTank.path[this.curTank.path.length - 1].toString(),
      ) &&
      !conditional
    ) {
      set.clear();
      return;
    }

    let frontier = [start];
    set.add(start.toString());

    for (let i = 0; i < range; i++) {
      let newFrontier = [];
      for (const p of frontier) {
        for (const n of p.neighbors()) {
          if (set.has(n.toString())) {
            continue;
          }
          const hex = this.gameState.hexes.get(n.toString());
          if (hex === undefined || !hex.traversable) {
            continue;
          }
          if (unavailable.has(n.toString())) {
            continue;
          }
          set.add(n.toString());
          newFrontier.push(n);
        }
      }
      frontier = newFrontier;
    }

    set.delete(start.toString());
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

interface Resolver {
  grid: Grid;
  animate(): void;
}

class ResolverFinish implements Resolver {
  grid: Grid;

  constructor(grid: Grid) {
    this.grid = grid;
  }

  animate(): void {
    this.grid.handleEndAnimation();
    this.grid.transition();
  }
}

class ResolverIdle implements Resolver {
  grid: Grid;

  constructor(grid: Grid) {
    this.grid = grid;
  }

  animate() {
    if (this.grid.peekTurnResult() === null) return;
    this.grid.handleStartAnimation();
    this.grid.transition();
  }
}

function areaUnderLine(y1: number, y2: number, t: number): number {
  if (t <= 0) return 0;
  const low = Math.min(y1, y2);
  const diff = Math.abs(y1 - y2);

  const rect = low * t;

  if (t >= 1) return low + diff / 2;

  if (y1 <= y2) {
    return rect + (t * t * diff) / 2;
  }
  return rect + ((1 - (1 - t) * (1 - t)) * diff) / 2;
}

function normalize360(angle: number) {
  while (angle < 0) {
    angle += 360;
  }
  while (angle >= 360) {
    angle -= 360;
  }
  return angle;
}

function normalize180(angle: number) {
  while (angle < -180) {
    angle += 360;
  }
  while (angle >= 180) {
    angle -= 360;
  }
  return angle;
}

class ResolverRest implements Resolver {
  grid: Grid;

  constructor(grid: Grid) {
    this.grid = grid;
  }

  animate() {
    this.grid.recalculateVisibleHexes();
    this.grid.transition();
  }
}
