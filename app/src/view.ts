// Derived intermediate representation that's useful for rendering & interactions

import { AnimateVariable } from "lib/animate";
import Render, { fill } from "lib/render";

import { Id } from "id";
import { Notebook } from "things/notebook";
import { Page } from "things/page";
import { getWeek } from "date-fns";

export class View {
  notebook: Notebook;

  currentPage: Page | null = null;

  zoomLevel: AnimateVariable = new AnimateVariable(1, 60, 20); // between zero and one
  zoomHierarchyFocus = new AnimateVariable(2, 60, 20); // focus on week
  zoomHierarchyOffsets = [
    new AnimateVariable(0, 60, 20),
    new AnimateVariable(0, 60, 20),
    new AnimateVariable(getWeek(new Date()) - 1, 60, 20),
    new AnimateVariable(0, 60, 20),
  ];

  zoomView: Array<Array<Page>>;

  constructor(notebook: Notebook) {
    this.notebook = notebook;
    this.zoomView = [[], [], []]; // Layout pages in a tree hierarchy

    this.notebook.on("changed", this.#onNotebookChanged);
    this.rebuild();
    this.propagateOffsetAtLevel(2, true);
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

  zoomTo(dx: number, dy: number) {
    this.zoomLevel.setTarget(1);
    this.navigateHorizontal(dx, dy);
    this.navigateVertical(dy);
  }

  navigateHorizontal(dx: number, laneOffset: number) {
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

    this.propagateOffsetAtLevel(target);

    this.updateCurrentPage();
  }

  propagateOffsetAtLevel(level: number, instant: boolean = false) {
    // progpagate swiped level to all levels below

    const target = this.zoomHierarchyOffsets[level].target;
    let targetParentPage = this.zoomView[level][target];

    for (let i = level + 1; i < this.zoomView.length; i++) {
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

        if (instant) {
          offsetAtLevelVariable.value = index;
        } else {
          offsetAtLevelVariable.setTarget(index);
        }
      }
    }

    // propagate swiped level to all levels above
    targetParentPage = this.zoomView[level][target].parent!;

    if (targetParentPage) {
      for (let i = level - 1; i > 0; i--) {
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
          if (instant) {
            offsetAtLevelVariable.value = index;
          } else {
            offsetAtLevelVariable.setTarget(index);
          }
        }
      }
    }
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
    const renderStablePage =
      this.isZoomedIn() &&
      this.zoomHierarchyFocus.isCloseEnough() &&
      this.zoomHierarchyOffsets.every((a) => a.isCloseEnough());

    if (renderStablePage) {
      const currentLevel = this.zoomHierarchyFocus.target;

      this.currentPage?.render(r, {
        x: 0,
        y: currentLevel * (innerHeight + 20),
      });
    } else {
      for (let i = 0; i < this.zoomView.length; i++) {
        const level = this.zoomView[i];
        const x_offset = -this.zoomHierarchyOffsets[i].getCurrent();
        const page_offset = Math.round(
          this.zoomHierarchyOffsets[i].getCurrent()
        );
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
