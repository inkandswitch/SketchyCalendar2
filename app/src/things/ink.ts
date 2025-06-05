import Render, { stroke, fill } from "lib/render";

import { Id, generateId } from "id";
import { Paper } from "things/paper";
import { State } from "./notebook";

import { Point } from "lib/point";
import { Vec } from "lib/vec";
import { Rect } from "lib/rect";
import { UNDERLAY_INK_COLOR, SELECTION_COLOR } from "constants";

import { Link } from "things/link";
import { Page } from "things/page";
import { Polygon } from "lib/polygon";

export type StrokeProps = {
  id: Id<Stroke>;
  parentId: Id<Paper>;
  points: Array<{ x: number; y: number }>;
  color: string;
  weight: number;
  offset: Point;
};

export class Stroke {
  #state: State;
  props: StrokeProps;

  static selected = new Map<Id<Stroke>, boolean>();

  static bufferedData: Record<Id<Stroke>, Array<Point>> = {};

  constructor(state: State, props: StrokeProps) {
    this.#state = state;
    this.props = props;
  }

  static fromId(state: State, id: Id<Stroke>): Stroke {
    const props = state.props.strokes[id];
    return new Stroke(state, props);
  }

  static create(
    state: State,
    parentId: Id<Paper>,
    color: string,
    weight: number
  ): Stroke {
    const id = generateId<Stroke>();
    const props: StrokeProps = {
      id,
      parentId,
      points: [],
      color,
      weight,
      offset: { x: 0, y: 0 },
    };
    state.docHandle.change((state) => {
      state.strokes[props.id] = props;
    });
    return new Stroke(state, props);
  }

  copy(newParent?: Id<Paper>): Stroke {
    const newId = generateId<Stroke>();

    const newProps = JSON.parse(JSON.stringify(this.props));
    newProps.id = newId;
    newProps.parentId = newParent ?? this.props.parentId;
    newProps.offset = Vec.add(this.props.offset, { x: 10, y: 10 });

    this.#state.docHandle.change((state) => {
      state.strokes[newId] = newProps;
    });
    return new Stroke(this.#state, newProps);
  }

  remove() {
    this.#state.docHandle.change((state) => {
      delete state.strokes[this.props.id];
    });
  }

  addPoint(point: Point) {
    // Add the point to the buffered data
    if (!Stroke.bufferedData[this.props.id]) {
      Stroke.bufferedData[this.props.id] = [];
    }
    const buffer = Stroke.bufferedData[this.props.id];
    buffer.push(point);
    const [error, maxErrorIndex] = linearApproximationError(buffer);

    if (error > 0.2) {
      // 0.1 is a threshold for error
      let appendPoint = buffer[maxErrorIndex];
      this.#state.docHandle.change((state) => {
        state.strokes[this.props.id].points.push(appendPoint);
      });
      Stroke.bufferedData[this.props.id] = buffer.slice(maxErrorIndex);
    }
  }

  endStroke() {
    // Add the last point in the buffer if it exists
    if (
      Stroke.bufferedData[this.props.id] &&
      Stroke.bufferedData[this.props.id].length > 0
    ) {
      const lastPoint =
        Stroke.bufferedData[this.props.id][
          Stroke.bufferedData[this.props.id].length - 1
        ];
      this.#state.docHandle.change((state) => {
        state.strokes[this.props.id].points.push(lastPoint);
      });
      delete Stroke.bufferedData[this.props.id];
    }
  }

  move(delta: Vec) {
    this.#state.docHandle.change((state) => {
      const currentOffset = state.strokes[this.props.id].offset;
      state.strokes[this.props.id].offset = {
        x: currentOffset.x + delta.x,
        y: currentOffset.y + delta.y,
      };
    });
  }

  reparent(parentId: Id<Paper>) {
    // Find parentId in the current state
    const parent = this.#state.collection.getPaperById(parentId)!;

    // Reparent to the new notebook
    if (parent.notebook != this.#state.notebook) {
      parent.notebook.state.docHandle.change((state) => {
        state.strokes[this.props.id] = this.props;
        state.strokes[this.props.id].parentId = parentId;
      });
      this.#state.docHandle.change((state) => {
        delete state.strokes[this.props.id];
      });
    } else {
      this.#state.docHandle.change((state) => {
        state.strokes[this.props.id].parentId = parentId;
      });
    }
  }

  getRect(offset: Point): Rect {
    const points = this.props.points.map((point) =>
      Vec.add(offset, Vec.add(point, this.props.offset))
    );
    return Rect.AABBfromPoints(points);
  }

  isInsideHull(hull: Polygon, offset: Point): boolean {
    const points = this.props.points.map((point) =>
      Vec.add(offset, Vec.add(point, this.props.offset))
    );
    for (const point of points) {
      if (Polygon.isPointInside(hull, point)) {
        return true;
      }
    }
    return false;
  }

  isPointNear(point: Point): boolean {
    const threshold = this.props.weight / 2 + 10; // Adjust threshold based on weight
    for (const p of this.props.points) {
      const offsetPoint = Vec.add(p, this.props.offset);
      if (Vec.dist(offsetPoint, point) <= threshold) {
        return true;
      }
    }
    return false;
  }

  setColor(color: string) {
    this.#state.docHandle.change((state) => {
      state.strokes[this.props.id].color = color;
    });
  }

  setOffset(offset: Point) {
    this.#state.docHandle.change((state) => {
      state.strokes[this.props.id].offset = offset;
    });
  }

  addLinkTo(target: Page | string) {
    this.setColor("#8844FF");

    return Link.create(this.#state, {
      id: this.props.id,
      target:
        typeof target === "string"
          ? { type: "url", url: target }
          : {
              type: "page",
              id: target.id,
              notebookDocId: target.notebook.documentId,
            },
    });
  }

  render(r: Render, offset: Point, isBackground: boolean) {
    const points = this.props.points.map((point) => {
      return Vec.add(offset, Vec.add(point, this.props.offset));
    });

    // Append the last point in the buffer
    if (Stroke.bufferedData[this.props.id]) {
      const buffer = Stroke.bufferedData[this.props.id];
      if (buffer.length > 0) {
        const lastPoint = buffer[buffer.length - 1];
        points.push(Vec.add(offset, Vec.add(lastPoint, this.props.offset)));
      }
    }

    let color = this.props.color;

    if (isBackground) {
      if (this.props.color.length === 9) {
        // Check if color has alpha value (#RRGGBBAA)
        const alpha = this.props.color.slice(-2);
        color = UNDERLAY_INK_COLOR + alpha;
      } else {
        color = UNDERLAY_INK_COLOR;
      }
    }

    r.poly(points, stroke(color, this.props.weight), false);

    if (Stroke.selected.get(this.props.id)) {
      r.poly(points, stroke(SELECTION_COLOR, this.props.weight + 5), false);
    }

    // Debug render
    // render individual points
    // for (const point of points) {
    //   r.circle(point.x, point.y, 2, fill("red"));
    // }
  }
}

function linearApproximationError(points: Array<Point>): [number, number] {
  // Calculate the vector between the first and last points
  const first = points[0];
  const last = points[points.length - 1];
  const line = Vec.sub(last, first);

  let maxError = 0;
  let index = 0;
  // Calculate the distance between each point and the line
  for (let i = 1; i < points.length - 1; i++) {
    const point = points[i];
    const diff = Vec.sub(point, first);
    const projection = Vec.project(diff, line);
    const error = Vec.sub(diff, projection);
    const errorLength = Vec.len(error);
    if (errorLength > maxError) {
      maxError = errorLength;
      index = i;
    }
  }

  return [maxError, index];
}
