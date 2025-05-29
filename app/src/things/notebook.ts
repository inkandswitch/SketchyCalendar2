import { EventEmitter } from "eventemitter3";

import { DocHandle, DocumentId, Repo } from "@automerge/automerge-repo";
import { Id } from "id";
import { buildThingChildrenMap } from "things/thingmap";

import { NewPageProps, Page, PageProps, Template } from "things/page";
import {
  NewPaperInstanceProps,
  PaperInstance,
  PaperInstanceProps,
} from "things/paperinstance";

import { Calendar, GoogleCalendar } from "lib/googlecalendar";
import { Stroke, StrokeProps } from "things/ink";
import { Paper, PaperProps } from "things/paper";
import { Text, TextProps } from "things/text";
import { LinkableId, LinkProps } from "./link";

export type NotebookProps = {
  pages: Record<Id<Page>, PageProps>;
  papers: Record<Id<Paper>, PaperProps>;
  paperInstances: Record<Id<PaperInstance>, PaperInstanceProps>;
  strokes: Record<Id<Stroke>, StrokeProps>;
  texts: Record<Id<Text>, TextProps>;
  links: Record<LinkableId, LinkProps>;
};

export type State = {
  notebook: Notebook;
  docHandle: DocHandle<NotebookProps>;
  props: NotebookProps;
  objMap: Map<string, any>;
  paperChildrenMap: Map<Id<Paper>, Array<PaperInstanceProps>>;
  pageChildrenMap: Map<Id<Page>, Array<PageProps>>;
  textChildrenMap: Map<Id<Paper>, Array<TextProps>>;
  strokeChildrenMap: Map<Id<Paper>, Array<StrokeProps>>;
  googleCalendar: GoogleCalendar;
};

type NotebookEvents = {
  changed: () => void;
};

export class NotebookCollection extends EventEmitter<NotebookEvents> {
  constructor() {
    super();
  }

  notebooks: Set<Notebook> = new Set();

  addNotebook(notebook: Notebook) {
    this.notebooks.add(notebook);
    notebook.addListener("changed", this.#onChange);
    this.#onChange();
  }

  getMatchingPages(page: Page): Array<Page> {
    const template = page.template;
    if (!template) {
      return [];
    }

    return Array.from(this.notebooks.values())
      .flatMap((notebook) => notebook.pages)
      .filter((otherPage) => {
        if (!otherPage.template || otherPage.id === page.id) {
          return false;
        }

        return (
          otherPage.template.type === template.type &&
          otherPage.template.date === template.date
        );
      });
  }

  #onChange = () => {
    this.emit("changed");
  };

  get rootPages(): Array<Page> {
    return Array.from(this.notebooks.values())
      .flatMap((notebook) => notebook.pages)
      .filter((page) => {
        return page.parent == null;
      })
      .sort((a, b) => a.siblingIndex - b.siblingIndex);
  }
}

export class Notebook extends EventEmitter<NotebookEvents> {
  #state: State;

  paperChildrenMap: Map<Id<Paper>, Array<PaperInstanceProps>> = new Map();
  paperInstances: Map<Id<PaperInstance>, PaperInstance> = new Map();

  papers: Map<Id<PaperProps>, Paper> = new Map();

  constructor(
    docHandle: DocHandle<NotebookProps>,
    calendarDocHandle?: DocHandle<Calendar>
  ) {
    super();

    const props = docHandle.doc();

    this.#state = {
      notebook: this,
      docHandle,
      props,
      objMap: new Map(),
      paperChildrenMap: new Map(),
      pageChildrenMap: new Map(),
      textChildrenMap: new Map(),
      strokeChildrenMap: new Map(),
      googleCalendar: new GoogleCalendar(calendarDocHandle),
    };

    docHandle.addListener("change", this.#onChange);
    this.rebuild();
  }

  static create(repo: Repo, calendarDocHandle?: DocHandle<Calendar>) {
    const docHandle = repo.create<NotebookProps>({
      pages: {},
      papers: {},
      paperInstances: {},
      strokes: {},
      texts: {},
      links: {},
    });

    return new Notebook(docHandle, calendarDocHandle);
  }

  #onChange = () => {
    this.rebuild();
    this.emit("changed");
  };

  destroy() {
    this.#state.docHandle.removeListener("change", this.#onChange);
  }

  rebuild() {
    const props = this.#state.docHandle.doc();

    this.#state.props = props;

    this.#state.objMap.clear();

    this.#state.paperChildrenMap = buildThingChildrenMap(props.paperInstances);
    this.#state.pageChildrenMap = buildThingChildrenMap(props.pages);
    this.#state.textChildrenMap = buildThingChildrenMap(props.texts);
    this.#state.strokeChildrenMap = buildThingChildrenMap(props.strokes, false);
  }

  createPaper(props: NewPaperInstanceProps): PaperInstance {
    return PaperInstance.create(this.#state, props);
  }

  createPage(props: NewPageProps): Page {
    return Page.create(this.#state, props);
  }

  get pages() {
    return Object.keys(this.#state.props.pages).map((pageId) =>
      Page.fromId(this.#state, pageId as Id<Page>)
    );
  }

  get documentId(): DocumentId {
    return this.#state.docHandle.documentId;
  }

  getPageById(id: Id<Page>): Page {
    return Page.fromId(this.#state, id);
  }

  getStrokeById(id: Id<Stroke>): Stroke {
    return Stroke.fromId(this.#state, id);
  }

  getPaperInstanceById(id: Id<PaperInstance>): PaperInstance {
    return PaperInstance.fromId(this.#state, id);
  }
}
