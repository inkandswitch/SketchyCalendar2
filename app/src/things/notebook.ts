import { Id, generateId } from "id";

import { PaperInstance, Paper, createPaper } from "things/paper";
import { Stroke, Text } from "things/ink";
import { ThingMap, thingIds } from "things/thingmap";

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
  const notebook = {
    pages: {},
    papers: {},
    paperInstances: {},
    strokes: {},
    text: {},
  };
  // Build an example notebook with a few pages
  const a = addEmptyPageToNotebook(notebook, null, 0);
  const aa = addEmptyPageToNotebook(notebook, a, 0);
  const ab = addEmptyPageToNotebook(notebook, a, 1);
  const ac = addEmptyPageToNotebook(notebook, a, 2);
  const b = addEmptyPageToNotebook(notebook, null, 1);
  const ba = addEmptyPageToNotebook(notebook, b, 0);
  const bb = addEmptyPageToNotebook(notebook, b, 1);
  const bc = addEmptyPageToNotebook(notebook, b, 2);
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

export function findNotebookRootPages(notebook: Notebook): Array<Id<Page>> {
  return thingIds(notebook.pages).filter((pageId) => {
    return notebook.pages[pageId]!.parent == null;
  });
}
