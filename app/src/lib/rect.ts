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

Rect.isRectInside = (outer: Rect, inner: Rect): boolean => {
  return (
    inner.position.x >= outer.position.x &&
    inner.position.x + inner.width <= outer.position.x + outer.width &&
    inner.position.y >= outer.position.y &&
    inner.position.y + inner.height <= outer.position.y + outer.height
  );
};

Rect.overlapArea = (a: Rect, b: Rect): number => {
  // Calculate the intersection rectangle
  const xOverlapStart = Math.max(a.position.x, b.position.x);
  const yOverlapStart = Math.max(a.position.y, b.position.y);
  const xOverlapEnd = Math.min(a.position.x + a.width, b.position.x + b.width);
  const yOverlapEnd = Math.min(
    a.position.y + a.height,
    b.position.y + b.height
  );

  // If there is no overlap, return 0
  if (xOverlapStart >= xOverlapEnd || yOverlapStart >= yOverlapEnd) {
    return 0;
  }

  // Calculate the area of the overlap
  const overlapWidth = xOverlapEnd - xOverlapStart;
  const overlapHeight = yOverlapEnd - yOverlapStart;
  return overlapWidth * overlapHeight;
};

Rect.isMostlyInside = (
  outer: Rect,
  inner: Rect,
  overlap: number = 0.6
): boolean => {
  // Calculate the area of overlap between the two rectangles
  const overlapArea = Rect.overlapArea(outer, inner);

  // Calculate the area of the inner rectangle
  const innerArea = inner.width * inner.height;

  // Return true if the overlap area is at least the specified percentage of the inner area
  return overlapArea >= innerArea * overlap;
};

Rect.AABBfromPoints = (points: Point[]): Rect => {
  // Return an axis-aligned bounding box (AABB) from a set of points
  if (points.length === 0) {
    return Rect(Point(0, 0), 0, 0);
  }

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (const point of points) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }
  return Rect(Point(minX, minY), maxX - minX, maxY - minY);
};
