import { Id, generateId } from "id";

import {
  Paper,
  PaperInstance,
  createPaper,
  createPaperInstance,
} from "things/paper";
import { Stroke, Text } from "things/ink";
import { ThingMap, thingIds, things } from "things/thingmap";

export type Notebook = {
  pages: ThingMap<Page>;
  papers: ThingMap<Paper>;
  paperInstances: ThingMap<PaperInstance>;
  strokes: ThingMap<Stroke>;
  text: ThingMap<Text>;
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
    text: {},
  };
  // Build an example notebook with a few pages
  const a = addEmptyPageToNotebook(notebook, null, 0);
  // Add a piece of paper to the first page
  const child_paper = addEmptyPaperToNotebook(
    notebook,
    notebook.pages[a]!.paper,
    100,
    100,
    100,
    100,
    0,
  );
  // Create a page underneath the first page
  const aa = addEmptyPageToNotebook(notebook, a, 0);

  // Add a transcluded paper to the first page
  addPaperInstanceToNotebook(
    notebook,
    notebook.paperInstances[child_paper]!.paper,
    notebook.pages[aa]!.paper,
    200,
    200,
    0,
  );

  const ab = addEmptyPageToNotebook(notebook, a, 1);
  const ac = addEmptyPageToNotebook(notebook, a, 2);
  const b = addEmptyPageToNotebook(notebook, null, 1);
  const ba = addEmptyPageToNotebook(notebook, b, 0);
  const bb = addEmptyPageToNotebook(notebook, b, 1);
  const bc = addEmptyPageToNotebook(notebook, b, 2);
  const baa = addEmptyPageToNotebook(notebook, ba, 0);
  return notebook;
}

export function createPage(
  paper: Id<Paper>,
  parent: Id<Page> | null,
  siblingIndex: number,
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
  siblingIndex: number,
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
  siblingIndex: number,
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
  siblingIndex: number,
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
