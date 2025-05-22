import { Background } from "./paper";

import { generateId, Id } from "id";
import { Paper } from "./paper";
import { State } from "./notebook";
import Render from "lib/render";
import { Point } from "lib/point";

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
  siblingIndex: number;

  constructor(state: State, props: PageProps, children: Array<Page>) {
    this.#state = state;
    this.id = props.id;
    this.siblingIndex = props.siblingIndex;
    this.paper = Paper.fromId(state, props.paperId);
    this.children = children;
  }

  addChildPage(props: Omit<NewPageProps, "parentId">): Page {
    return Page.create(this.#state, {
      ...props,
      parentId: this.id,
    });
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

  render(r: Render, offset: Point) {
    this.paper.render(r, offset);
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

    state.docHandle.change((state) => {
      state.pages[page.id] = {
        id: page.id,
        paperId: paper.id,
        parentId: props.parentId,
        siblingIndex: props.siblingIndex,
      };
    });

    state.objMap.set(page.id, page);
    return page;
  }
}
