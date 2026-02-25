import { unitVectorToIdx, Vector } from "./vector.js";
import {
  SPRITES_64,
  SPRITES_96,
  SpritePreset,
  Sprite,
} from "./sprites.js";
import { GameState, getTankById, Tank } from "./game-objects.js";

type SpriteConfig = { scale: number; sprites: SpritePreset };

const SPRITES_IMAGE_SRC = "./assets/sprites.png";
const DEFAULT_PRESET_IDX = 1;

export class DisplayDriver {
  backgroundColor: string = "rgb(50, 50, 50)";
  ctx: CanvasRenderingContext2D;
  gameState: GameState | null;
  sprites: HTMLImageElement;

  cameraOffset: Vector = new Vector(0, 0);
  spriteConfigs: SpriteConfig[] = [
    { scale: 1, sprites: SPRITES_64 }, // 64
    { scale: 1, sprites: SPRITES_96 }, // 96
    { scale: 2, sprites: SPRITES_64 }, // 128
    { scale: 2, sprites: SPRITES_96 }, // 192
    { scale: 4, sprites: SPRITES_64 }, // 256
    { scale: 3, sprites: SPRITES_96 }, // 288
    { scale: 4, sprites: SPRITES_96 }, // 384
  ];
  presetIdx: number = DEFAULT_PRESET_IDX;
  curPreset = this.spriteConfigs[this.presetIdx];

  constructor(
    ctx: CanvasRenderingContext2D,
    gameState: GameState | null,
  ) {
    this.ctx = ctx;
    this.gameState = gameState;
    this.sprites = new Image();
    this.sprites.src = SPRITES_IMAGE_SRC;
  }

  public draw(freeze: boolean) {
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.drawHexes();
    this.drawTanks();
    this.drawSites();
  }

  public resize() {
    const rect = this.ctx.canvas.parentElement!.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio;

    const screen = new Vector(rect.width, rect.height);
    this.ctx.canvas.style.width = `${screen.x}px`;
    this.ctx.canvas.style.height = `${screen.y}px`;

    const canvasSize = screen.mul(pixelRatio);

    this.ctx.canvas.width = canvasSize.x;
    this.ctx.canvas.height = canvasSize.y;

  }

  public gridToScreenCoords(p: Vector): Vector {
    const hexSize = this.getHexSize();
    const y = (p.y * hexSize.y * 3) / 4;
    const x = p.x * hexSize.x + 0.5 * p.y * hexSize.x;
    return new Vector(x, y).add(this.cameraOffset);
  }

  private drawSprite(sprite: Sprite, p: Vector) {
    const screenCords = this.gridToScreenCoords(p).round();
    const scale = this.curPreset.scale;
    const start = screenCords
      .add(sprite.offset.mul(scale))
      .floor();
    const size = sprite.size.mul(scale);
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(
      this.sprites,
      sprite.start.x,
      sprite.start.y,
      sprite.size.x,
      sprite.size.y,
      start.x,
      start.y,
      size.x,
      size.y,
    );
  }

  private drawHexes() {
    if (this.gameState === null) return;

    this.ctx.save();

    for (const hex of this.gameState.hexes.values()) {
      const sprite = this.getHexSprite(
        hex.variant,
        this.gameState.visibleHexes.has(hex.p.toString()),
      );

      this.ctx.globalAlpha = hex.opacity;
      this.drawSprite(sprite, hex.p);
    }

    this.ctx.restore();
  }

  private drawSites() {
    if (this.gameState === null) return;
    for (const site of this.gameState.sites) {
      if (!this.gameState.hexes.has(site.p.toString())) {
        continue;
      }
      const sprite = this.getSiteSprite(
        site.variant,
        this.gameState.visibleHexes.has(site.p.toString()),
      );
      this.drawSprite(sprite, site.p);
    }
  }

  private drawTanks() {
    if (this.gameState === null) return;
    for (const tank of this.gameState.playerTanks) {
      if (!tank.visible) continue;
      const sprite = this.getTankSprites(
        true,
        tank.angleBody,
        tank.angleTurret,
      );
      this.drawSprite(sprite.body, tank.pF);
      this.drawSprite(sprite.turret, tank.pF);
    }
    for (const tank of this.gameState.enemyTanks) {
      if (!tank.visible) continue;
      const sprite = this.getTankSprites(
        false,
        tank.angleBody,
        tank.angleTurret,
      );
      this.drawSprite(sprite.body, tank.pF);
      this.drawSprite(sprite.turret, tank.pF);
    }
  }

  private getHexSize(): Vector {
    return this.curPreset.sprites.hexSize.mul(this.curPreset.scale);
  }

  private getHexSprite(variant: number, light: boolean): Sprite {
    if (light) {
      return this.curPreset.sprites.hexes.light[variant];
    }
    return this.curPreset.sprites.hexes.dark[variant];
  }

  private getSiteSprite(variant: number, light: boolean): Sprite {
    if (light) {
      return this.curPreset.sprites.sites.light[variant];
    }
    return this.curPreset.sprites.sites.dark[variant];
  }

  private getTankSprites(
    isPlayer: boolean,
    angleBody: number,
    angleTurret: number,
  ): { body: Sprite; turret: Sprite } {
    const len = this.curPreset.sprites.tanksBodies.length;
    const bodyIdx = Math.min(
      len - 1,
      Math.max(0, Math.round((angleBody / 360) * len)),
    );
    const turretIdx = Math.min(
      len - 1,
      Math.max(0, Math.round((angleTurret / 360) * len)),
    );
    let body = this.curPreset.sprites.tanksBodies[bodyIdx];
    let turret = this.curPreset.sprites.tanksTurrets[turretIdx];
    if (!isPlayer) {
      body = this.curPreset.sprites.enemyTanksBodies[bodyIdx];
      turret = this.curPreset.sprites.enemyTanksTurrets[turretIdx];
    }
    return { body: body, turret: turret };
  }
}
