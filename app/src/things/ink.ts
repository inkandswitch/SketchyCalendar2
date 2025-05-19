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
  id: Id<Stroke>;
  parent: Id<Paper>;
  value: string;
  x: number;
  y: number;
};
