import { Point } from "lib/point";
import { Rect } from "lib/rect";
import Render, { fill, fillAndStroke } from "lib/render";
import { View } from "view";
import { NotebookCollection } from "things/notebook";
import { TouchEvent } from "gesturesystem";

export abstract class Tool {
  position: Point = Point(0, 0);
  width: number = 40;
  height: number = 40;
  icon: string = "";

  tap(point: Point): boolean {
    if (Rect.isPointInside(this, point)) {
      return true;
    }
    return false;
  }

  render(r: Render) {
    r.image("./img/" + this.icon + ".png", this.position.x, this.position.y);
  }

  getHandler(view: View, notebook: NotebookCollection): ToolHandler {
    throw new Error("Method not implemented.");
  }
}

export interface ToolHandler {
  penDown(e: TouchEvent): void;
  penMove(e: TouchEvent): void;
  penUp(e: TouchEvent): void;
}

export default class Toolbar {
  tools: Tool[] = [];

  position: Point;
  width: number;
  height: number;

  activeTool: Tool | null = null;

  isActive: boolean = true;

  constructor(position: Point, tools: Tool[]) {
    this.position = position;
    this.tools = tools;
    this.height = 0;
    this.width = 40;

    for (const tool of tools) {
      tool.position = Point(this.position.x, this.position.y + this.height);
      this.height += tool.height;
    }

    this.activeTool = tools[0];

    // Layout
  }

  tap(point: Point): boolean {
    if (!this.isActive) return false;

    if (!Rect.isPointInside(this, point)) {
      return false;
    }
    for (const tool of this.tools) {
      if (tool.tap(point)) {
        this.activeTool = tool;
        return true;
      }
    }
    return false;
  }

  render(r: Render) {
    if (!this.isActive) return;

    cardWithShadow(
      r,
      this.position.x,
      this.position.y,
      this.width,
      this.height
    );

    for (const tool of this.tools) {
      tool.render(r);
      if (tool == this.activeTool) {
        r.rect(
          tool.position.x,
          tool.position.y,
          tool.width,
          tool.height,
          fill("#0002")
        );
      }
    }
  }
}

function cardWithShadow(
  r: Render,
  x: number,
  y: number,
  width: number,
  height: number
) {
  r.round_rect(x + 2, y + 2, width, height, 3, fill("#0001"));
  r.round_rect(x, y, width, height, 3, fillAndStroke("#FFF", "#0002", 1));
}
