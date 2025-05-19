// Derived intermediate representation that's useful for rendering & interactions

import { Id } from "id";
import { findNotebookRootPages, Notebook, Page } from "things/notebook";
import { buildThingChildrenMap } from "things/thingmap";

type ScenePage = {
  id: Id<Page>;
};

export class SceneGraph {
  pageChildrenMap: Map<Id<Page>, Array<Page>>;
  zoomView: Array<Array<ScenePage>>;

  constructor() {
    this.zoomView = [[], [], []]; // Layout pages in a tree hierarchy
    this.pageChildrenMap = new Map();
  }

  rebuild(notebook: Notebook) {
    // Map each node to its children
    this.pageChildrenMap = buildThingChildrenMap(notebook.pages);

    // build the zoom view, sort into levels
    this.zoomView = [];
    let currentLevel = findNotebookRootPages(notebook);
    while (currentLevel.length > 0) {
      this.zoomView.push(currentLevel.map((pageId) => ({ id: pageId })));
      const nextLevel = [];
      for (const pageId of currentLevel) {
        const children = this.pageChildrenMap.get(pageId);
        if (children) {
          nextLevel.push(...children.map((page) => page.id));
        }
      }
      currentLevel = nextLevel;
    }

    console.log(notebook.pages);
    console.log(this);
  }
}
