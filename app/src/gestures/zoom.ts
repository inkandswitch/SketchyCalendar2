import { GestureHandler, TouchEvent } from "gesturesystem";
import { View } from "view";
import { Vec } from "lib/vec";
import Render, { fill } from "lib/render";

export default class Zoom implements GestureHandler {
  a: TouchEvent | null = null;
  b: TouchEvent | null = null;

  view: View;
  initialDistance: number | null = null;

  constructor(view: View) {
    this.view = view;
  }

  onEvent(e: TouchEvent) {
    if (e.type != "finger") return;
    if (!this.view.isZoomedIn()) return;

    switch (e.phase) {
      case "began": {
        // only trigger pinch zoom in middle of screen
        if (e.current.x > 100 && e.current.x < window.innerWidth - 100) {
          if (!this.a) {
            this.a = e;
          } else if (!this.b) {
            this.b = e;
            this.initialDistance = Vec.dist(this.a.current, this.b.current);
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

        if (this.a && this.b) {
          const currentDistance = Vec.dist(this.a.current, this.b.current);
          const factor = window.innerWidth * 0.08;
          const delta = (currentDistance - this.initialDistance!) / factor;

          // Get the screen-space midpoint between the two fingers
          const screenCenter = Vec.mulS(
            Vec.add(this.a.current, this.b.current),
            0.5
          );

          // Save previous zoom and compute new zoom
          const oldZoom = this.view.overrideZoom || 1;
          const newZoom = Math.min(Math.max(1, oldZoom + delta), 4.5);

          // Adjust view center to maintain the world point under the screen center

          const screenCenterOffset = {
            x: screenCenter.x - window.innerWidth / 2,
            y: screenCenter.y - window.innerHeight / 2,
          };

          const zoomRatio = newZoom / oldZoom;

          // Now adjust center based on offset from screen center
          this.view.center.x +=
            (screenCenterOffset.x / oldZoom) * (1 - 1 / zoomRatio);
          this.view.center.y +=
            (screenCenterOffset.y / oldZoom) * (1 - 1 / zoomRatio);
          this.view.overrideZoom = newZoom;
          this.initialDistance = currentDistance;
        }
        break;
      }
      case "ended": {
        this.reset();
        break;
      }
    }
  }

  reset() {
    if (this.view.overrideZoom && this.view.overrideZoom < 1.1) {
      this.view.overrideZoom = null;
      this.view.center = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      };
    }
    this.a = null;
    this.b = null;
  }
}
