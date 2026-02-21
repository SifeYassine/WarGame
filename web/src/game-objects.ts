import { Vector } from "./vector.js";

export function getTankById(tanks: Tank[], id: number): Tank | null {
  for (const tank of tanks) {
    if (tank.id === id) {
      return tank;
    }
  }
  return null;
}

export type GameConfig = {
  hexes: { p: Vector; variant: number }[];
  playerTanks: { id: number; p: Vector }[];
  enemyTanks: { id: number; p: Vector }[];
  sites: { p: Vector; variant: number }[];
  driveRange: number;
  visibilityRange: number;
  fireRange: number;
  center: Vector;
};

export type Hex = {
  p: Vector;
  variant: number;
  traversable: boolean;
  opacity: number;
};

export type Site = {
  p: Vector;
  variant: number;
};

export type Tank = {
  id: number;
  p: Vector;
  pF: Vector;
  angleBody: number;
  angleTurret: number;
  path: Vector[];
  shooting: boolean;
  shootingDir: number;
  visible: boolean;
};

export class GameState {
  hexes: Map<string, Hex>;
  sites: Site[];
  playerTanks: Tank[];
  enemyTanks: Tank[];
  visibleHexes: Set<string> = new Set();
  availableHexes: Set<string> = new Set();
  conditionallyAvailableHexes: Set<string> = new Set();
  turnOrder: number[] = [];

  constructor(config: GameConfig) {
    this.hexes = new Map(
      config.hexes.map((h) => [
        h.p.toString(),
        { p: h.p, variant: h.variant, traversable: true, opacity: 1 },
      ]),
    );
    this.sites = config.sites.map((s) => ({ p: s.p, variant: s.variant }));

    for (const site of this.sites) {
      const hex = this.hexes.get(site.p.toString());
      if (hex !== undefined) {
        hex.traversable = false;
      }
    }

    this.playerTanks = config.playerTanks.map((t) => ({
      id: t.id,
      p: t.p,
      pF: t.p,
      angleBody: 120,
      angleTurret: 134,
      path: [],
      shooting: false,
      shootingDir: 0,
      visible: true,
    }));

    this.enemyTanks = config.enemyTanks.map((t) => ({
      id: t.id,
      p: t.p,
      pF: t.p,
      angleBody: 304,
      angleTurret: 288,
      path: [],
      shooting: false,
      shootingDir: 0,
      visible: false,
    }));

    for (const et of this.enemyTanks.values()) {
      for (const pt of this.playerTanks.values()) {
        if (pt.p.gridDistance(et.p) <= config.visibilityRange) {
          et.visible = true;
          break;
        }
      }
    }
  }
}
