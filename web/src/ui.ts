import { GameEvent, GameEventType, TypeOnlyEvent } from "./game-event.js";
import { Vector } from "./vector.js";

type Area = { start: Vector; size: Vector };

export enum ButtonState {
  Normal,
  Pressed,
  Inactive,
  Invisible,
}

function boxCollision(area: Area, p: Vector): boolean {
  const end = area.start.add(area.size);
  if (
    p.x >= area.start.x &&
    p.y >= area.start.y &&
    p.x <= end.x &&
    p.y <= end.y
  ) {
    return true;
  }
  return false;
}

interface Button {
  area: Area;
  text?: string;
  state: ButtonState;
  // TODO change name to fontSize
  baseFontSize: number;
  // TODO change to default value
  fontSizeMultiplier?: number;

  collides(p: Vector): boolean;
  getEvent(): GameEvent;
  // only needed for text input
  resize(): void;
}

class TextInput implements Button {
  area: Area;
  state: ButtonState;
  baseFontSize: number;
  fontSizeMultiplier?: number;
  element: HTMLInputElement;

  constructor(element: HTMLInputElement, fontSizeMultiplier?: number) {
    this.area = newArea(0, 0, 0, 0);
    this.state = ButtonState.Invisible;
    this.baseFontSize = 0;
    if (fontSizeMultiplier !== undefined) {
      this.fontSizeMultiplier = fontSizeMultiplier;
    }

    element.maxLength = 5;
    element.style.fontFamily = "monospace";
    this.element = element;
  }

  public hide() {
    this.element.style.display = "none";
    this.element.value = "";
  }

  public show() {
    this.element.style.display = "";
  }

  collides(p: Vector): boolean {
    const end = this.area.start.add(this.area.size);
    if (
      p.x >= this.area.start.x &&
      p.y >= this.area.start.y &&
      p.x <= end.x &&
      p.y <= end.y
    ) {
      return true;
    }
    return false;
  }

  getEvent(): GameEvent {
    return { type: GameEventType.NoneEvent };
  }

  resize() {
    const mul = 1 / window.devicePixelRatio;
    const start = this.area.start.mul(mul).round();
    const size = this.area.size.mul(mul).round();
    const borderWidth = this.area.size.y * 0.08 * mul;
    this.element.style.left = `${start.x}px`;
    this.element.style.top = `${start.y}px`;
    this.element.style.width = `${size.x}px`;
    this.element.style.height = `${size.y}px`;
    this.element.style.fontSize = `${this.baseFontSize * mul}px`;
    this.element.style.borderBottom = `${borderWidth}px solid white`;
  }
}

function newArea(
  startX: number,
  startY: number,
  sizeX: number,
  sizeY: number,
): Area {
  return { start: new Vector(startX, startY), size: new Vector(sizeX, sizeY) };
}

type PanelSizing = {
  maxWidth: number;
  maxHeight: number;
  grid: Vector;
  buff: number;
  // as % of width / grid.x
  baseFontSize: number;
  align?: Align;
  aspectRatio?: number;
  minAspectRatio?: number;
};

type DirectionalPanelData = {
  sizing: PanelSizing;
  buttonAreas: Area[];
};

function applyAspectRatio(
  aspectRatio: number,
  space: Vector,
  min: boolean = false,
): Vector {
  if (space.y === 0) {
    return new Vector(0, 0);
  }
  const spaceAspectRatio = space.x / space.y;

  if (spaceAspectRatio <= aspectRatio) {
    const x = space.x;
    const y = space.x / aspectRatio;
    return new Vector(x, y);
  }
  if (min) {
    return new Vector(space.x, space.y);
  }
  const y = space.y;
  const x = y * aspectRatio;
  return new Vector(x, y);
}

enum Align {
  Start,
  Center,
  End,
}

class Panel {
  area: Area;
  buttons: Button[] = [];

  horizontal: DirectionalPanelData;
  vertical: DirectionalPanelData;

  constructor(horizontal: PanelSizing, vertical: PanelSizing) {
    this.horizontal = { sizing: horizontal, buttonAreas: [] };
    this.vertical = { sizing: vertical, buttonAreas: [] };
    this.area = newArea(0, 0, 0, 0);
  }

  public attachButton(button: Button, horArea: Area, verArea: Area) {
    this.horizontal.buttonAreas.push(horArea);
    this.vertical.buttonAreas.push(verArea);
    this.buttons.push(button);
  }

  public resize(available: Vector) {
    if (available.y === 0) {
      this.area = newArea(0, 0, 0, 0);
      return;
    }
    const aspectRatio = available.x / available.y;
    const panel = aspectRatio >= 1 ? this.horizontal : this.vertical;

    const afterMax = new Vector(
      available.x * panel.sizing.maxWidth,
      available.y * panel.sizing.maxHeight,
    );

    let size = afterMax;
    if (panel.sizing.aspectRatio !== undefined) {
      size = applyAspectRatio(panel.sizing.aspectRatio, afterMax);
    } else if (panel.sizing.minAspectRatio) {
      size = applyAspectRatio(panel.sizing.minAspectRatio, afterMax, true);
    }

    this.area = newArea(0, 0, size.x, size.y);
    const leftover = available.sub(size);
    if (panel.sizing.align === Align.End) {
      this.area.start = leftover;
    }
    if (panel.sizing.align === Align.Center) {
      this.area.start = leftover.mul(0.5);
    }

    const buffer = panel.sizing.buff * Math.min(size.x, size.y);

    const cellSize = new Vector(
      (size.x - (panel.sizing.grid.x + 1) * buffer) / panel.sizing.grid.x,
      (size.y - (panel.sizing.grid.y + 1) * buffer) / panel.sizing.grid.y,
    );

    const fontSize =
      ((size.x / panel.sizing.grid.x) * panel.sizing.baseFontSize) / 100;

    for (const [i, area] of panel.buttonAreas.entries()) {
      const buttonSize = area.size
        .matmul(cellSize)
        .add(area.size.sub(new Vector(1, 1)).mul(buffer))
        .floor();
      const buttonStart = this.area.start
        .add(area.start.matmul(cellSize))
        .add(area.start.add(new Vector(1, 1)).mul(buffer))
        .round();
      const button = this.buttons[i];
      button.area = { start: buttonStart, size: buttonSize };
      button.baseFontSize = fontSize;
      if (button.fontSizeMultiplier !== undefined) {
        button.baseFontSize *= button.fontSizeMultiplier;
      }
      button.baseFontSize = Math.round(button.baseFontSize);
      button.resize();
    }
  }
}
