export type Point = {
  x: number;
  y: number;
};

export function Point(x: number, y: number): Point {
  return { x, y };
}

Point.clone = (a: Point): Point => Point(a.x, a.y);
