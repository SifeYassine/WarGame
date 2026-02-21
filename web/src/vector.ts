export class Vector {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  static zero(): Vector {
    return new Vector(0, 0);
  }

  toString(): string {
    return `${this.x}_${this.y}`;
  }

  mul(multiplier: number): Vector {
    return new Vector(this.x * multiplier, this.y * multiplier);
  }

  add(other: Vector): Vector {
    return new Vector(this.x + other.x, this.y + other.y);
  }

  sub(other: Vector): Vector {
    return new Vector(this.x - other.x, this.y - other.y);
  }

  round(): Vector {
    return new Vector(Math.round(this.x), Math.round(this.y));
  }

  floor(): Vector {
    return new Vector(Math.floor(this.x), Math.floor(this.y));
  }

  eq(other: Vector): boolean {
    return this.x === other.x && this.y === other.y;
  }

  copy(): Vector {
    return new Vector(this.x, this.y);
  }

  gridDistance(other: Vector): number {
    const v = this.sub(other);
    const x = Math.abs(v.x);
    const y = Math.abs(v.y);
    const xy = Math.abs(v.x + v.y);
    return Math.max(x, y, xy);
  }

  neighbors(): Vector[] {
    const neighbors = [];
    for (const nv of IDX_TO_UNIT_VECTOR.values()) {
      neighbors.push(this.add(nv));
    }
    return neighbors;
  }
}

const IDX_TO_UNIT_VECTOR: Map<number, Vector> = new Map([
  [0, new Vector(1, 0)],
  [1, new Vector(0, 1)],
  [2, new Vector(-1, 1)],
  [3, new Vector(-1, 0)],
  [4, new Vector(0, -1)],
  [5, new Vector(1, -1)],
]);

export function unitVectorToIdx(v: Vector): number {
  for (const [idx, uv] of IDX_TO_UNIT_VECTOR.entries()) {
    if (v.eq(uv)) return idx;
  }
  return 0;
}

export function idxToUnitVector(idx: number): Vector | null {
  const v = IDX_TO_UNIT_VECTOR.get(idx);
  if (v === undefined) return null;
  return v;
}
