import { GestureHandler, TouchEvent } from "gesturesystem";
import { View } from "view";
import { Vec } from "lib/vec";

export default class Navigate implements GestureHandler {
  view: View;
  touch: TouchEvent | null = null;

  direction: "horizontal" | "vertical" | null = null;
  progress: number = 0;

  constructor(view: View) {
    this.view = view;
  }

  onEvent(e: TouchEvent) {
    if (e.type != "finger") return;
    switch (e.phase) {
      case "began": {
        if (!this.touch) {
          this.touch = e;
        }
        break;
      }
      case "moved": {
        if (this.touch && this.touch.id == e.id) {
          this.touch = e;
          const totalDelta = this.touch.totalDelta;
          if (Math.abs(totalDelta.x) > Math.abs(totalDelta.y)) {
            this.direction = "horizontal";
          } else {
            this.direction = "vertical";
          }
          this.progress = Vec.len(totalDelta) / (window.innerWidth * 0.3);
          console.log(this.direction, this.progress);
        }
        break;
      }
      case "ended": {
        break;
      }
    }
  }
}
