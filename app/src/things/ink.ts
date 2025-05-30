import Render, { stroke } from "lib/render";

import { Id, generateId } from "id";
import { Paper } from "things/paper";
import { State } from "./notebook";

import { Point } from "lib/point";
import { Vec } from "lib/vec";
import { Rect } from "lib/rect";
import { UNDERLAY_INK_COLOR, SELECTION_COLOR } from "constants";

export type StrokeProps = {
  id: Id<Stroke>;
  parentId: Id<Paper>;
  points: Array<{ x: number; y: number }>;
  color: string;
  weight: number;
};

export class Stroke {
  #state: State;
  props: StrokeProps;

  static selected = new Map<Id<Stroke>, boolean>();

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
    };
    state.docHandle.change((state) => {
      state.strokes[props.id] = props;
    });
    return new Stroke(state, props);
  }

  addPoint(point: Point) {
    this.#state.docHandle.change((state) => {
      state.strokes[this.props.id].points.push(point);
    });
  }

  move(delta: Vec) {
    this.#state.docHandle.change((state) => {
      const points = state.strokes[this.props.id].points;
      for (const point of points) {
        point.x += delta.x;
        point.y += delta.y;
      }
    });
  }

  reparent(parentId: Id<Paper>) {
    this.#state.docHandle.change((state) => {
      state.strokes[this.props.id].parentId = parentId;
    });
  }

  getRect(offset: Point): Rect {
    const points = this.props.points.map((point) => Vec.add(offset, point));
    return Rect.AABBfromPoints(points);
  }

  render(r: Render, offset: Point, isBackground: boolean) {
    const points = this.props.points.map((point) => {
      return Vec.add(offset, point);
    });

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
  }
}
