import { Id, generateId } from "id";
import { Paper, PaperProps } from "things/paper";
import { State } from "./notebook";

export type Stroke = {
  id: Id<Stroke>;
  parent: Id<PaperProps>;
  points: Array<{ x: number; y: number }>;
  color: string;
  weight: number;
};
