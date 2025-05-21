import { DocHandle } from "@automerge/automerge-repo";
import { Id, generateId } from "id";
import { NotebookProps, State } from "./notebook";
import Render, { fillAndStroke } from "lib/render";
import { Point } from "lib/point";
import { Vec } from "lib/vec";

export type Background = null | string | Id<PaperProps> | CalendarBackground;

export type PaperProps = {
  id: Id<Paper>;
  width: number;
  height: number;
  background: Background;
};

export type CalendarBackground = {
  type: "Calendar";
};

export class Paper {
  #state: State;

  id: Id<Paper>;
  width: number;
  height: number;
  background: Background;

  children: Array<PaperInstance>;

  constructor(state: State, props: PaperProps, children: Array<PaperInstance>) {
    this.#state = state;
    this.id = props.id;
    this.width = props.width;
    this.height = props.height;
    this.background = props.background;
    this.children = children;
  }

  static fromId(state: State, id: Id<Paper>) {
    const cached = state.objCache.get(id) as Paper | undefined;
    if (cached) {
      return cached;
    }

    const children = (state.paperChildrenMap.get(id) ?? []).map((props) =>
      PaperInstance.fromId(state, props.id)
    );

    const props = state.props.papers[id];
    const paper = new Paper(state, props, children);
    state.objCache.set(props.id, paper);
    return paper;
  }

  static create(state: State, props: PaperProps) {
    const paper = new Paper(state, props, []);

    state.docHandle.change((state) => {
      state.papers[props.id] = props;
    });

    state.objCache.set(props.id, paper);
    return paper;
  }

  addNewPaper(props: Omit<NewPaperInstanceProps, "parentId">) {
    const paperInstance = PaperInstance.create(this.#state, {
      parentId: this.id,
      siblingIndex: props.siblingIndex,
      x: props.x,
      y: props.y,
      background: props.background,
      width: props.width,
      height: props.height,
    });

    return paperInstance;
  }

  render(r: Render, position: Point) {
    r.rect(
      position.x,
      position.y,
      this.width,
      this.height,
      fillAndStroke("white", "grey", 1)
    );

    for (const child of this.children) {
      child.render(r, position);
    }
  }
}

export type PaperInstanceProps = {
  id: Id<PaperInstance>;
  paperId: Id<Paper>;
  parentId: Id<Paper>;
  siblingIndex: number;
  x: number;
  y: number;
};

export type NewPaperInstanceProps = {
  parentId: Id<Paper>;
  background: Background;
  siblingIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export class PaperInstance {
  #state: State;

  id: Id<PaperInstance>;
  x: number;
  y: number;

  paper: Paper;

  constructor(state: State, props: PaperInstanceProps, paper: Paper) {
    this.#state = state;

    this.id = props.id;
    this.x = props.x;
    this.y = props.y;
    this.paper = paper;
  }

  static fromId(state: State, id: Id<PaperInstance>): PaperInstance {
    const cached = state.objCache.get(id) as PaperInstance | undefined;
    if (cached) {
      return cached;
    }

    const props = state.props.paperInstances[id];
    const paper = Paper.fromId(state, props.paperId);
    return new PaperInstance(state, props, paper);
  }

  static create(state: State, props: NewPaperInstanceProps): PaperInstance {
    const paper = Paper.create(state, {
      id: generateId<Paper>(),
      width: props.width,
      height: props.height,
      background: props.background,
    });

    const paperInstanceProps: PaperInstanceProps = {
      id: generateId<PaperInstance>(),
      paperId: paper.id,
      parentId: props.parentId,
      siblingIndex: props.siblingIndex,
      x: props.x,
      y: props.y,
    };

    state.docHandle.change((state) => {
      state.paperInstances[paperInstanceProps.id] = paperInstanceProps;
    });

    return new PaperInstance(state, paperInstanceProps, paper);
  }

  addNewPaper(props: Omit<NewPaperInstanceProps, "parentId">) {
    return this.paper.addNewPaper(props);
  }

  render(r: Render, offset: Point) {
    const position = Vec.add(offset, this);

    this.paper.render(r, position);
  }
}

export type PageProps = {
  id: Id<Page>;
  paperId: Id<Paper>;
  parentId: Id<Page> | null; // Pages with null as a parent are at the root of the notebook
  siblingIndex: number; // Useful for ordering siblings
};

export type NewPageProps = {
  parentId: Id<Page> | null;
  siblingIndex: number;
  width: number;
  height: number;
  background: Background;
};

export class Page {
  #state: State;

  id: Id<Page>;
  paper: Paper;
  parent?: Page;
  children: Array<Page>;

  constructor(state: State, props: PageProps, children: Array<Page>) {
    this.#state = state;
    this.id = props.id;
    this.paper = Paper.fromId(state, props.paperId);
    this.children = children;
  }

  static fromId(state: State, id: Id<Page>): Page {
    const cached = state.objCache.get(id) as Page | undefined;
    if (cached) {
      return cached;
    }

    const props = state.props.pages[id];
    const children = (state.pageChildrenMap.get(id) ?? []).map((props) =>
      Page.fromId(state, props.id)
    );

    const page = new Page(state, props, children);
    for (const child of children) {
      child.parent = page;
    }

    state.objCache.set(props.id, page);
    return page;
  }

  render(r: Render, offset: Point) {
    this.paper.render(r, offset);
  }

  static create(state: State, props: NewPageProps): Page {
    const paper = Paper.create(state, {
      id: generateId<Paper>(),
      width: props.width,
      height: props.height,
      background: props.background,
    });

    const page = new Page(
      state,
      {
        id: generateId<Page>(),
        paperId: paper.id,
        parentId: props.parentId,
        siblingIndex: props.siblingIndex,
      },
      []
    );
    return page;
  }
}
