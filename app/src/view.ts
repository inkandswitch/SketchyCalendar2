// Derived intermediate representation that's useful for rendering & interactions

import { AnimateVariable } from "lib/animate";
import Render from "lib/render";

import { Notebook } from "things/notebook";
import { Page } from "things/paper";

// type ScenePage = {
//   id: Id<Page>;
// };

export class View {
  notebook: Notebook;
  zoomView: Array<Array<Page>>;

  // View state
  zoomViewFocus: Array<number>;
  zoomViewOffsets: Array<AnimateVariable>;
  zoomLevel: AnimateVariable;

  constructor(notebook: Notebook) {
    this.notebook = notebook;
    this.zoomView = [[], [], []]; // Layout pages in a tree hierarchy
    this.zoomViewFocus = [0, 0, 0]; // Offsets for each level
    this.zoomViewOffsets = [
      new AnimateVariable(0),
      new AnimateVariable(0),
      new AnimateVariable(0),
      new AnimateVariable(0),
    ]; // Offsets for each level

    this.zoomLevel = new AnimateVariable(0.3, 60, 20);

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
    // Build the zoom view, sort into levels
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

        page.render(r, {
          x: j * (pageWidth + 20) + x_offset,
          y: i * (pageHeight + 20),
        });
      }
    }

    r.endOffset();
  }
}
