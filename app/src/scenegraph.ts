// Derived intermediate representation that's useful for rendering & interactions

import { Id } from "id";
import { AnimateVariable } from "lib/animate";
import { Point } from "lib/point";
import { Vec } from "lib/vec";
import Render, { fill, fillAndStroke, font } from "lib/render";

import { findNotebookRootPages, Notebook, Page } from "things/notebook";
import { Text } from "things/ink";
import { buildThingChildrenMap } from "things/thingmap";
import { Paper, PaperInstance } from "things/paper";

// type ScenePage = {
//   id: Id<Page>;
// };

export class SceneGraph {
  notebook!: Notebook;
  pageChildrenMap: Map<Id<Page>, Array<Page>>;
  paperChildrenMap: Map<Id<Paper>, Array<PaperInstance>>;
  paperTextsMap: Map<Id<Paper>, Array<Text>>;
  zoomView: Array<Array<Page>>;

  // View state
  zoomViewFocus: Array<number>;
  zoomViewOffsets: Array<AnimateVariable>;
  zoomLevel: AnimateVariable;

  constructor() {
    this.zoomView = [[], [], []]; // Layout pages in a tree hierarchy
    this.zoomViewFocus = [0, 0, 0]; // Offsets for each level
    this.zoomViewOffsets = [
      new AnimateVariable(0),
      new AnimateVariable(0),
      new AnimateVariable(0),
    ]; // Offsets for each level

    this.zoomLevel = new AnimateVariable(1, 60, 20);
    this.pageChildrenMap = new Map();
    this.paperChildrenMap = new Map();
  }

  rebuild(notebook: Notebook) {
    this.notebook = notebook;
    // Map each page to its children
    this.pageChildrenMap = buildThingChildrenMap(notebook.pages);
    this.paperChildrenMap = buildThingChildrenMap(notebook.paperInstances);
    this.paperTextsMap = buildThingChildrenMap(notebook.texts);

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

  update(dt: number) {
    this.zoomLevel.update(dt);
    for (const a of this.zoomViewOffsets) {
      a.update(dt);
    }
  }

  render(r: Render) {
    // Zoom out
    r.beginOffset({
      position: { x: 0, y: 0 },
      zoom: this.zoomLevel.getCurrent(),
    });

    const pageWidth = window.innerWidth;
    const pageHeight = window.innerHeight;

    // Render the zoom view
    for (let i = 0; i < this.zoomView.length; i++) {
      const level = this.zoomView[i];
      const x_offset = this.zoomViewOffsets[i].getCurrent();

      for (let j = 0; j < level.length; j++) {
        const page = level[j];
        const paper = this.notebook.papers[page.paper];
        this.renderPaper(r, paper, {
          x: j * (pageWidth + 20) + x_offset,
          y: i * (pageHeight + 20),
        });
      }
    }

    r.endOffset();
  }

  renderPaper(r: Render, paper: Paper, offset: Point) {
    r.rect(
      offset.x,
      offset.y,
      paper.width,
      paper.height,
      fillAndStroke("white", "grey", 1)
    );

    //  r.text(paper.id, offset.x + 5, offset.y + 32, font("32px Arial", "red"));

    const children_papers = this.paperChildrenMap.get(paper.id);
    if (children_papers) {
      for (const paperInstance of children_papers) {
        const childPaper = this.notebook.papers[paperInstance.paper];
        const childOffset = Vec.add(offset, paperInstance);
        this.renderPaper(r, childPaper, childOffset);
      }
    }

    const children_texts = this.paperTextsMap.get(paper.id);
    if (children_texts) {
      for (const text of children_texts) {
        this.renderText(r, text, offset);
      }
    }
  }

  renderText(r: Render, text: Text, offset: Point) {
    const textOffset = Vec.add(offset, text);
    r.text(text.value, textOffset.x, textOffset.y, font(text.font, text.color));
  }
}
