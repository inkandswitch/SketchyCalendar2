import Render, { font, measureText } from "lib/render";

import { Id, generateId } from "id";
import { State } from "./notebook";
import { Paper } from "./paper";

import { Point } from "lib/point";
import { Vec } from "lib/vec";
import { Link } from "./link";
import { Page } from "./page";
import { BACKGROUND_COLOR, LINK_COLOR } from "../constants";

export type TextProps = {
  id: Id<Text>;
  labels: string[];
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
  labels?: string[];
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
  labels: string[];

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
    this.labels = props.labels;
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

  getSize(): { width: number; height: number } {
    return measureText(this.value, font(this.font, this.color));
  }

  isPointInside(position: Point) {
    const { width, height } = this.getSize();

    return (
      position.x >= this.x &&
      position.x <= this.x + width &&
      position.y >= this.y &&
      position.y <= this.y + height
    );
  }

  addTextAfter({
    gap,
    text,
    font,
    color,
    labels = [],
  }: {
    gap: number;
    text: string;
    font: string;
    labels?: string[];
    color?: string;
  }) {
    const { width } = this.getSize();

    return Text.create(this.#state, {
      parentId: this.parentId,
      siblingIndex: this.siblingIndex + 1,
      value: text,
      x: this.x + width + gap,
      y: this.y,
      font,
      color,
      labels,
    });
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
      labels: props.labels ?? [],
    };

    state.docHandle.change((state) => {
      state.texts[textProps.id] = textProps;
    });

    return new Text(state, textProps);
  }

  get notebook() {
    return this.#state.notebook;
  }

  render(r: Render, offset: Point, isBackground: boolean) {
    const position = Vec.add(offset, this);

    const isLink = this.#state.props.links[this.id];

    let color = this.color;
    if (isBackground) {
      color = BACKGROUND_COLOR;
    } else if (isLink) {
      color = LINK_COLOR;
    }

    r.text(this.value, position.x, position.y, font(this.font, color));
  }
}
