import { EventEmitter } from "eventemitter3";

import {
  AutomergeUrl,
  DocHandle,
  DocumentId,
  Repo,
} from "@automerge/automerge-repo";
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
import { isTagBackground, Paper, PaperProps } from "things/paper";
import { Text, TextProps } from "things/text";
import { LinkableId, LinkProps } from "./link";

export type NotebookColor = "blue" | "green" | "red" | "orange" | "purple";

export type NotebookProps = {
  color: NotebookColor;
  pages: Record<Id<Page>, PageProps>;
  papers: Record<Id<Paper>, PaperProps>;
  paperInstances: Record<Id<PaperInstance>, PaperInstanceProps>;
  strokes: Record<Id<Stroke>, StrokeProps>;
  texts: Record<Id<Text>, TextProps>;
  links: Record<LinkableId, LinkProps>;
  calendarDocUrl?: AutomergeUrl;
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
  #activeTagPapers: Paper[] | undefined;

  addNotebook(notebook: Notebook) {
    this.notebooks.add(notebook);
    notebook.addListener("changed", this.#onChange);
    notebook.notebookCollection = this;
    this.#onChange();
  }

  getMatchingPages(page: Page): Array<Page> {
    const template = page.template;
    // don't match year pages
    if (!template || template.type === "year") {
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
    this.#activeTagPapers = undefined;
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

  getPaperInstanceById(id: Id<PaperInstance>): PaperInstance {
    for (const notebook of this.notebooks.values()) {
      if (notebook.hasPaperInstance(id)) {
        return notebook.getPaperInstanceById(id);
      }
    }
    throw new Error(`PaperInstance with id ${id} not found in any notebook.`);
  }

  activeTagPapers(): Array<Paper> {
    if (this.#activeTagPapers) {
      return this.#activeTagPapers;
    }

    this.#activeTagPapers = Array.from(this.notebooks.values()).flatMap(
      (notebook) => notebook.activeTagPapers
    );

    return this.#activeTagPapers;
  }
}

export class Notebook extends EventEmitter<NotebookEvents> {
  #state: State;

  paperChildrenMap: Map<Id<Paper>, Array<PaperInstanceProps>> = new Map();
  paperInstances: Map<Id<PaperInstance>, PaperInstance> = new Map();
  paperIdsWithInstances: Set<Id<Paper>> = new Set();
  notebookCollection?: NotebookCollection;

  constructor(repo: Repo, docHandle: DocHandle<NotebookProps>) {
    super();

    const props = docHandle.doc();

    if (props.calendarDocUrl) {
      repo.find<Calendar>(props.calendarDocUrl).then((calendarDocHandle) => {
        this.#state.googleCalendar = new GoogleCalendar(calendarDocHandle);
      });
    }

    this.#state = {
      notebook: this,
      docHandle,
      props,
      objMap: new Map(),
      paperChildrenMap: new Map(),
      pageChildrenMap: new Map(),
      textChildrenMap: new Map(),
      strokeChildrenMap: new Map(),
      googleCalendar: new GoogleCalendar(),
    };

    docHandle.addListener("change", this.#onChange);
    this.rebuild();
  }

  static create(repo: Repo, color: NotebookColor) {
    const docHandle = repo.create<NotebookProps>({
      pages: {},
      papers: {},
      paperInstances: {},
      strokes: {},
      texts: {},
      links: {},
      color,
    });

    return new Notebook(repo, docHandle);
  }

  setCalendarUrl(url: AutomergeUrl) {
    this.#state.docHandle.change((props) => {
      props.calendarDocUrl = url;
    });
  }

  #onChange = () => {
    this.rebuild();
    this.emit("changed");
  };

  destroy() {
    this.#state.docHandle.removeListener("change", this.#onChange);
  }

  get color(): NotebookColor {
    return this.#state.props.color;
  }

  get googleCalendar(): GoogleCalendar {
    return this.#state.googleCalendar;
  }

  get state(): State {
    return this.#state;
  }

  get calendarDocUrl(): AutomergeUrl | undefined {
    return this.#state.props.calendarDocUrl;
  }

  rebuild() {
    const props = this.#state.docHandle.doc();

    this.#state.props = props;

    this.#state.objMap.clear();

    this.#state.paperChildrenMap = buildThingChildrenMap(props.paperInstances);
    this.#state.pageChildrenMap = buildThingChildrenMap(props.pages);
    this.#state.textChildrenMap = buildThingChildrenMap(props.texts);
    this.#state.strokeChildrenMap = buildThingChildrenMap(props.strokes, false);
    this.paperIdsWithInstances = new Set(
      Array.from(Object.values(props.paperInstances).map((p) => p.paperId))
    );
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

  get papers() {
    return Object.keys(this.#state.props.papers).map((paperId) =>
      Paper.fromId(this.#state, paperId as Id<Paper>)
    );
  }

  // only return papers that have a tag background and are instanced at leas one
  get activeTagPapers(): Array<Paper> {
    return this.papers.filter(
      (paper) =>
        paper.strokes.length > 0 &&
        this.paperIdsWithInstances.has(paper.id) &&
        isTagBackground(paper.background)
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

  hasPaperInstance(id: Id<PaperInstance>): boolean {
    return this.#state.props.paperInstances.hasOwnProperty(id);
  }

  getPaperInstanceById(id: Id<PaperInstance>): PaperInstance {
    return PaperInstance.fromId(this.#state, id);
  }
}
