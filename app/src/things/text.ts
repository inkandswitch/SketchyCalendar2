import { generateId } from "id";
import { Id } from "id";
import { Paper } from "./paper";
import { State } from "./notebook";
import Render from "lib/render";
import { font } from "lib/render";
import { Point } from "lib/point";
import { Vec } from "lib/vec";
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

  static fromId(state: State, id: Id<Text>): Text {
    const props = state.props.texts[id];
    return new Text(state, props);
  }

  static create(state: State, props: NewTextProps): Text {
    const textProps: TextProps = {
      ...props,
      id: generateId<Text>(),
      font: props.font ?? "16px Arial",
      color: props.color ?? "black",
    };

    state.docHandle.change((state) => {
      state.texts[textProps.id] = textProps;
    });

    return new Text(state, textProps);
  }

  render(r: Render, offset: Point) {
    const position = Vec.add(offset, this);

    r.text(this.value, position.x, position.y, font(this.font, this.color));
  }
}
