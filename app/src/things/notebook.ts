import { Id, generateId } from "id";

import { DocHandle, Repo } from "@automerge/automerge-repo";
import { Stroke, Text, createText } from "things/ink";
import {
  NewPaperInstanceProps,
  PaperProps,
  PaperInstance,
  PaperInstanceProps,
  Paper,
} from "things/paper";
import { ThingMap, buildThingChildrenMap, things } from "things/thingmap";
import { Page, PageProps } from "./page";

export type NotebookProps = {
  pages: ThingMap<Page>;
  papers: ThingMap<PaperProps>;
  paperInstances: Record<Id<PaperInstance>, PaperInstanceProps>;
  strokes: ThingMap<Stroke>;
  texts: ThingMap<Text>;
};

export type State = {
  docHandle: DocHandle<NotebookProps>;
  props: NotebookProps;
  objCache: Map<string, any>;
  paperChildrenMap: Map<Id<Paper>, Array<PaperInstanceProps>>;
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
    this.#state.paperChildrenMap = buildThingChildrenMap(props.paperInstances);
  }

  createPaper(props: NewPaperInstanceProps): PaperInstance {
    return PaperInstance.create(this.#state, props);
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

export function createPage(
  paper: Id<PaperProps>,
  parent: Id<Page> | null,
  siblingIndex: number
): Page {
  return {
    id: generateId<Page>(),
    paper,
    parent,
    siblingIndex,
  };
}

export function addEmptyPageToNotebook(
  notebook: Notebook,
  parentId: Id<Page> | null,
  siblingIndex: number
): Id<Page> {
  const paper = createPaper(window.innerWidth, window.innerHeight);
  notebook.papers[paper.id] = paper;
  const page = createPage(paper.id, parentId, siblingIndex);
  notebook.pages[page.id] = page;
  return page.id;
}

export function addEmptyPaperToNotebook({
  notebook,
  parent,
  x,
  y,
  width,
  height,
  siblingIndex,
}: {
  notebook: Notebook;
  parent: Id<PaperProps>;
  x: number;
  y: number;
  width: number;
  height: number;
  siblingIndex: number;
}) {
  const paper = createPaper(width, height);
  notebook.papers[paper.id] = paper;
  const instance = createPaperInstance(paper.id, parent, x, y, siblingIndex);
  notebook.paperInstances[instance.id] = instance;
  return instance.id;
}

export function addPaperInstanceToNotebook({
  notebook,
  paperId,
  parentId,
  x,
  y,
  siblingIndex,
}: {
  notebook: Notebook;
  paperId: Id<PaperProps>;
  parentId: Id<PaperProps>;
  x: number;
  y: number;
  siblingIndex: number;
}): Id<PaperInstanceProps> {
  const instance = createPaperInstance(paperId, parentId, x, y, siblingIndex);
  notebook.paperInstances[instance.id] = instance;
  return instance.id;
}

export function addTextToNotebook({
  notebook,
  parent,
  siblingIndex,
  value,
  x,
  y,
  font,
  color,
}: {
  notebook: Notebook;
  parent: Id<PaperProps>;
  siblingIndex: number;
  value: string;
  x: number;
  y: number;
  font?: string;
  color?: string;
}): Id<Text> {
  const text = createText({
    parent,
    siblingIndex,
    value,
    x,
    y,
    font,
    color,
  });
  notebook.texts[text.id] = text;
  return text.id;
}

export function findNotebookRootPages(notebook: Notebook): Array<Id<Page>> {
  return things(notebook.pages)
    .filter((page) => {
      return page.parent == null;
    })
    .sort((a, b) => a.siblingIndex - b.siblingIndex)
    .map((p) => p.id);
}
