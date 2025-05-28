import Render, { font } from "lib/render";

import { Id, generateId } from "id";
import { Paper } from "./paper";
import { Notebook, State } from "./notebook";

import { Point } from "lib/point";
import { Vec } from "lib/vec";
import { Link, LinkTarget } from "./link";
import { Page } from "./page";

export type TextProps = {
  id: Id<Text>;
  parentId: Id<Paper>;
  siblingIndex: number;
  value: string;
  x: number;
  y: number;
  font: string;
  color: string;
};

export type NewTextProps = {
  parentId: Id<Paper>;
  siblingIndex: number;
  value: string;
  x: number;
  y: number;
  font?: string;
  color?: string;
};

export class Text {
  #state: State;

  id: Id<Text>;
  parentId: Id<Paper>;
  siblingIndex: number;
  value: string;
  x: number;
  y: number;
  font: string;
  color: string;

  constructor(state: State, props: TextProps) {
    this.#state = state;
    this.id = props.id;
    this.parentId = props.parentId;
    this.siblingIndex = props.siblingIndex;
    this.value = props.value;
    this.x = props.x;
    this.y = props.y;
    this.font = props.font;
    this.color = props.color;
  }

  addLinkTo(target: Page) {
    return Link.create(this.#state, {
      id: this.id,
      targetPage: {
        id: target.id,
        notebookDocId: target.notebook.documentId,
      },
    });
  }

  isPointInside(position: Point) {
    // todo: actually measure the text
    return (
      position.x >= this.x &&
      position.x <= this.x + 100 &&
      position.y >= this.y &&
      position.y <= this.y + 100
    );
  }

  static fromId(state: State, id: Id<Text>): Text {
    const props = state.props.texts[id];
    return new Text(state, props);
  }

  static create(state: State, props: NewTextProps): Text {
    const textProps: TextProps = {
      ...props,
      id: generateId<Text>(),
      font: props.font ?? "16px Arial",
      color: props.color ?? "#444",
    };

    state.docHandle.change((state) => {
      state.texts[textProps.id] = textProps;
    });

    return new Text(state, textProps);
  }

  get notebook() {
    return this.#state.notebook;
  }

  render(r: Render, offset: Point) {
    const position = Vec.add(offset, this);

    r.text(this.value, position.x, position.y, font(this.font, this.color));
  }
}
