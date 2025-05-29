import { GestureHandler, TouchEvent } from "gesturesystem";
import { View } from "view";
import { Vec } from "lib/vec";

export default class PinchIn implements GestureHandler {
  a: TouchEvent | null = null;
  b: TouchEvent | null = null;
  a_side: "left" | "right" | null = "left";
  //b_side: "left" | "right" | null = "right";
  margin = 50;
  state: "init" | "pinching" | "ended" = "init";
  current_distance: number | null = null;

  view: View;

  constructor(view: View) {
    this.view = view;
  }

  onEvent(e: TouchEvent) {
    if (e.type != "finger") return;

    switch (e.phase) {
      case "began": {
        if (!this.view.isZoomedIn()) return;
        if (!this.a) {
          if (e.position.x < this.margin) {
            this.a = e;
            this.a_side = "left";
          } else if (e.position.x > window.innerWidth - this.margin) {
            this.a = e;
            this.a_side = "right";
          }
        } else if (!this.b) {
          if (this.a_side == "right" && e.position.x < this.margin) {
            this.b = e;
            //this.b_side = "left";
            this.state = "pinching";
          } else if (
            this.a_side == "left" &&
            e.position.x > window.innerWidth - this.margin
          ) {
            this.b = e;
            //this.b_side = "right";
            this.state = "pinching";
          }
        }
        break;
      }
      case "moved": {
        if (this.a && this.a.id == e.id) {
          this.a = e;
        }
        if (this.b && this.b.id == e.id) {
          this.b = e;
        }

        if (this.state == "pinching") {
          this.current_distance = Math.abs(
            this.b!.current.x - this.a!.current.x
          );

          // Handle pinch in moved
          let percentage = this.current_distance! / window.innerWidth!;
          if (percentage > 1) percentage = 1;
          if (percentage < 0) percentage = 0;
          this.view.zoom.target = percentage;
        } else if (this.state == "init") {
          if (this.a) {
            const factor = window.innerWidth * 0.1;
            const progress = Vec.len(this.a!.totalDelta) / factor;

            if (progress > 1) {
              let nextPage = this.view.pageToRight();
              if (this.a_side == "left") {
                nextPage = this.view.pageToLeft();
              }

              if (nextPage) {
                this.view.focusPage(nextPage);
                this.a = null;
              }
            }
          }
        }

        break;
      }
      case "ended": {
        if (this.a && this.a.id == e.id) {
          this.a = null;
          this.b = null;
          if (this.state == "pinching") {
            this.state = "ended";
          }
        }
        if (this.b && this.b.id == e.id) {
          this.a = null;
          this.b = null;
          if (this.state == "pinching") {
            this.state = "ended";
          }
        }
        if (this.state == "ended") {
          this.state = "init";
          let percentage = this.current_distance! / window.innerWidth!;
          if (percentage > 0.8) {
            percentage = 1;
          } else {
            percentage = 0;
          }
          this.view.zoom.target = percentage;
        }
        // Handle pinch in ended
        break;
      }
    }
  }
}
