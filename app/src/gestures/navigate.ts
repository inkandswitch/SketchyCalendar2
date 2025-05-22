import { GestureHandler, TouchEvent } from "gesturesystem";
import { View } from "view";
import { Vec } from "lib/vec";
import { Point } from "lib/point";

export default class Navigate implements GestureHandler {
  view: View;
  touch: TouchEvent | null = null;

  //direction: "horizontal" | "vertical" | null = null;
  startPoint: Point | null = null;

  constructor(view: View) {
    this.view = view;
  }

  onEvent(e: TouchEvent) {
    if (e.type != "finger") return;
    if (this.view.isZoomedIn()) return;

    switch (e.phase) {
      case "began": {
        if (!this.touch) {
          this.touch = e;
          this.startPoint = e.start;
        }
        break;
      }
      case "moved": {
        if (this.touch && this.touch.id == e.id) {
          this.touch = e;
          const delta = Vec.sub(e.current, this.startPoint!);

          const factor = window.innerWidth * 0.1;
          const progress = Vec.len(delta) / factor;
          if (progress > 1) {
            this.startPoint = e.current;
            if (Math.abs(delta.x) > Math.abs(delta.y)) {
              if (delta.x > 0) {
                console.log("right swipe");
                this.view.navigateHorizontal(-1);
              } else {
                console.log("left swipe");
                this.view.navigateHorizontal(1);
              }
            } else {
              if (delta.y > 0) {
                console.log("down swipe");
                this.view.navigateVertical(-1);
              } else {
                console.log("up swipe");
                this.view.navigateVertical(1);
              }
            }
          }
        }
        break;
      }
      case "ended": {
        if (this.touch && this.touch.id == e.id) {
          if (Vec.len(this.touch.totalDelta) < 10) {
            this.view.zoomLevel.setTarget(1);
          }
          this.touch = null;
        }
        break;
      }
    }
  }
}
