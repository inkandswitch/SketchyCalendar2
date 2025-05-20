import { DocHandle } from "@automerge/automerge-repo";
import { Id, generateId } from "id";
import { NotebookProps } from "./notebook";
import Render, { fillAndStroke } from "lib/render";
import { Point } from "lib/point";
import { Vec } from "lib/vec";

export type Paper = {
  id: Id<Paper>;
  width: number;
  height: number;
  background: null | string | Id<Paper> | CalendarBackground;
};

export type CalendarBackground = {
  type: "Calendar";
};

export type PaperInstanceProps = {
  id: Id<PaperInstance>;
  paperId: Id<Paper>;
  parentId: Id<Paper>;
  siblingIndex: number;
  x: number;
  y: number;
};

export type NewPaperInstanceProps = Omit<
  PaperInstanceProps,
  "id" | "paperId"
> & {
  background: null | string | Id<Paper> | CalendarBackground;
  width: number;
  height: number;
};

export class PaperInstance {
  id: Id<PaperInstance>;
  children: Array<PaperInstance>;
  #docHandle: DocHandle<NotebookProps>;

  x: number;
  y: number;
  width: number;
  height: number;
  background: null | string | Id<Paper> | CalendarBackground;

  static create(
    docHandle: DocHandle<NotebookProps>,
    props: NewPaperInstanceProps
  ) {
    const paper: Paper = {
      id: generateId<Paper>(),
      width: props.width,
      height: props.height,
      background: props.background,
    };

    const paperInstance: PaperInstanceProps = {
      id: generateId<PaperInstance>(),
      paperId: paper.id,
      parentId: props.parentId,
      siblingIndex: props.siblingIndex,
      x: props.x,
      y: props.y,
    };

    docHandle.change((state) => {
      state.paperInstances[paperInstance.id] = paperInstance;
      state.papers[paper.id] = paper;
    });

    return new PaperInstance(docHandle, paperInstance, paper, []);
  }

  constructor(
    docHandle: DocHandle<NotebookProps>,
    paperInstance: PaperInstanceProps,
    paperProps: Paper,
    children: Array<PaperInstance>
  ) {
    this.#docHandle = docHandle;

    this.id = paperInstance.id;
    this.x = paperInstance.x;
    this.y = paperInstance.y;
    this.width = paperProps.width;
    this.height = paperProps.height;
    this.background = paperProps.background;
    this.children = children;
  }

  render(r: Render, offset: Point) {
    const position = Vec.add(offset, this);

    r.rect(
      position.x,
      position.y,
      this.width,
      this.height,
      fillAndStroke("white", "grey", 1)
    );
  }
}
