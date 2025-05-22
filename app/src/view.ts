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

  navigateHorizontal(dx: number, laneOffset: number) {
    console.log("navigateHorizontal", dx, laneOffset);

    // ignore lane offset if all the way zoomed in
    if (this.zoomLevel.getCurrent() > 0.99) {
      laneOffset = 0;
    }

    const target = this.zoomHierarchyFocus.target + laneOffset;
    const swipedLevel = this.zoomHierarchyOffsets[target];

    // ensure swiped level is in bounds

    swipedLevel.target += dx;
    if (swipedLevel.target < 0) {
      swipedLevel.target = 0;
      return;
    }

    if (swipedLevel.target >= this.zoomView[target].length) {
      swipedLevel.target = this.zoomView[target].length - 1;
      return;
    }

    // progpagate swiped level to all levels below
    let targetParentPage = this.zoomView[target][swipedLevel.target];

    for (let i = target + 1; i < this.zoomView.length; i++) {
      const offsetAtLevelVariable = this.zoomHierarchyOffsets[i];
      const offsetAtLevel = offsetAtLevelVariable.target;
      const pagesAtLevel = this.zoomView[i];
      const currentFocusedPageAtLevel = pagesAtLevel[offsetAtLevel];

      if (currentFocusedPageAtLevel.parent!.id == targetParentPage.id) {
        break;
      } else {
        const index = pagesAtLevel.findIndex(
          (p) => p.parent!.id === targetParentPage.id
        );

        targetParentPage = pagesAtLevel[index];
        offsetAtLevelVariable.setTarget(index);
      }
    }

    // propagate swiped level to all levels above
    targetParentPage = this.zoomView[target][swipedLevel.target].parent!;

    if (targetParentPage) {
      for (let i = target - 1; i > 0; i--) {
        const offsetAtLevelVariable = this.zoomHierarchyOffsets[i];
        const offsetAtLevel = offsetAtLevelVariable.target;
        const pagesAtLevel = this.zoomView[i];
        const currentFocusedPageAtLevel = pagesAtLevel[offsetAtLevel];

        if (currentFocusedPageAtLevel.id == targetParentPage.id) {
          break;
        } else {
          const index = pagesAtLevel.findIndex(
            (p) => p.id === targetParentPage.id
          );

          if (index === -1) {
            console.error("index is -1");
            debugger;
          }

          targetParentPage = pagesAtLevel[index].parent!;
          offsetAtLevelVariable.setTarget(index);
        }
      }
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

  isZoomedIn() {
    return this.zoomLevel.getCurrent() > 0.99;
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
