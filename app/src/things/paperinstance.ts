import { Background } from "./paper";

import { generateId, Id } from "id";
import Render from "lib/render";

import { State } from "./notebook";
import { Paper } from "./paper";

import { Point } from "lib/point";
import { Rect } from "lib/rect";
import { Vec } from "lib/vec";

export type PaperInstanceProps = {
  id: Id<PaperInstance>;
  labels: string[];
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
  labels?: string[];
  siblingIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  locked: boolean;
};

export type NewInstanceOfProps = {
  paperId: Id<Paper>;
  labels?: string[];
  parentId: Id<Paper>;
  siblingIndex: number;
  x: number;
  y: number;
  locked: boolean;
};

export class PaperInstance {
  #state: State;

  id: Id<PaperInstance>;
  parentId: Id<Paper>;
  siblingIndex: number;
  x: number;
  y: number;
  locked: boolean;
  labels: string[];

  paper: Paper;

  static selected = new Map<Id<PaperInstance>, boolean>();
  static highlighted = new Map<Id<PaperInstance>, boolean>();

  constructor(state: State, props: PaperInstanceProps, paper: Paper) {
    this.#state = state;

    this.id = props.id;
    this.parentId = props.parentId;
    this.siblingIndex = props.siblingIndex;
    this.x = props.x;
    this.y = props.y;
    this.locked = props.locked;
    this.paper = paper;
    this.labels = props.labels;
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
      labels: props.labels ? [...props.labels] : [],
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
      labels: props.labels ?? [],
    };

    state.docHandle.change((state) => {
      state.paperInstances[paperInstanceProps.id] = paperInstanceProps;
    });

    return new PaperInstance(state, paperInstanceProps, paper);
  }

  copy(): PaperInstance {
    const newPaper = this.paper.copy();

    return PaperInstance.createInstanceOf(this.#state, {
      paperId: newPaper.id,
      labels: this.labels,
      parentId: this.parentId,
      siblingIndex: this.siblingIndex + 1, // Increment sibling index to avoid conflicts
      x: this.x + 10, // Offset the position slightly to avoid overlap
      y: this.y + 10,
      locked: this.locked,
    });
  }

  transclude(): PaperInstance {
    // Create a new paper instance that references the same paper
    return PaperInstance.createInstanceOf(this.#state, {
      paperId: this.paper.id,
      labels: this.labels,
      parentId: this.parentId,
      siblingIndex: this.siblingIndex + 1, // Increment sibling index to avoid conflicts
      x: this.x + 10, // Offset the position slightly to avoid overlap
      y: this.y + 10,
      locked: this.locked,
    });
  }

  remove() {
    this.#state.docHandle.change((state) => {
      delete state.paperInstances[this.id];
    });
  }

  get notebook() {
    return this.#state.notebook;
  }

  move(delta: Vec) {
    this.#state.docHandle.change((state) => {
      state.paperInstances[this.id].x += delta.x;
      state.paperInstances[this.id].y += delta.y;
    });
  }

  moveTo(newParentId: Id<Paper>, position: Point) {
    const parent = Paper.fromId(this.#state, this.parentId);
    const highest_siblingIndex = parent.children.reduce(
      (max, child) => Math.max(max, child.siblingIndex),
      -1
    );

    this.#state.docHandle.change((state) => {
      state.paperInstances[this.id].parentId = newParentId;
      state.paperInstances[this.id].siblingIndex = highest_siblingIndex + 1;
      state.paperInstances[this.id].x = position.x;
      state.paperInstances[this.id].y = position.y;
    });
  }

  reparent(newParentId: Id<Paper>) {
    const parent = Paper.fromId(this.#state, this.parentId);
    const highest_siblingIndex = parent.children.reduce(
      (max, child) => Math.max(max, child.siblingIndex),
      -1
    );
    this.#state.docHandle.change((state) => {
      state.paperInstances[this.id].parentId = newParentId;
      state.paperInstances[this.id].siblingIndex = highest_siblingIndex + 1;
    });
  }

  setColor(color: string) {
    this.paper.setColor(color);
  }

  // Return this top-level paper instance if the position is inside it, otherwise return null.
  getPaperInstanceAtPosition(position: Point): PaperInstance | null {
    const rect = Rect(this, this.paper.width, this.paper.height);
    if (Rect.isPointInside(rect, position)) {
      // If the position is inside this paper instance, check it's children first
      for (const instance of this.paper.children) {
        // Calculate the position of the child instance relative to this instance
        const found = instance.getPaperInstanceAtPosition(
          Vec.sub(position, this)
        );
        if (found) {
          return found;
        }
      }

      // If no children contain the position, return this instance
      if (!this.locked) {
        return this;
      }
    }

    return null;
  }

  getRect(offset: Point = Point(0, 0)): Rect {
    const position = Vec.add(offset, this);
    return Rect(position, this.paper.width, this.paper.height);
  }

  render(r: Render, offset: Point, isBackground: boolean) {
    const position = Vec.add(offset, this);

    this.paper.render(r, position, {
      hasShadow: !this.locked,
      isSelected: PaperInstance.selected.has(this.id),
      highlighted: PaperInstance.highlighted.has(this.id),
      isBackground,
    });
  }
}
