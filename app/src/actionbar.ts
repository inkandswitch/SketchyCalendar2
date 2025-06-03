import { Rect } from "lib/rect";
import Render, { fill, fillAndStroke } from "lib/render";

import { NO_STICKY_NOTE_COLOR } from "constants";
import { Point } from "lib/point";

export interface ActionInterface {
  position: Point;
  width: number;
  height: number;

  tap(point: Point): boolean;
  render(r: Render): void;
}

export class Action implements ActionInterface {
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

// type DropDownOption = {
//   value: string;
//   render: (r: Render, value: string, x: number, y: number) => void;
// };

export class ColorDropDownAction implements ActionInterface {
  value: string = NO_STICKY_NOTE_COLOR;
  position: Point = Point(0, 0);
  width: number = 40;
  height: number = 40;
  callback: (val: string) => void;
  direction: "horizontal" | "vertical" = "vertical";

  options: Array<string> = [];
  active: boolean = false;

  constructor(
    options: Array<string>,
    callback: (val: string) => void,
    direction: "horizontal" | "vertical" = "vertical"
  ) {
    this.callback = callback;
    this.options = options;
    this.direction = direction;
  }

  tap(point: Point): boolean {
    if (this.active) {
      const optionSize = 40;
      for (let i = 0; i < this.options.length; i++) {
        const optionX =
          this.direction === "horizontal"
            ? this.position.x + i * optionSize
            : this.position.x;
        const optionY =
          this.direction === "vertical"
            ? this.position.y + i * optionSize
            : this.position.y;

        if (
          point.x >= optionX &&
          point.x <= optionX + this.width &&
          point.y >= optionY &&
          point.y <= optionY + this.height
        ) {
          this.callback(this.options[i]);
          this.active = false;
          return true;
        }
      }
      this.active = false;
      return true;
    }

    if (Rect.isPointInside(this, point)) {
      this.active = !this.active;
      return true;
    }
    return false;
  }

  render(r: Render) {
    r.circle(
      this.position.x + 20,
      this.position.y + 20,
      15,
      fillAndStroke(this.value, "grey", 0.5)
    );

    if (this.active) {
      const optionSize = 40;
      const dropdownWidth =
        this.direction === "horizontal"
          ? optionSize * this.options.length
          : this.width;
      const dropdownHeight =
        this.direction === "vertical"
          ? optionSize * this.options.length
          : this.height;

      cardWithShadow(
        r,
        this.position.x,
        this.position.y,
        dropdownWidth,
        dropdownHeight
      );

      for (let i = 0; i < this.options.length; i++) {
        const option = this.options[i];
        const optionX =
          this.direction === "horizontal"
            ? this.position.x + 20 + i * optionSize
            : this.position.x + 20;
        const optionY =
          this.direction === "vertical"
            ? this.position.y + 20 + i * optionSize
            : this.position.y + 20;

        r.circle(optionX, optionY, 15, fillAndStroke(option, "grey", 0.5));
      }
    }
  }
}

export class ActionBar {
  position: Point;
  actions: ActionInterface[] = [];

  width: number;
  height: number;

  constructor(actions: ActionInterface[]) {
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
