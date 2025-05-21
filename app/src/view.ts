// Derived intermediate representation that's useful for rendering & interactions

import { AnimateVariable } from "lib/animate";
import Render from "lib/render";

import { Id } from "id";
import { Notebook } from "things/notebook";
import { Page } from "things/page";

export class View {
  notebook: Notebook;

  currentPageId: Id<Page> | null = null;
  currentPage: Page | null = null;

  zoomLevel: AnimateVariable; // between zero and one

  // zoomView: Array<Array<Page>>;

  // // View state
  // zoomViewFocus: Array<number>;
  // zoomViewOffsets: Array<AnimateVariable>;
  // zoomLevel: AnimateVariable;

  constructor(notebook: Notebook) {
    this.notebook = notebook;
    // this.zoomView = [[], [], []]; // Layout pages in a tree hierarchy
    // this.zoomViewFocus = [0, 0, 0]; // Offsets for each level
    // this.zoomViewOffsets = [
    //   new AnimateVariable(0),
    //   new AnimateVariable(0),
    //   new AnimateVariable(0),
    //   new AnimateVariable(0),
    // ]; // Offsets for each level

    this.zoomLevel = new AnimateVariable(1, 60, 20);

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
    if (this.currentPageId == null) {
      this.currentPage = this.notebook.rootPages[0];
      this.currentPageId = this.currentPage.id;
    } else {
      this.currentPage = this.notebook.getPageById(this.currentPageId);
    }

    // --- Zoomed out view
    // // Build the zoom view, sort into levels
    // this.zoomView = [];
    // let currentLevel = this.notebook.rootPages;
    // while (currentLevel.length > 0) {
    //   this.zoomView.push(currentLevel);
    //   const nextLevel = [];
    //   for (const page of currentLevel) {
    //     nextLevel.push(...page.children);
    //   }
    //   currentLevel = nextLevel;
    // }
    // console.log(this.zoomView);
  }

  update(dt: number) {
    // --- Zoomed out view
    this.zoomLevel.update(dt);
    // for (const a of this.zoomViewOffsets) {
    //   a.update(dt);
    // }
  }

  render(r: Render) {
    let zoom = this.zoomLevel.getCurrent() * 0.7 + 0.3;
    const center_x = window.innerWidth / 2;
    const center_y = window.innerHeight / 2;

    r.beginOffset({
      position: {
        x: -center_x + center_x / zoom,
        y: -center_y + center_y / zoom,
      },
      zoom,
    });
    this.currentPage!.render(r, { x: 0, y: 0 });

    if (zoom < 0.9) {
      this.currentPage?.children.forEach((page, i) => {
        const x_offset = (window.innerWidth + 20) * i;
        const y_offset = window.innerHeight + 20;
        page.render(r, { x: x_offset, y: y_offset });
      });
    }

    r.endOffset();
    // --- Zoomed out view
    // // Zoom out
    // r.beginOffset({
    //   position: { x: 0, y: 0 },
    //   zoom: this.zoomLevel.getCurrent(),
    // });
    // const pageWidth = window.innerWidth;
    // const pageHeight = window.innerHeight;
    // // Render the zoom view
    // for (let i = 0; i < this.zoomView.length; i++) {
    //   const level = this.zoomView[i];
    //   const x_offset = this.zoomViewOffsets[i].getCurrent();
    //   for (let j = 0; j < level.length; j++) {
    //     const page = level[j];
    //     page.render(r, {
    //       x: j * (pageWidth + 20) + x_offset,
    //       y: i * (pageHeight + 20),
    //     });
    //   }
    // }
    // r.endOffset();
  }
}
