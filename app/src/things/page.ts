import { Background } from "./paper";

import { generateId, Id } from "id";
import { Paper } from "./paper";
import { NotebookCollection, State } from "./notebook";
import Render, { fillAndStroke, font } from "lib/render";
import { Point } from "lib/point";
import { PaperInstance } from "./paperinstance";
import { Rect } from "lib/rect";
import { Vec } from "lib/vec";
import { Stroke } from "./ink";

export type Template =
  | { type: "day"; date: string }
  | { type: "month"; date: string }
  | { type: "week"; date: string }
  | { type: "year"; date: string };

export type PageProps = {
  id: Id<Page>;
  template?: Template;
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
  template?: Template;
};

export type PageLayout = {
  paperInstances: Record<Id<PaperInstance>, Rect>;
  strokes: Record<Id<Stroke>, Rect>;
};

export class Page {
  #state: State;

  id: Id<Page>;
  paper: Paper;
  parent?: Page;
  children: Array<Page>;
  siblingIndex: number;
  template?: Template;

  constructor(state: State, props: PageProps, children: Array<Page>) {
    this.#state = state;
    this.id = props.id;
    this.siblingIndex = props.siblingIndex;
    this.paper = Paper.fromId(state, props.paperId);
    this.children = children;
    this.template = props.template;
  }

  addChildPage(props: Omit<NewPageProps, "parentId">): Page {
    return Page.create(this.#state, {
      ...props,
      parentId: this.id,
    });
  }

  get notebook() {
    return this.#state.notebook;
  }

  static fromId(state: State, id: Id<Page>): Page {
    const cached = state.objMap.get(id) as Page | undefined;
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

    state.objMap.set(props.id, page);
    return page;
  }

  render(
    r: Render,
    offset: Point,
    notebookCollection: NotebookCollection,
    isBackground: boolean = false
  ) {
    let matchingPages: Array<Page> = [];

    r.rect(
      offset.x,
      offset.y,
      this.paper.width,
      this.paper.height,
      fillAndStroke("white", "#999", 1)
    );

    // EXPERIMENT
    // render matching pages as background
    if (this.template && !isBackground) {
      matchingPages = notebookCollection.getMatchingPages(this);

      for (const page of matchingPages) {
        page.render(r, offset, notebookCollection, true);
      }
    }

    this.paper.render(r, offset, {
      isBackground,
    });
  }

  toDebugString() {
    return this.paper.texts.map((t) => t.value).join(" ");
  }

  static create(state: State, props: NewPageProps): Page {
    const paper = Paper.create(state, {
      id: generateId<Paper>(),
      width: props.width,
      height: props.height,
      background: props.background,
    });

    const pageProps: PageProps = {
      id: generateId<Page>(),
      paperId: paper.id,
      parentId: props.parentId,
      siblingIndex: props.siblingIndex,
    };

    if (props.template) {
      pageProps.template = props.template;
    }

    const page = new Page(state, pageProps, []);

    state.docHandle.change((state) => {
      state.pages[page.id] = pageProps;
    });

    state.objMap.set(page.id, page);
    return page;
  }

  cachedLayout: PageLayout | null = null;
  // Just walk the graph so we can gather all paper instances
  getLayout(): PageLayout {
    if (this.cachedLayout) {
      return this.cachedLayout;
    }

    const paperInstances: Record<Id<PaperInstance>, Rect> = {};
    const strokes: Record<Id<Stroke>, Rect> = {};

    function getRectForInstance(instance: PaperInstance, offset: Point) {
      const rect = instance.getRect(offset);
      paperInstances[instance.id] = rect;

      for (const child of instance.paper.children) {
        getRectForInstance(child, Vec.add(instance, offset));
      }

      for (const stroke of instance.paper.strokes) {
        const strokeRect = stroke.getRect(Vec.add(instance, offset));
        strokes[stroke.props.id] = strokeRect;
      }
    }
    // Recursively gather all paper instances in this page and its children
    for (const instance of this.paper.children) {
      getRectForInstance(instance, { x: 0, y: 0 });
    }

    for (const stroke of this.paper.strokes) {
      const strokeRect = stroke.getRect({ x: 0, y: 0 });
      strokes[stroke.props.id] = strokeRect;
    }

    this.cachedLayout = { paperInstances, strokes };
    return this.cachedLayout;
  }

  getPaperInstanceAtPosition(position: Point): PaperInstance | null {
    for (const instance of this.paper.children) {
      const found = instance.getPaperInstanceAtPosition(position);
      if (found) {
        return found;
      }
    }
    return null;
  }
}
