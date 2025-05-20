import { Id, generateId } from "id";

export type Paper = {
  id: Id<Paper>;
  width: number;
  height: number;
  background: null | string | Id<Paper> | CalendarBackground;
};

export type CalendarBackground = {
  type: "Calendar";
};

export type PaperInstance = {
  id: Id<PaperInstance>;
  paper: Id<Paper>;
  parent: Id<Paper>;
  siblingIndex: number;
  x: number;
  y: number;
};

export function createPaper(width: number, height: number) {
  return {
    id: generateId<Paper>(),
    width,
    height,
    background: null,
  };
}

export function createPaperInstance(
  paper: Id<Paper>,
  parent: Id<Paper>,
  x: number,
  y: number,
  siblingIndex: number
) {
  return {
    id: generateId<PaperInstance>(),
    paper,
    parent,
    x,
    y,
    siblingIndex,
  };
}
