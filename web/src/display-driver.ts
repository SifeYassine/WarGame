import { unitVectorToIdx, Vector } from "./vector.js";
import {
  SPRITES_64,
  SPRITES_96,
  SpritePreset,
  Sprite,
} from "./sprites.js";
import { GameState, getTankById, Tank } from "./game-objects.js";
import { ButtonState, UI } from "./ui.js";

type SpriteConfig = { scale: number; sprites: SpritePreset };

const SPRITES_IMAGE_SRC = "./assets/sprites.png";
const DEFAULT_PRESET_IDX = 1;

export class DisplayDriver {
  backgroundColor: string = "rgb(50, 50, 50)";
  ctx: CanvasRenderingContext2D;
  gameState: GameState | null;
  ui: UI;
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
    ui: UI,
  ) {
    this.ctx = ctx;
    this.gameState = gameState;
    this.ui = ui;
    this.sprites = new Image();
    this.sprites.src = SPRITES_IMAGE_SRC;
  }

  public draw(freeze: boolean) {
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.drawHexes();
    this.drawTanks();
    this.drawSites();
    this.drawUI();
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

    this.ui.resize(canvasSize);
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

  private drawUI() {
    this.ctx.save();

    for (const button of this.ui.curButtons) {
      if (button.state === ButtonState.Invisible) continue;
      this.ctx.globalAlpha = 0.8;
      this.ctx.fillStyle = "white";
      if (button.state === ButtonState.Pressed) {
        this.ctx.fillStyle = "#444444";
      }
      if (button.state === ButtonState.Inactive) {
        this.ctx.fillStyle = "white";
      }

      this.ctx.fillRect(
        button.area.start.x,
        button.area.start.y,
        button.area.size.x,
        button.area.size.y,
      );

      let fontSize = button.baseFontSize;
      fontSize = Math.round(fontSize);
      this.ctx.font = `bold ${fontSize}px monospace`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillStyle = "black";
      if (button.state === ButtonState.Inactive) {
        this.ctx.fillStyle = "#444444";
        this.ctx.fillRect(
          button.area.start.x + 2,
          button.area.start.y + 2,
          button.area.size.x - 4,
          button.area.size.y - 4,
        );
        this.ctx.fillStyle = "white";
      }
      this.ctx.globalAlpha = 1;
      const center = button.area.start.add(button.area.size.mul(0.5)).round();
      this.ctx.fillText(button.text || "", center.x, center.y);
    }

    const modal = this.ui.getModal();
    if (modal !== null) {
      const area = modal.area;
      this.ctx.globalAlpha = 0.6;
      this.ctx.fillStyle = "white";
      this.ctx.fillRect(area.start.x, area.start.y, area.size.x, area.size.y);
      this.ctx.font = `bold ${modal.baseFontSize}px monospace`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.globalAlpha = 1;
      this.ctx.fillStyle = "black";
      const center = area.start.add(area.size.mul(0.5)).round();
      this.ctx.fillText(modal.text || "", center.x, center.y);

      this.ctx.lineWidth = modal.crossStrokeWidth;
      this.ctx.beginPath();
      const start = modal.crossArea.start;
      const end = start.add(modal.crossArea.size);
      this.ctx.moveTo(start.x, start.y);
      this.ctx.lineTo(end.x, end.y);
      this.ctx.moveTo(start.x, end.y);
      this.ctx.lineTo(end.x, start.y);
      this.ctx.closePath();
      this.ctx.stroke();
    }

    this.ctx.restore();
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
