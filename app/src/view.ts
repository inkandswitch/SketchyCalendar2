// Derived intermediate representation that's useful for rendering & interactions

import { AnimateVariable } from "lib/animate";
import Render, { stroke } from "lib/render";

import { Camera } from "camera";
import { PAPER_HEIGHT, PAPER_WIDTH } from "constants";
import { Point } from "lib/point";
import { NotebookCollection } from "things/notebook";
import { Page } from "things/page";
import { Id } from "id";

const GAP = 20;

type TransitionConfig = {
  noAnimation?: boolean;
};

export class View {
  camera: Camera;
  notebookCollection: NotebookCollection;

  focusedPage: Page | null = null;
  zoom: AnimateVariable;
  overrideZoom: number | null = null; // temporary zoom for pinch gesture
  center = {
    x: new AnimateVariable(PAPER_WIDTH / 2),
    y: new AnimateVariable(PAPER_HEIGHT / 2),
  }; // center of the view

  focusedLevel = new AnimateVariable(0); // focus on week
  offsetByLevel: AnimateVariable[] = [];

  pagesByLevel: Array<Array<Page>>;

  constructor(camera: Camera, notebook: NotebookCollection) {
    const storedZoomString = localStorage.getItem("zoom");
    const storedZoomParsed = storedZoomString
      ? parseFloat(storedZoomString)
      : undefined;

    this.zoom = new AnimateVariable(
      storedZoomParsed !== undefined && !isNaN(storedZoomParsed)
        ? storedZoomParsed
        : 1,
      (value) => {
        localStorage.setItem("zoom", value.toString());
      }
    );

    this.camera = camera;
    this.notebookCollection = notebook;
    this.pagesByLevel = [];

    this.notebookCollection.on("changed", this.#onNotebookChanged);
    this.rebuild();

    const focusedPageId = localStorage.getItem("focusedPageId");
    if (focusedPageId) {
      console.log("focusing page", focusedPageId);
      const page = this.notebookCollection.getPageById(
        focusedPageId as Id<Page>
      );
      console.log("page", page);
      if (page) {
        this.focusPage(page, { noAnimation: true });
      }
    }
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
    this.zoom.target = 0;
    this.overrideZoom = null;
    this.center.x.target = PAPER_WIDTH / 2;
    this.center.y.target = PAPER_HEIGHT / 2;
  }

  focusPage(page: Page, config: TransitionConfig = {}) {
    localStorage.setItem("focusedPageId", page.id);

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
    const relativeLevel = Math.floor(point.y / (PAPER_HEIGHT + GAP));
    const level = relativeLevel + this.focusedLevel.target;

    if (level < 0 || level >= this.pagesByLevel.length) {
      return null;
    }

    const relativeOffset = Math.floor(point.x / (PAPER_WIDTH + GAP));
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
      for (let i = focusedLevel - 1; i >= 0; i--) {
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
    this.center.x.update(dt);
    this.center.y.update(dt);
  }

  render(r: Render) {
    // Since not all devices have the same aspect ratio,
    // Use the smallest of the two dimensions to scale the view, depending on the device
    const scale = Math.min(
      window.innerHeight / PAPER_HEIGHT,
      window.innerWidth / PAPER_WIDTH
    );

    let zoom = (this.overrideZoom ?? this.zoom.value * 0.7 + 0.3) * scale;

    this.camera.set(zoom, {
      x: this.center.x.value,
      y: this.center.y.value,
    });
    r.beginOffset(this.camera);
    const img = document.querySelector("img")!;
    img.style.transform = `scale(${zoom}) translate(${
      PAPER_WIDTH / 2 - this.center.x.value
    }px, ${PAPER_HEIGHT / 2 - this.center.y.value}px)`;
    img.style.opacity = `${(zoom - 1) / 16}`;

    let offset_y = this.focusedLevel.value * (PAPER_HEIGHT + GAP);

    // Render the zoom view
    const renderStablePage =
      this.isZoomedIn() &&
      this.focusedLevel.isCloseEnough() &&
      this.offsetByLevel.every((a) => a.isCloseEnough());

    if (renderStablePage) {
      this.focusedPage?.render(
        r,
        {
          x: 0,
          y: 0,
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
            const x = o * (PAPER_WIDTH + GAP) + x_offset * (PAPER_WIDTH + GAP);
            const y = i * (PAPER_HEIGHT + GAP) - offset_y;

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

    // Render the center of the camera
    //r.circle(this.center.x, this.center.y, 1, fill("red"));

    r.endOffset();
  }
}
