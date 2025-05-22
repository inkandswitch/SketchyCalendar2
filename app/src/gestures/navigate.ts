import { GestureHandler, TouchEvent } from "gesturesystem";
import { View } from "view";
import { Vec } from "lib/vec";

export default class Navigate implements GestureHandler {
  view: View;
  touch: TouchEvent | null = null;

  //direction: "horizontal" | "vertical" | null = null;
  //progress: number = 0;

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
        }
        break;
      }
      case "moved": {
        if (this.touch && this.touch.id == e.id) {
          this.touch = e;
          const totalDelta = this.touch.totalDelta;
          // if (Math.abs(totalDelta.x) > Math.abs(totalDelta.y)) {
          //   this.direction = "horizontal";
          // } else {
          //   this.direction = "vertical";
          // }
          const progress = Vec.len(totalDelta) / (window.innerWidth * 0.1);

          if (progress > 1) {
            this.touch = null;
            if (Math.abs(totalDelta.x) > Math.abs(totalDelta.y)) {
              if (totalDelta.x > 0) {
                console.log("right swipe");
                this.view.navigateHorizontal(-1);
              } else {
                console.log("left swipe");
                this.view.navigateHorizontal(1);
              }
            } else {
              if (totalDelta.y > 0) {
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
