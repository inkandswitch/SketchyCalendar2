import Render, { stroke } from "lib/render";

import { Id, generateId } from "id";
import { Paper } from "things/paper";
import { State } from "./notebook";

import { Point } from "lib/point";
import { Vec } from "lib/vec";

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

  render(r: Render, offset: Point) {
    const points = this.props.points.map((point) => {
      return Vec.add(offset, point);
    });

    r.poly(points, stroke(this.props.color, this.props.weight), false);
  }
}
