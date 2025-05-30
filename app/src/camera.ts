import { Point } from "lib/point";

export class Camera {
  position = { x: 0, y: 0 };
  zoom = 1;

  halfWidth: number = window.innerWidth / 2;
  halfHeight: number = window.innerHeight / 2;

  set(zoom: number, center: Point) {
    this.position.x = this.halfWidth / zoom - center.x;
    this.position.y = this.halfHeight / zoom - center.y;
    this.zoom = zoom;
  }

  reset() {
    this.position = { x: 0, y: 0 };
    this.zoom = 1;
  }

  screenToWorld(input: Point): Point {
    // Convert a screen position to a world position, taking into account the zoom level
    return {
      x: input.x / this.zoom - this.position.x,
      y: input.y / this.zoom - this.position.y,
    };
  }
}
