import { Id, generateId } from "id";
import { Paper, PaperProps } from "things/paper";
import { State } from "./notebook";

export type StrokeProps = {
  id: Id<StrokeProps>;
  parentId: Id<Paper>;
  points: Array<{ x: number; y: number }>;
  color: string;
  weight: number;
};

export class Stroke {
  #state: State;

  constructor(state: State, props: StrokeProps) {
    this.#state = state;
  }
}
