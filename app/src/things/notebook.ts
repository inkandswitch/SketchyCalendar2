import { Id, generateId } from "id";

import {
  Paper,
  PaperInstance,
  createPaper,
  createPaperInstance,
} from "things/paper";
import { Stroke, Text, createText } from "things/ink";
import { ThingMap, thingIds, things } from "things/thingmap";

export type Notebook = {
  pages: ThingMap<Page>;
  papers: ThingMap<Paper>;
  paperInstances: ThingMap<PaperInstance>;
  strokes: ThingMap<Stroke>;
  texts: ThingMap<Text>;
};

export type Page = {
  id: Id<Page>;
  paper: Id<Paper>;
  parent: Id<Page> | null; // Pages with null as a parent are at the root of the notebook
  siblingIndex: number; // Useful for ordering siblings
};
export function createEmptyNotebook(): Notebook {
  const notebook: Notebook = {
    pages: {},
    papers: {},
    paperInstances: {},
    strokes: {},
    texts: {},
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Create root page
  const rootPageId = addEmptyPageToNotebook(notebook, null, 0);
  const rootPaperId = notebook.pages[rootPageId].paper;
  const rootText = createText({
    parent: rootPaperId,
    siblingIndex: 0,
    value: "2024 Calendar",
    x: 50,
    y: 50,
    font: "30px Arial",
  });
  notebook.texts[rootText.id] = rootText;

  // Create pages for each month
  for (let month = 0; month < 12; month++) {
    const monthPageId = addEmptyPageToNotebook(notebook, rootPageId, month);
    const monthPaperId = notebook.pages[monthPageId].paper;

    const monthText = createText({
      parent: monthPaperId,
      siblingIndex: 0,
      value: monthNames[month],
      x: 50,
      y: 50,
      font: "30px Arial",
    });
    notebook.texts[monthText.id] = monthText;

    // Create pages for each week
    const weeksInMonth = getWeeksInMonth(2024, month); // Using 2024 as default year
    for (let week = 0; week < weeksInMonth; week++) {
      const weekPageId = addEmptyPageToNotebook(notebook, monthPageId, week);
      const weekPaperId = notebook.pages[weekPageId].paper;
      const weekText = createText({
        parent: weekPaperId,
        siblingIndex: 0,
        value: `Week ${week + 1}`,
        x: 50,
        y: 50,
        font: "30px Arial",
      });
      notebook.texts[weekText.id] = weekText;

      // Create pages for each day in the week
      const startDay = week * 7 + 1;
      const endDay = Math.min(startDay + 6, getDaysInMonth(2024, month));

      for (let day = startDay; day <= endDay; day++) {
        const dayPageId = addEmptyPageToNotebook(
          notebook,
          weekPageId,
          day - startDay
        );
        const dayPaperId = notebook.pages[dayPageId].paper;
        const dayText = createText({
          parent: dayPaperId,
          siblingIndex: 0,
          value: `${monthNames[month]} ${day}`,
          x: 50,
          y: 50,
          font: "30px Arial",
        });
        notebook.texts[dayText.id] = dayText;
      }
    }
  }

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

export function createPage(
  paper: Id<Paper>,
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

export function addEmptyPaperToNotebook(
  notebook: Notebook,
  parentId: Id<Paper>,
  x: number,
  y: number,
  width: number,
  height: number,
  siblingIndex: number
) {
  const paper = createPaper(width, height);
  notebook.papers[paper.id] = paper;
  const instance = createPaperInstance(paper.id, parentId, x, y, siblingIndex);
  notebook.paperInstances[instance.id] = instance;
  return instance.id;
}

export function addPaperInstanceToNotebook(
  notebook: Notebook,
  paperId: Id<Paper>,
  parentId: Id<Paper>,
  x: number,
  y: number,
  siblingIndex: number
) {
  const instance = createPaperInstance(paperId, parentId, x, y, siblingIndex);
  notebook.paperInstances[instance.id] = instance;
  return instance.id;
}

export function findNotebookRootPages(notebook: Notebook): Array<Id<Page>> {
  return things(notebook.pages)
    .filter((page) => {
      return page.parent == null;
    })
    .sort((a, b) => a.siblingIndex - b.siblingIndex)
    .map((p) => p.id);
}
