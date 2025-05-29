// Derived intermediate representation that's useful for rendering & interactions

import { AnimateVariable } from "lib/animate";
import Render, { stroke } from "lib/render";

import { Point } from "lib/point";
import { Vec } from "lib/vec";
import { NotebookCollection } from "things/notebook";
import { Page } from "things/page";
import { hideSettingsLink, showSettingsLink } from "settings";

const GAP = 20;

type TransitionConfig = {
  noAnimation?: boolean;
};

export class View {
  notebookCollection: NotebookCollection;

  focusedPage: Page | null = null;

  zoom: AnimateVariable = new AnimateVariable(1); // between zero and one
  focusedLevel = new AnimateVariable(0); // focus on week
  offsetByLevel: AnimateVariable[] = [];

  pagesByLevel: Array<Array<Page>>;

  constructor(notebook: NotebookCollection) {
    this.notebookCollection = notebook;
    this.pagesByLevel = [];

    this.notebookCollection.on("changed", this.#onNotebookChanged);
    this.rebuild();
  }

  destroy() {
    this.notebookCollection.off("changed", this.#onNotebookChanged);
  }

  #onNotebookChanged = () => {
    this.rebuild();
  };

  isZoomedIn() {
    return this.zoom.value > 0.99;
  }

  zoomIn() {
    this.zoom.target = 1;
  }

  zoomOut() {
    this.zoom.target = 2;
  }

  focusPage(page: Page, config: TransitionConfig = {}) {
    const location = this.getPageLocation(page);
    if (!location) {
      console.error("page not found in hierarchy", page);
      return;
    }

    const offsetVariableAtFocusedLevel = this.offsetByLevel[location.level];

    if (config.noAnimation) {
      this.focusedLevel.value = location.level;
      offsetVariableAtFocusedLevel.value = location.offset;
    }

    this.focusedLevel.target = location.level;
    offsetVariableAtFocusedLevel.target = location.offset;

    this.updateCurrentPage(config);
  }

  getPageLocation(page: Page): { level: number; offset: number } | null {
    for (let level = 0; level < this.pagesByLevel.length; level++) {
      const pagesAtLevel = this.pagesByLevel[level];

      for (let offset = 0; offset < pagesAtLevel.length; offset++) {
        const pageAtLevel = pagesAtLevel[offset];
        if (pageAtLevel.id === page.id) {
          return { level, offset };
        }
      }
    }

    return null;
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

  rebuild() {
    // --- Zoomed out view
    // // Build the zoom view, sort into levels
    this.pagesByLevel = [];
    let currentLevel = this.notebookCollection.rootPages;

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
      }
    } else {
      this.offsetByLevel = this.offsetByLevel.slice(0, totalLevels);
    }

    this.updateCurrentPage();
  }

  updateCurrentPage(config: TransitionConfig = {}) {
    const focusedLevel = this.focusedLevel.target;
    const focusedLevelOffset = this.offsetByLevel[focusedLevel].target;
    const focusedPage = (this.focusedPage =
      this.pagesByLevel[focusedLevel][focusedLevelOffset]);

    // progpagate swiped level to all levels below
    const hasPageChildren = focusedPage.children.length > 0;

    // propagate focus to all levels below
    if (hasPageChildren) {
      let targetParentPage = focusedPage;

      for (let i = focusedLevel + 1; i < this.pagesByLevel.length; i++) {
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

          if (index === -1) {
            break;
          }

          targetParentPage = pagesAtLevel[index];

          if (config.noAnimation) {
            offsetAtLevelVariable.value = index;
          }

          offsetAtLevelVariable.target = index;
        }
      }
    }

    // propagate swiped level to all levels above
    let targetParentPage = focusedPage.parent!;

    if (targetParentPage) {
      for (let i = focusedLevel - 1; i > 0; i--) {
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
            break;
          }

          targetParentPage = pagesAtLevel[index].parent!;
          if (config.noAnimation) {
            offsetAtLevelVariable.value = index;
          }
          offsetAtLevelVariable.target = index;
        }
      }
    }
  }

  update(dt: number) {
    // --- Zoomed out view
    this.zoom.update(dt);
    this.focusedLevel.update(dt);
    for (const a of this.offsetByLevel) {
      a.update(dt);
    }
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

    // Show settings link on root page

    if (this.focusedPage?.template?.type === "year" && this.isZoomedIn()) {
      showSettingsLink(this.focusedPage.notebook);
    } else {
      hideSettingsLink();
    }

    // Render the zoom view
    const renderStablePage =
      this.isZoomedIn() &&
      this.focusedLevel.isCloseEnough() &&
      this.offsetByLevel.every((a) => a.isCloseEnough());

    if (renderStablePage) {
      const currentLevel = this.focusedLevel.target;

      this.focusedPage?.render(
        r,
        {
          x: 0,
          y: currentLevel * (innerHeight + GAP),
        },
        this.notebookCollection
      );
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

            page.render(
              r,
              {
                x,
                y,
              },
              this.notebookCollection
            );

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
