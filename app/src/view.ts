// Derived intermediate representation that's useful for rendering & interactions

import { AnimateVariable } from "lib/animate";
import Render, { stroke } from "lib/render";

import { Point } from "lib/point";
import { Vec } from "lib/vec";
import { Notebook } from "things/notebook";
import { Page } from "things/page";

const GAP = 20;

export class View {
  notebook: Notebook;

  currentPage: Page | null = null;

  zoom: AnimateVariable = new AnimateVariable(1); // between zero and one
  focusedLevel = new AnimateVariable(0); // focus on week
  offsetByLevel: AnimateVariable[] = [];

  pagesByLevel: Array<Array<Page>>;

  constructor(notebook: Notebook) {
    this.notebook = notebook;
    this.pagesByLevel = [];

    this.notebook.on("changed", this.#onNotebookChanged);
    this.rebuild();
  }

  destroy() {
    this.notebook.off("changed", this.#onNotebookChanged);
  }

  #onNotebookChanged = () => {
    this.rebuild();
  };

  focusPage(page: Page) {
    for (let level = 0; level < this.pagesByLevel.length; level++) {
      const pagesAtLevel = this.pagesByLevel[level];

      for (let offset = 0; offset < pagesAtLevel.length; offset++) {
        const pageAtLevel = pagesAtLevel[offset];
        if (pageAtLevel.id === page.id) {
          this.focusedLevel.target = level;
          this.offsetByLevel[level].target = offset;
          this.updateCurrentPage();
          return;
        }
      }
    }
  }

  zoomIn() {
    this.zoom.target = 1;
  }

  zoomOut() {
    this.zoom.target = 2;
  }

  pageAbove(): Page | null {
    const levelAbove = this.focusedLevel.target - 1;

    if (levelAbove < 0) {
      return null;
    }

    return this.pagesByLevel[levelAbove][this.offsetByLevel[levelAbove].target];
  }

  pageBelow() {
    const levelBelow = this.focusedLevel.target + 1;

    if (levelBelow >= this.pagesByLevel.length) {
      return null;
    }

    return this.pagesByLevel[levelBelow][this.offsetByLevel[levelBelow].target];
  }

  pageToLeft() {
    const offsetToLeft =
      this.offsetByLevel[this.focusedLevel.target].target - 1;

    if (offsetToLeft < 0) {
      return null;
    }

    return this.pagesByLevel[this.focusedLevel.target][offsetToLeft];
  }

  pageToRight() {
    const offsetToRight =
      this.offsetByLevel[this.focusedLevel.target].target + 1;

    if (offsetToRight >= this.pagesByLevel[this.focusedLevel.target].length) {
      return null;
    }

    return this.pagesByLevel[this.focusedLevel.target][offsetToRight];
  }

  rebuild() {
    // --- Zoomed out view
    // // Build the zoom view, sort into levels
    this.pagesByLevel = [];
    let currentLevel = this.notebook.rootPages;

    while (currentLevel.length > 0) {
      this.pagesByLevel.push(currentLevel);
      const nextLevel = [];
      for (const page of currentLevel) {
        nextLevel.push(...page.children);
      }
      currentLevel = nextLevel;
    }

    // ensure we have a offsetByLevel variable for each level
    const totalLevels = this.pagesByLevel.length;
    if (this.offsetByLevel.length < totalLevels) {
      const missingLevels = totalLevels - this.offsetByLevel.length;

      for (let i = 0; i < missingLevels; i++) {
        this.offsetByLevel.push(new AnimateVariable(0));
        console.log("adding offsetByLevel", i);
      }
    } else {
      this.offsetByLevel = this.offsetByLevel.slice(0, totalLevels);
    }

    this.updateCurrentPage();
  }

  update(dt: number) {
    // --- Zoomed out view
    this.zoom.update(dt);
    this.focusedLevel.update(dt);
    for (const a of this.offsetByLevel) {
      a.update(dt);
    }
  }

  navigateVertical(dx: number) {
    this.focusedLevel.target += dx;
    if (this.focusedLevel.target < 0) {
      this.focusedLevel.target = 0;
    }
    if (this.focusedLevel.target >= this.pagesByLevel.length) {
      this.focusedLevel.target = this.pagesByLevel.length - 1;
    }

    this.updateCurrentPage();
  }

  zoomTo(dx: number, dy: number) {
    // // make sure we don't zoom to a position that doesn't exist
    // const newFocus = this.zoomHierarchyFocus.target + dx;
    // const currentOffset = this.zoomHierarchyOffsets[newFocus]?.target;

    // if (!currentOffset) {
    //   return;
    // }

    // const newOffset = currentOffset + dy;

    // if (
    //   newOffset < 0 ||
    //   newOffset >= this.zoomView[newFocus].length ||
    //   newFocus < 0 ||
    //   newFocus >= this.zoomView.length
    // ) {
    //   return;
    // }

    // if the position exists, set the target to it
    this.zoom.target = 1;
    this.navigateHorizontal(dx, dy);
    this.navigateVertical(dy);
  }

  navigateHorizontal(dx: number, laneOffset: number) {
    // ignore lane offset if all the way zoomed in
    if (this.zoom.value > 0.99) {
      laneOffset = 0;
    }

    const target = this.focusedLevel.target + laneOffset;
    const swipedLevel = this.offsetByLevel[target];

    // ensure swiped level is in bounds
    swipedLevel.target += dx;
    if (swipedLevel.target < 0) {
      swipedLevel.target = 0;
      return;
    }

    if (swipedLevel.target >= this.pagesByLevel[target].length) {
      swipedLevel.target = this.pagesByLevel[target].length - 1;
      return;
    }

    this.propagateOffsetAtLevel(target);

    this.updateCurrentPage();
  }

  propagateOffsetAtLevel(level: number, instant: boolean = false) {
    return;
    // progpagate swiped level to all levels below

    const target = this.offsetByLevel[level].target;
    let targetParentPage = this.pagesByLevel[level][target];

    for (let i = level + 1; i < this.pagesByLevel.length; i++) {
      const offsetAtLevelVariable = this.offsetByLevel[i];
      const offsetAtLevel = offsetAtLevelVariable.target;
      const pagesAtLevel = this.pagesByLevel[i];
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
    targetParentPage = this.pagesByLevel[level][target].parent!;

    if (targetParentPage) {
      for (let i = level - 1; i > 0; i--) {
        const offsetAtLevelVariable = this.offsetByLevel[i];
        const offsetAtLevel = offsetAtLevelVariable.target;
        const pagesAtLevel = this.pagesByLevel[i];
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
    const currentLevel = this.offsetByLevel[this.focusedLevel.target];
    this.currentPage =
      this.pagesByLevel[this.focusedLevel.target][currentLevel.target];
  }

  isZoomedIn() {
    return this.zoom.value > 0.99;
  }

  getPageAtPosition(point: Point) {
    const zoom = this.zoom.value * 0.7 + 0.3;
    const scaledPoint = Vec.div(point, zoom);

    const relativeLevel =
      Math.floor(scaledPoint.y / (window.innerHeight + GAP)) - 1;
    const level = relativeLevel + this.focusedLevel.target;

    if (level < 0 || level >= this.pagesByLevel.length) {
      return null;
    }

    const relativeOffset =
      Math.floor(scaledPoint.x / (window.innerWidth + GAP)) - 1;

    const offset = relativeOffset + this.offsetByLevel[level].target;

    return this.pagesByLevel[level][offset];
  }

  render(r: Render) {
    const innerWidth = window.innerWidth;
    const innerHeight = window.innerHeight;

    let zoom = this.zoom.value * 0.7 + 0.3;
    let offset_y = this.focusedLevel.value * (innerHeight + GAP);

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
      this.focusedLevel.isCloseEnough() &&
      this.offsetByLevel.every((a) => a.isCloseEnough());

    if (renderStablePage) {
      const currentLevel = this.focusedLevel.target;

      this.currentPage?.render(r, {
        x: 0,
        y: currentLevel * (innerHeight + GAP),
      });
    } else {
      for (let i = 0; i < this.pagesByLevel.length; i++) {
        const level = this.pagesByLevel[i];
        const x_offset = -this.offsetByLevel[i].value;
        const page_offset = Math.round(this.offsetByLevel[i].value);
        for (let j = -2; j < 3; j++) {
          const o = page_offset + j;
          const page = level[o];
          if (page) {
            const x = o * (innerWidth + GAP) + x_offset * (innerWidth + GAP);
            const y = i * (innerHeight + GAP);

            page.render(r, {
              x,
              y,
            });

            if (i == this.focusedLevel.target && j == 0 && !this.isZoomedIn()) {
              r.rect(
                x,
                y,
                page.paper.width,
                page.paper.height,
                stroke("#0074D9", 4)
              );
            }
          }
        }
      }
    }

    r.endOffset();
  }
}
