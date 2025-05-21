import { Id } from "id";
import { Point } from "lib/point";
import Render, { fillAndStroke } from "lib/render";
import { State } from "./notebook";
import { NewPaperInstanceProps, PaperInstance } from "./paperinstance";
import { NewTextProps, Text } from "./text";
import { Stroke } from "./ink";

export type Background = null | string | Id<PaperProps> | CalendarBackground;

export type PaperProps = {
  id: Id<Paper>;
  width: number;
  height: number;
  background: Background;
};

export type CalendarBackground = {
  type: "Calendar";
};

export class Paper {
  #state: State;

  id: Id<Paper>;
  width: number;
  height: number;
  background: Background;

  children: Array<PaperInstance>;
  texts: Array<Text>;
  strokes: Array<Stroke>;

  constructor(
    state: State,
    props: PaperProps,
    children: Array<PaperInstance>,
    texts: Array<Text>,
    strokes: Array<Stroke>
  ) {
    this.#state = state;
    this.id = props.id;
    this.width = props.width;
    this.height = props.height;
    this.background = props.background;
    this.children = children;
    this.texts = texts;
    this.strokes = strokes;
  }

  static fromId(state: State, id: Id<Paper>) {
    const cached = state.objMap.get(id) as Paper | undefined;
    if (cached) {
      return cached;
    }

    const children = (state.paperChildrenMap.get(id) ?? []).map((props) =>
      PaperInstance.fromId(state, props.id)
    );

    const texts = (state.textChildrenMap.get(id) ?? []).map((props) =>
      Text.fromId(state, props.id)
    );

    const strokes = (state.strokeChildrenMap.get(id) ?? []).map(
      (props) => new Stroke(state, props)
    );

    const props = state.props.papers[id];
    const paper = new Paper(state, props, children, texts, strokes);
    state.objMap.set(props.id, paper);
    return paper;
  }

  static create(state: State, props: PaperProps) {
    const paper = new Paper(state, props, [], [], []);

    state.docHandle.change((state) => {
      state.papers[props.id] = props;
    });

    state.objMap.set(props.id, paper);
    return paper;
  }

  addNewPaper(props: Omit<NewPaperInstanceProps, "parentId">) {
    const paperInstance = PaperInstance.create(this.#state, {
      parentId: this.id,
      siblingIndex: props.siblingIndex,
      x: props.x,
      y: props.y,
      background: props.background,
      width: props.width,
      height: props.height,
    });

    return paperInstance;
  }

  transcludeTo(paper: Paper, position: Point): PaperInstance {
    return PaperInstance.create(this.#state, {
      parentId: paper.id,
      siblingIndex: 0,
      x: position.x,
      y: position.y,
      background: null,
      width: this.width,
      height: this.height,
    });
  }

  addNewText(props: Omit<NewTextProps, "parentId">) {
    return Text.create(this.#state, {
      ...props,
      parentId: this.id,
    });
  }

  render(r: Render, position: Point) {
    r.rect(
      position.x,
      position.y,
      this.width,
      this.height,
      fillAndStroke("white", "black", 1)
    );

    for (const child of this.children) {
      child.render(r, position);
    }

    for (const text of this.texts) {
      text.render(r, position);
    }
  }
}
