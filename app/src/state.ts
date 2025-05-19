import { Id, generateId } from "id";

type Page = {
  id: Id<Page>;
  paper: Id<Paper>;
};

type Paper = {
  id: Id<Paper>;
  width: number;
  height: number;
  background: string | Id<Paper> | CalendarBackground;
};

type CalendarBackground = {
  type: "CalendarCard";
};

type PaperInstance = {
  id: Id<PaperInstance>;
  paper: Id<Paper>;
  parent: Id<Paper>;
  x: number;
  y: number;
};

type Stroke = {
  id: Id<Stroke>;
  parent: Id<Paper>;
  points: Array<{ x: number; y: number }>;
  color: string;
  weight: number;
};

type Label = {
  id: Id<Stroke>;
  parent: Id<Paper>;
  value: string;
  x: number;
  y: number;
};
