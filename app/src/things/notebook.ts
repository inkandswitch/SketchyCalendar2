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
import { ThingMap, buildThingChildrenMap, things } from "things/thingmap";

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
  objCache: Map<string, any>;
  paperChildrenMap: Map<Id<Paper>, Array<PaperInstanceProps>>;
  pageChildrenMap: Map<Id<Page>, Array<PageProps>>;
};

export class Notebook {
  #state: State;

  paperChildrenMap: Map<Id<Paper>, Array<PaperInstanceProps>> = new Map();
  paperInstances: Map<Id<PaperInstance>, PaperInstance> = new Map();

  papers: Map<Id<PaperProps>, Paper> = new Map();

  constructor(docHandle: DocHandle<NotebookProps>) {
    const props = docHandle.doc();

    this.#state = {
      docHandle,
      props,
      objCache: new Map(),
      paperChildrenMap: new Map(),
      pageChildrenMap: new Map(),
    };
    this.rebuild = this.rebuild.bind(this);

    docHandle.addListener("change", this.rebuild);
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

  destroy() {
    this.#state.docHandle.removeListener("change", this.rebuild);
  }

  rebuild() {
    const props = this.#state.docHandle.doc();

    this.#state.props = props;
    this.#state.objCache.clear();
    this.#state.paperChildrenMap = buildThingChildrenMap(props.paperInstances);
    this.#state.pageChildrenMap = buildThingChildrenMap(props.pages);
  }

  createPaper(props: NewPaperInstanceProps): PaperInstance {
    return PaperInstance.create(this.#state, props);
  }

  createPage(props: NewPageProps): Page {
    return Page.create(this.#state, props);
  }

  rootPaper() {
    return PaperInstance.fromId(
      this.#state,
      Object.values(this.#state.props.paperInstances)[0].id
    );
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
