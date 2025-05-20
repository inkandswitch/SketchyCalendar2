import { Id, generateId } from "id";
import { Paper } from "things/paper";

export type Stroke = {
  id: Id<Stroke>;
  parent: Id<Paper>;
  points: Array<{ x: number; y: number }>;
  color: string;
  weight: number;
};

export type Text = {
  id: Id<Text>;
  parent: Id<Paper>;
  siblingIndex: number;
  value: string;
  x: number;
  y: number;
  font: string;
  color: string;
};

export function createText({
  parent,
  siblingIndex,
  value,
  x,
  y,
  font = "16px Arial",
  color = "black",
}: {
  parent: Id<Paper>;
  siblingIndex: number;
  value: string;
  x: number;
  y: number;
  font?: string;
  color?: string;
}): Text {
  return {
    id: generateId<Text>(),
    parent,
    siblingIndex,
    value,
    x,
    y,
    font,
    color,
  };
}
