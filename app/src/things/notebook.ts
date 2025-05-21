import { Id, generateId } from "id";

import { DocHandle, Repo } from "@automerge/automerge-repo";
import { Stroke, Text, createText } from "things/ink";
import {
  NewPaperInstanceProps,
  PaperProps,
  PaperInstance,
  PaperInstanceProps,
  Paper,
  Page,
  PageProps,
  NewPageProps,
} from "things/paper";
import { ThingMap, buildThingChildrenMap } from "things/thingmap";
import { EventEmitter } from "eventemitter3";

export type NotebookProps = {
  pages: Record<Id<Page>, PageProps>;
  papers: Record<Id<Paper>, PaperProps>;
  paperInstances: Record<Id<PaperInstance>, PaperInstanceProps>;
  strokes: ThingMap<Stroke>;
  texts: ThingMap<Text>;
};

export type State = {
  docHandle: DocHandle<NotebookProps>;
  props: NotebookProps;
  pages: Map<Id<Page>, Page>;
  papers: Map<Id<Paper>, Paper>;
  paperInstances: Map<Id<PaperInstance>, PaperInstance>;
  paperChildrenMap: Map<Id<Paper>, Array<PaperInstanceProps>>;
  pageChildrenMap: Map<Id<Page>, Array<PageProps>>;
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
      pages: new Map(),
      papers: new Map(),
      paperInstances: new Map(),
      paperChildrenMap: new Map(),
      pageChildrenMap: new Map(),
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

    this.#state.pages.clear();
    this.#state.papers.clear();
    this.#state.paperInstances.clear();

    this.#state.paperChildrenMap = buildThingChildrenMap(props.paperInstances);
    this.#state.pageChildrenMap = buildThingChildrenMap(props.pages);

    console.log(this.#state);
  }

  createPaper(props: NewPaperInstanceProps): PaperInstance {
    return PaperInstance.create(this.#state, props);
  }

  createPage(props: NewPageProps): Page {
    return Page.create(this.#state, props);
  }

  get pages() {
    return Array.from(this.#state.pages.values()).map((page) =>
      Page.fromId(this.#state, page.id)
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

// export function createEmptyNotebook(
//   pageWidth: number,
//   pageHeight: number
// ): Notebook {
//   const notebook: N = {
//     pages: {},
//     papers: {},
//     paperInstances: {},
//     strokes: {},
//     texts: {},
//   };

//   // Create root page
//   const rootPageId = addEmptyPageToNotebook(notebook, null, 0);
//   const rootPaperId = notebook.pages[rootPageId].paper;
//   const rootText = createText({
//     parent: rootPaperId,
//     siblingIndex: 0,
//     value: "2024 Calendar",
//     x: 50,
//     y: 50,
//     font: "30px Arial",
//   });
//   notebook.texts[rootText.id] = rootText;

//   // Create pages for each month
//   for (let month = 0; month < 12; month++) {
//     const monthDate = new Date(2024, month, 1);
//     const monthPageId = addEmptyPageToNotebook(notebook, rootPageId, month);
//     const monthPaperId = notebook.pages[monthPageId].paper;

//     const monthText = createText({
//       parent: monthPaperId,
//       siblingIndex: 0,
//       value: monthDate.toLocaleString("default", { month: "long" }),
//       x: 50,
//       y: 50,
//       font: "30px Arial",
//     });
//     notebook.texts[monthText.id] = monthText;

//     const DAY_MONTH_PAPER_SIZE = (pageWidth - 50) / 7;

//     // Create pages for each week
//     const weeksInMonth = getWeeksInMonth(2024, month);
//     for (let week = 0; week < weeksInMonth; week++) {
//       const weekPageId = addEmptyPageToNotebook(notebook, monthPageId, week);
//       const weekPaperId = notebook.pages[weekPageId].paper;
//       addTextToNotebook({
//         notebook,
//         parent: weekPaperId,
//         siblingIndex: 0,
//         value: `Week ${week + 1}`,
//         x: 50,
//         y: 50,
//         font: "30px Arial",
//       });

//       // Create pages for each day in the week
//       const startDay = week * 7 + 1;
//       const endDay = Math.min(startDay + 6, getDaysInMonth(2024, month));

//       for (let day = startDay; day <= endDay; day++) {
//         const dayDate = new Date(2024, month, day);
//         const dayPageId = addEmptyPageToNotebook(
//           notebook,
//           weekPageId,
//           day - startDay
//         );

//         const dayPaperId = notebook.pages[dayPageId].paper;
//         addTextToNotebook({
//           notebook,
//           parent: dayPaperId,
//           siblingIndex: 0,
//           value: dayDate.toLocaleString("default", {
//             month: "long",
//             day: "numeric",
//           }),
//           x: 50,
//           y: 50,
//           font: "30px Arial",
//         });

//         const monthDayPaperId = addEmptyPaperToNotebook({
//           notebook,
//           parent: dayPaperId,
//           x: 50,
//           y: 100,
//           width: DAY_MONTH_PAPER_SIZE,
//           height: DAY_MONTH_PAPER_SIZE,
//           siblingIndex: 0,
//         });

//         addTextToNotebook({
//           notebook,
//           parent: monthDayPaperId,
//           siblingIndex: 0,
//           value: "Hello",
//           x: 50,
//           y: 50,
//           font: "30px Arial",
//         });

//         // addPaperInstanceToNotebook({
//         //   notebook,
//         //   paperId: monthDayPaper.id,
//         //   parentId: dayPaperId,
//         //   x: 50,
//         //   y: 100,
//         //   siblingIndex: 0,
//         // });
//       }
//     }
//   }

//   return notebook;
// }

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
