import { Background } from "./paper";

import { generateId, Id } from "id";
import { Paper } from "./paper";
import { State } from "./notebook";
import { Point } from "lib/point";
import Render from "lib/render";
import { Vec } from "lib/vec";

export type PaperInstanceProps = {
  id: Id<PaperInstance>;
  paperId: Id<Paper>;
  parentId: Id<Paper>;
  siblingIndex: number;
  x: number;
  y: number;
  locked: boolean;
};

export type NewPaperInstanceProps = {
  parentId: Id<Paper>;
  background: Background;
  siblingIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  locked: boolean;
};

export type NewInstanceOfProps = {
  paperId: Id<Paper>;
  parentId: Id<Paper>;
  siblingIndex: number;
  x: number;
  y: number;
  locked: boolean;
};

export class PaperInstance {
  #state: State;

  id: Id<PaperInstance>;
  x: number;
  y: number;
  locked: boolean;

  paper: Paper;

  constructor(state: State, props: PaperInstanceProps, paper: Paper) {
    this.#state = state;

    this.id = props.id;
    this.x = props.x;
    this.y = props.y;
    this.locked = props.locked;
    this.paper = paper;
  }

  static fromId(state: State, id: Id<PaperInstance>): PaperInstance {
    const cached = state.objMap.get(id) as PaperInstance | undefined;
    if (cached) {
      return cached;
    }

    const props = state.props.paperInstances[id];
    const paper = Paper.fromId(state, props.paperId);

    const paperInstance = new PaperInstance(state, props, paper);
    state.objMap.set(props.id, paperInstance);
    return paperInstance;
  }

  static createInstanceOf(
    state: State,
    props: NewInstanceOfProps
  ): PaperInstance {
    const paper = Paper.fromId(state, props.paperId);

    const paperInstanceProps: PaperInstanceProps = {
      id: generateId<PaperInstance>(),
      paperId: props.paperId,
      parentId: props.parentId,
      siblingIndex: props.siblingIndex,
      x: props.x,
      y: props.y,
      locked: props.locked,
    };

    state.docHandle.change((state) => {
      state.paperInstances[paperInstanceProps.id] = paperInstanceProps;
    });

    const paperInstance = new PaperInstance(state, paperInstanceProps, paper);

    state.objMap.set(paperInstanceProps.id, paperInstance);

    return paperInstance;
  }

  static create(state: State, props: NewPaperInstanceProps): PaperInstance {
    const paper = Paper.create(state, {
      id: generateId<Paper>(),
      width: props.width,
      height: props.height,
      background: props.background,
    });

    const paperInstanceProps: PaperInstanceProps = {
      id: generateId<PaperInstance>(),
      paperId: paper.id,
      parentId: props.parentId,
      siblingIndex: props.siblingIndex,
      x: props.x,
      y: props.y,
      locked: props.locked,
    };

    state.docHandle.change((state) => {
      state.paperInstances[paperInstanceProps.id] = paperInstanceProps;
    });

    return new PaperInstance(state, paperInstanceProps, paper);
  }

  moveTo(parentId: Id<Paper>, x: number, y: number) {
    this.#state.docHandle.change((state) => {
      state.paperInstances[this.id].parentId = parentId;
      state.paperInstances[this.id].x = x;
      state.paperInstances[this.id].y = y;
    });
  }

  render(r: Render, offset: Point) {
    const position = Vec.add(offset, this);

    this.paper.render(r, position, !this.locked);
  }
}
