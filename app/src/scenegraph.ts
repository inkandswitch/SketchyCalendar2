// Derived intermediate representation that's useful for rendering & interactions

import { Id } from "id";
import Render, { fill, fillAndStroke } from "lib/render";
import { findNotebookRootPages, Notebook, Page } from "things/notebook";
import { buildThingChildrenMap } from "things/thingmap";

// type ScenePage = {
//   id: Id<Page>;
// };

export class SceneGraph {
  notebook!: Notebook;
  pageChildrenMap: Map<Id<Page>, Array<Page>>;
  zoomView: Array<Array<Page>>;

  constructor() {
    this.zoomView = [[], [], []]; // Layout pages in a tree hierarchy
    this.pageChildrenMap = new Map();
  }

  rebuild(notebook: Notebook) {
    this.notebook = notebook;
    // Map each page to its children
    this.pageChildrenMap = buildThingChildrenMap(notebook.pages);

    // Build the zoom view, sort into levels
    this.zoomView = [];
    let currentLevel = findNotebookRootPages(notebook);
    while (currentLevel.length > 0) {
      this.zoomView.push(currentLevel.map((pageId) => notebook.pages[pageId]!));
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

  render(r: Render) {
    // Zoom out
    r.beginOffset({
      position: { x: 20, y: 20 },
      zoom: 0.3,
    });

    const pageWidth = window.innerWidth;
    const pageHeight = window.innerHeight;

    // Render the zoom view
    for (let i = 0; i < this.zoomView.length; i++) {
      const level = this.zoomView[i];
      for (let j = 0; j < level.length; j++) {
        const page = level[j];
        //const paper = this.notebook.papers[page.paper];
        r.rect(
          j * (pageWidth + 20),
          i * (pageHeight + 20),
          pageWidth,
          pageHeight,
          fillAndStroke("white", "grey", 1),
        );
      }
    }

    r.endOffset();
  }
}
