import { Point } from "./point";

export type Rect = {
  position: Point;
  width: number;
  height: number;
};

export function Rect(position: Point, width: number, height: number): Rect {
  return { position: position, width, height };
}

Rect.isPointInside = (rect: Rect, point: Point): boolean => {
  return (
    point.x >= rect.position.x &&
    point.x <= rect.position.x + rect.width &&
    point.y >= rect.position.y &&
    point.y <= rect.position.y + rect.height
  );
};
