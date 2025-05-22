// Derived intermediate representation that's useful for rendering & interactions

import { AnimateVariable } from "lib/animate";
import Render, { fill } from "lib/render";

import { Id } from "id";
import { Notebook } from "things/notebook";
import { Page } from "things/page";

export class View {
  notebook: Notebook;

  currentPage: Page | null = null;

  zoomLevel: AnimateVariable = new AnimateVariable(1, 60, 20); // between zero and one
  zoomHierarchyFocus = new AnimateVariable(0, 60, 20);
  zoomHierarchyOffsets = [
    new AnimateVariable(0, 60, 20),
    new AnimateVariable(0, 60, 20),
    new AnimateVariable(0, 60, 20),
    new AnimateVariable(0, 60, 20),
  ];

  zoomView: Array<Array<Page>>;

  // // View state
  // zoomViewFocus: Array<number>;
  // zoomViewOffsets: Array<AnimateVariable>;
  // zoomLevel: AnimateVariable;

  constructor(notebook: Notebook) {
    this.notebook = notebook;
    this.zoomView = [[], [], []]; // Layout pages in a tree hierarchy
    // this.zoomViewFocus = [0, 0, 0]; // Offsets for each level
    // this.zoomViewOffsets = [
    //   new AnimateVariable(0),
    //   new AnimateVariable(0),
    //   new AnimateVariable(0),
    //   new AnimateVariable(0),
    // ]; // Offsets for each level

    this.notebook.on("changed", this.#onNotebookChanged);
    this.rebuild();
  }

  destroy() {
    this.notebook.off("changed", this.#onNotebookChanged);
  }

  #onNotebookChanged = () => {
    this.rebuild();
  };

  rebuild() {
    // --- Zoomed out view
    // // Build the zoom view, sort into levels
    this.zoomView = [];
    let currentLevel = this.notebook.rootPages;
    while (currentLevel.length > 0) {
      this.zoomView.push(currentLevel);
      const nextLevel = [];
      for (const page of currentLevel) {
        nextLevel.push(...page.children);
      }
      currentLevel = nextLevel;
    }

    this.updateCurrentPage();
  }

  update(dt: number) {
    // --- Zoomed out view
    this.zoomLevel.update(dt);
    this.zoomHierarchyFocus.update(dt);
    for (const a of this.zoomHierarchyOffsets) {
      a.update(dt);
    }
  }

  navigateVertical(dx: number) {
    this.zoomHierarchyFocus.target += dx;
    if (this.zoomHierarchyFocus.target < 0) {
      this.zoomHierarchyFocus.target = 0;
    }
    if (this.zoomHierarchyFocus.target >= this.zoomView.length) {
      this.zoomHierarchyFocus.target = this.zoomView.length - 1;
    }

    this.updateCurrentPage();
  }

  navigateHorizontal(dx: number) {
    const currentLevel =
      this.zoomHierarchyOffsets[this.zoomHierarchyFocus.target];

    currentLevel.target += dx;
    if (currentLevel.target < 0) {
      currentLevel.target = 0;
    }
    if (
      currentLevel.target >=
      this.zoomView[this.zoomHierarchyFocus.target].length
    ) {
      currentLevel.target =
        this.zoomView[this.zoomHierarchyFocus.target].length - 1;
    }

    this.updateCurrentPage();
    console.log(this.zoomHierarchyOffsets);
  }

  updateCurrentPage() {
    const currentLevel =
      this.zoomHierarchyOffsets[this.zoomHierarchyFocus.target];
    this.currentPage =
      this.zoomView[this.zoomHierarchyFocus.target][currentLevel.target];
  }

  render(r: Render) {
    const innerWidth = window.innerWidth;
    const innerHeight = window.innerHeight;

    let zoom = this.zoomLevel.getCurrent() * 0.7 + 0.3;
    let offset_y = this.zoomHierarchyFocus.getCurrent() * (innerHeight + 20);

    const center_x = innerWidth / 2;
    const center_y = offset_y + innerHeight / 2;

    r.beginOffset({
      position: {
        x: -center_x + innerWidth / 2 / zoom,
        y: -center_y + innerHeight / 2 / zoom,
      },
      zoom,
    });

    //const currentLevel = this.zoomHierarchyFocus.target;

    // Render the zoom view
    if (this.zoomLevel.getCurrent() > 0.99) {
      const currentLevel = this.zoomHierarchyFocus.target;

      this.currentPage?.render(r, {
        x: 0,
        y: currentLevel * (innerHeight + 20),
      });
    } else {
      for (let i = 0; i < this.zoomView.length; i++) {
        const level = this.zoomView[i];
        const x_offset = -this.zoomHierarchyOffsets[i].getCurrent();
        const page_offset = this.zoomHierarchyOffsets[i].target;
        for (let j = -2; j < 3; j++) {
          const o = page_offset + j;
          const page = level[o];
          if (page) {
            page.render(r, {
              x: o * (innerWidth + 20) + x_offset * (innerWidth + 20),
              y: i * (innerHeight + 20),
            });
          }
        }
      }
    }

    r.endOffset();
  }
}
