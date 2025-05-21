import { GestureHandler, TouchEvent } from "gesturesystem";
import { SceneGraph } from "view";

export default class PinchIn implements GestureHandler {
  a: TouchEvent | null = null;
  b: TouchEvent | null = null;
  a_side: "left" | "right" | null = "left";
  //b_side: "left" | "right" | null = "right";
  margin = 50;
  state: "init" | "pinching" | "ended" = "init";
  current_distance: number | null = null;

  sceneGraph: SceneGraph;

  constructor(sceneGraph: SceneGraph) {
    this.sceneGraph = sceneGraph;
  }

  onEvent(e: TouchEvent) {
    if (e.type != "finger") return;
    switch (e.phase) {
      case "began": {
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
          if (percentage < 0.33) percentage = 0.33;
          this.sceneGraph.zoomLevel.setTarget(percentage);
        }

        break;
      }
      case "ended": {
        if (this.a && this.a.id == e.id) {
          this.a = null;
          if (this.state == "pinching") {
            this.state = "ended";
          }
        }
        if (this.b && this.b.id == e.id) {
          this.b = null;
          if (this.state == "pinching") {
            this.state = "ended";
          }
        }
        if ((this.state = "ended")) {
          this.state = "init";
          let percentage = this.current_distance! / window.innerWidth!;
          if (percentage > 0.9) {
            percentage = 1;
          } else {
            percentage = 0.33;
          }
          this.sceneGraph.zoomLevel.setTarget(percentage);
        }
        // Handle pinch in ended
        break;
      }
    }
  }
}
