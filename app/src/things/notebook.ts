import { Id } from "id";
import { DocHandle, Repo } from "@automerge/automerge-repo";
import { ThingMap, buildThingChildrenMap } from "things/thingmap";
import { EventEmitter } from "eventemitter3";
import { NewPaperInstanceProps, PaperInstanceProps } from "./paperinstance";
import { PaperInstance } from "./paperinstance";
import { Paper } from "./paper";
import { NewPageProps, Page, PageProps } from "./page";
import { PaperProps } from "./paper";
import { Stroke } from "./ink";
import { Text, TextProps } from "./text";

export type NotebookProps = {
  pages: Record<Id<Page>, PageProps>;
  papers: Record<Id<Paper>, PaperProps>;
  paperInstances: Record<Id<PaperInstance>, PaperInstanceProps>;
  strokes: ThingMap<Stroke>;
  texts: Record<Id<Text>, TextProps>;
};

export type State = {
  docHandle: DocHandle<NotebookProps>;
  props: NotebookProps;
  objMap: Map<string, any>;
  paperChildrenMap: Map<Id<Paper>, Array<PaperInstanceProps>>;
  pageChildrenMap: Map<Id<Page>, Array<PageProps>>;
  textChildrenMap: Map<Id<Paper>, Array<TextProps>>;
};

type NotebookEvents = {
  changed: () => void;
};

export class Notebook extends EventEmitter<NotebookEvents> {
  #state: State;

  paperChildrenMap: Map<Id<Paper>, Array<PaperInstanceProps>> = new Map();
  paperInstances: Map<Id<PaperInstance>, PaperInstance> = new Map();

  papers: Map<Id<PaperProps>, Paper> = new Map();

  constructor(docHandle: DocHandle<NotebookProps>) {
    super();

    const props = docHandle.doc();

    this.#state = {
      docHandle,
      props,
      objMap: new Map(),
      paperChildrenMap: new Map(),
      pageChildrenMap: new Map(),
      textChildrenMap: new Map(),
    };

    docHandle.addListener("change", this.#onChange);
  }

  static create(repo: Repo) {
    const docHandle = repo.create<NotebookProps>({
      pages: {},
      papers: {},
      paperInstances: {},
      strokes: {},
      texts: {},
    });

    return new Notebook(docHandle);
  }

  #onChange = () => {
    this.emit("changed");
    this.rebuild();
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

    console.log(this.#state);
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

  get rootPages(): Array<Page> {
    return this.pages
      .filter((page) => {
        return page.parent == null;
      })
      .sort((a, b) => a.siblingIndex - b.siblingIndex);
  }
}

export function createCalendarNotebook(
  repo: Repo,
  pageWidth: number,
  pageHeight: number
): Notebook {
  const notebook = Notebook.create(repo);

  // Create root page
  const rootPage = notebook.createPage({
    parentId: null,
    siblingIndex: 0,
    width: pageWidth,
    height: pageHeight,
    background: null,
  });

  // rootPage.addNewText({

  // // Create root text
  // Text.create(notebook.#state, {
  //   parent: rootPage.paper.id,
  //   siblingIndex: 0,
  //   value: "2024 Calendar",
  //   x: 50,
  //   y: 50,
  //   font: "30px Arial",
  // });

  // // Create pages for each month
  // for (let month = 0; month < 12; month++) {
  //   const monthDate = new Date(2024, month, 1);
  //   const monthPage = notebook.createPage({
  //     parentId: rootPage.id,
  //     siblingIndex: month,
  //     width: pageWidth,
  //     height: pageHeight,
  //     background: null,
  //   });

  //   Text.create(notebook.#state, {
  //     parent: monthPage.paper.id,
  //     siblingIndex: 0,
  //     value: monthDate.toLocaleString("default", { month: "long" }),
  //     x: 50,
  //     y: 50,
  //     font: "30px Arial",
  //   });

  //   const DAY_MONTH_PAPER_SIZE = (pageWidth - 50) / 7;

  //   // Create pages for each week
  //   const weeksInMonth = getWeeksInMonth(2024, month);
  //   for (let week = 0; week < weeksInMonth; week++) {
  //     const weekPage = notebook.createPage({
  //       parentId: monthPage.id,
  //       siblingIndex: week,
  //       width: pageWidth,
  //       height: pageHeight,
  //       background: null,
  //     });

  //     Text.create(notebook.#state, {
  //       parent: weekPage.paper.id,
  //       siblingIndex: 0,
  //       value: `Week ${week + 1}`,
  //       x: 50,
  //       y: 50,
  //       font: "30px Arial",
  //     });

  //     // Create pages for each day in the week
  //     const startDay = week * 7 + 1;
  //     const endDay = Math.min(startDay + 6, getDaysInMonth(2024, month));

  //     for (let day = startDay; day <= endDay; day++) {
  //       const dayDate = new Date(2024, month, day);
  //       const dayPage = notebook.createPage({
  //         parentId: weekPage.id,
  //         siblingIndex: day - startDay,
  //         width: pageWidth,
  //         height: pageHeight,
  //         background: null,
  //       });

  //       Text.create(notebook.#state, {
  //         parent: dayPage.paper.id,
  //         siblingIndex: 0,
  //         value: dayDate.toLocaleString("default", {
  //           month: "long",
  //           day: "numeric",
  //         }),
  //         x: 50,
  //         y: 50,
  //         font: "30px Arial",
  //       });

  //       const monthDayPaper = dayPage.paper.addNewPaper({
  //         siblingIndex: 0,
  //         x: 50,
  //         y: 100,
  //         width: DAY_MONTH_PAPER_SIZE,
  //         height: DAY_MONTH_PAPER_SIZE,
  //         background: null,
  //       });

  //       Text.create(notebook.#state, {
  //         parent: monthDayPaper.paper.id,
  //         siblingIndex: 0,
  //         value: "Hello",
  //         x: 50,
  //         y: 50,
  //         font: "30px Arial",
  //       });
  //     }
  //   }
  // }

  return notebook;
}

// Helper functions for calendar calculations

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getWeeksInMonth(year: number, month: number): number {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstWeekday = firstDay.getDay();
  const totalDays = lastDay.getDate();
  return Math.ceil((totalDays + firstWeekday) / 7);
}
