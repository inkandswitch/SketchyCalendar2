import { Rect } from "lib/rect";
import Render, { fill, fillAndStroke } from "lib/render";

import { Point } from "lib/point";

export class Action {
  position: Point = Point(0, 0);
  width: number = 40;
  height: number = 40;
  icon: string = "";
  callback: () => void;

  constructor(icon: string, callback: () => void) {
    this.icon = icon;
    this.callback = callback;
  }

  tap(point: Point): boolean {
    if (Rect.isPointInside(this, point)) {
      this.callback();
      return true;
    }
    return false;
  }

  render(r: Render) {
    r.image("./img/" + this.icon + ".png", this.position.x, this.position.y);
  }
}

export class ActionBar {
  position: Point;
  actions: Action[] = [];

  width: number;
  height: number;

  constructor(actions: Action[]) {
    this.height = 40;
    this.width = actions.length * 40;

    this.position = {
      x: window.innerWidth / 2 - this.width / 2,
      y: 20,
    };
    this.actions = actions;

    for (let i = 0; i < this.actions.length; i++) {
      const action = this.actions[i];
      action.position = Point(this.position.x + i * 40, this.position.y);
    }
  }

  tap(point: Point): boolean {
    for (const action of this.actions) {
      if (action.tap(point)) {
        return true;
      }
    }
    return false;
  }

  render(r: Render) {
    cardWithShadow(
      r,
      this.position.x,
      this.position.y,
      this.width,
      this.height
    );

    for (const action of this.actions) {
      action.render(r);
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
