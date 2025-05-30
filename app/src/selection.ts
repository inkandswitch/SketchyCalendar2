import { Id } from "id";
import { Stroke } from "things/ink";
import { Polygon } from "lib/polygon";
import { Point } from "lib/point";
import { Vec } from "lib/vec";
import { Rect } from "lib/rect";

import { TouchEvent } from "gesturesystem";

import Render, { dashedStroke } from "lib/render";
import { View } from "view";
import { PaperInstance } from "things/paperinstance";
import { NotebookCollection } from "things/notebook";

import { getMostlyOverlappingInstance } from "tools/eventcard";
import { PageLayout } from "things/page";
import { ActionBar, Action } from "actionbar";

export class Selection {
  mode: "off" | "selecting" | "selected" = "off";

  hull: Polygon | null = null;
  selectedStrokes: Set<Id<Stroke>> | null = null;
  selectedPaperInstances: Set<Id<PaperInstance>> | null = null;

  view: View;
  notebookCollection: NotebookCollection;

  delta: Vec = { x: 0, y: 0 };

  actionBar: ActionBar | null = null;

  constructor(view: View, notebookCollection: NotebookCollection) {
    this.view = view;
    this.notebookCollection = notebookCollection;
  }

  penDown(e: TouchEvent) {
    if (this.mode == "off") {
      const worldPos = this.view.camera.screenToWorld(e.current);
      this.startHull(worldPos);
    }
  }

  penMove(e: TouchEvent) {
    const worldPos = this.view.camera.screenToWorld(e.current);
    if (this.mode == "selecting") {
      this.extendHull(worldPos);
    } else if (this.mode == "selected") {
      const worldPrev = this.view.camera.screenToWorld(e.previous);
      const worldDelta = Vec.sub(worldPos, worldPrev);
      this.moveSelection(worldDelta);
    }
  }

  penUp(e: TouchEvent) {
    if (this.actionBar) {
      if (this.actionBar.tap(e.current)) {
        return;
      }
    }
    const worldPos = this.view.camera.screenToWorld(e.current);
    const worldStart = this.view.camera.screenToWorld(e.start);
    const worldTotalDelta = Vec.sub(worldPos, worldStart);
    if (this.mode == "selecting") {
      this.finishHull(worldPos, worldTotalDelta);
    } else if (this.mode == "selected") {
      this.finishMoveSelection(worldTotalDelta);
    }
  }

  // Selection hull
  startHull(point: Point) {
    this.mode = "selecting";
    this.hull = [point];
  }

  extendHull(point: Point) {
    this.hull!.push(point);
  }

  finishHull(point: Point, totalDelta: Vec) {
    if (Vec.len(totalDelta) < 5) {
      const currentPage = this.view.focusedPage!;

      const foundPaper = currentPage.getPaperInstanceAtPosition(point);
      if (foundPaper) {
        this.mode = "selected";
        this.selectedPaperInstances = new Set([foundPaper.id]);
        PaperInstance.selected.set(foundPaper.id, true);
        // Reparent the card instance to the current page
        const layout = currentPage.getLayout();
        const rect = layout.paperInstances[foundPaper.id];
        foundPaper.moveTo(currentPage.paper.id, {
          x: rect.position.x,
          y: rect.position.y,
        });

        this.openActionBar();
        return;
      }
    }

    // Collect the strokes inside of the hull
    const currentPage = this.view.focusedPage!;
    this.selectedStrokes = currentPage.paper.getStrokesInsideHull(this.hull!);
    if (this.selectedStrokes.size > 0) {
      const layout = currentPage.getLayout();
      console.log(layout);
      console.log(this.selectedStrokes);
      this.mode = "selected";
      for (const strokeId of this.selectedStrokes) {
        const stroke = currentPage.paper.notebook.getStrokeById(strokeId)!;
        const rect = layout.strokes[strokeId];
        const originalRect = stroke.getRect({ x: 0, y: 0 });
        const delta = Vec.sub(rect.position, originalRect.position);
        stroke.move(delta);
        Stroke.selected.set(strokeId, true);
      }

      this.openActionBar();
    } else {
      this.clear();
    }
  }

  // Move selection
  // TODO: maybe we should re-parent strokes to a new paper when moving?
  moveSelection(delta: Vec) {
    if (this.mode == "selected") {
      this.delta = Vec.add(this.delta, delta);
    }
  }

  update() {
    if (this.mode !== "selected") return;

    PaperInstance.highlighted.clear();
    PaperInstance.selected.clear();
    const currentPage = this.view.focusedPage!;

    if (this.selectedStrokes) {
      for (const strokeId of this.selectedStrokes) {
        const stroke = this.view.focusedPage!.notebook.getStrokeById(strokeId);
        if (stroke) {
          if (this.delta.x != 0 || this.delta.y != 0) {
            stroke.move(this.delta);
          }

          if (stroke.props.parentId != currentPage.paper.id) {
            stroke.reparent(currentPage.paper.id);
          }
        }
      }
    }

    if (this.selectedPaperInstances) {
      for (const paperInstanceId of this.selectedPaperInstances) {
        const paperInstance =
          this.notebookCollection.getPaperInstanceById(paperInstanceId);

        PaperInstance.selected.set(paperInstance.id, true);
        if (!paperInstance) continue;
        if (this.delta.x != 0 || this.delta.y != 0) {
          paperInstance.move(this.delta);
        }

        if (paperInstance.paper.id != currentPage.paper.id) {
          paperInstance.reparent(currentPage.paper.id);
        }

        const found = getMostlyOverlappingInstance(currentPage, paperInstance);
        if (found) {
          PaperInstance.highlighted.set(found.instance.id, true);
        }
      }
    }

    this.delta = { x: 0, y: 0 }; // Reset delta after applying
  }

  finishMoveSelection(totalDelta: Vec) {
    if (Vec.len(totalDelta) < 5) {
      const currentPage = this.view.focusedPage!;

      if (this.selectedPaperInstances) {
        for (const paperInstanceId of this.selectedPaperInstances) {
          const paperInstance =
            this.notebookCollection.getPaperInstanceById(paperInstanceId);
          const found = getMostlyOverlappingInstance(
            currentPage,
            paperInstance
          );
          if (found == null) continue;

          paperInstance.moveTo(found.instance.paper.id, {
            x: paperInstance.x - found.rect.position.x,
            y: paperInstance.y - found.rect.position.y,
          });
        }
      }

      if (this.selectedStrokes) {
        const layout = currentPage.getLayout();
        for (const strokeId of this.selectedStrokes) {
          const stroke = currentPage.notebook.getStrokeById(strokeId);
          if (!stroke) continue;

          const found = getMostlyOverlappingInstanceWithStroke(layout, stroke);
          if (found == null) continue;
          const paperInstance = this.notebookCollection.getPaperInstanceById(
            found.instanceId
          );
          stroke.reparent(paperInstance.paper.id);

          const delta = Vec.sub({ x: 0, y: 0 }, found.rect.position);
          stroke.move(delta);
        }
      }

      // If the total movement is small, we consider it a click
      PaperInstance.highlighted.clear();
      this.clear();
    }
  }

  openActionBar() {
    const actions = [
      new Action("copy", () => this.copySelection()),
      new Action("delete", () => this.deleteSelection()),
    ];
    if (this.selectedPaperInstances) {
      actions.push(
        new Action("transclude", () => {
          this.transcludeSelection();
        })
      );
    }
    this.actionBar = new ActionBar(actions);
  }

  // Actions
  copySelection() {
    if (this.selectedPaperInstances) {
      const newSelection: Id<PaperInstance>[] = [];
      for (const instance of this.selectedPaperInstances) {
        const paperInstance =
          this.notebookCollection.getPaperInstanceById(instance);
        if (paperInstance) {
          const newInstance = paperInstance.copy();
          newSelection.push(newInstance.id);
        }
      }
      this.selectedPaperInstances = new Set(newSelection);
    }

    if (this.selectedStrokes) {
      const newSelection: Id<Stroke>[] = [];
      for (const strokeId of this.selectedStrokes) {
        const stroke = this.view.focusedPage!.notebook.getStrokeById(strokeId);
        const newStroke = stroke.copy();
        if (newStroke) {
          newSelection.push(newStroke.props.id);
        }
      }
      this.selectedStrokes = new Set(newSelection);
    }
  }

  deleteSelection() {
    if (this.selectedPaperInstances) {
      for (const instance of this.selectedPaperInstances) {
        const paperInstance =
          this.notebookCollection.getPaperInstanceById(instance);
        paperInstance.remove();
      }
      this.clear();
    }

    if (this.selectedStrokes) {
      for (const strokeId of this.selectedStrokes) {
        const stroke = this.view.focusedPage!.notebook.getStrokeById(strokeId);
        if (stroke) {
          stroke.remove();
        }
      }
      this.clear();
    }
  }

  transcludeSelection() {
    if (this.selectedPaperInstances) {
      const newSelection: Id<PaperInstance>[] = [];
      for (const instance of this.selectedPaperInstances) {
        const paperInstance =
          this.notebookCollection.getPaperInstanceById(instance);
        if (paperInstance) {
          const newInstance = paperInstance.transclude();
          newSelection.push(newInstance.id);
        }
      }
      this.selectedPaperInstances = new Set(newSelection);
    }
  }

  clear() {
    this.mode = "off";
    this.hull = null;
    this.selectedStrokes = null;
    this.selectedPaperInstances = null;
    Stroke.selected.clear();
    PaperInstance.selected.clear();
    this.actionBar = null;
  }

  render(r: Render) {
    r.beginOffset(this.view.camera);
    if (this.mode == "selecting") {
      r.poly(this.hull!, dashedStroke("green", 2, [10, 10]), false);
    }
    r.endOffset();

    if (this.actionBar) {
      this.actionBar.render(r);
    }
  }
}

export function getMostlyOverlappingInstanceWithStroke(
  layout: PageLayout,
  stroke: Stroke
): { instanceId: Id<PaperInstance>; rect: Rect } | null {
  const strokeRect = layout.strokes[stroke.props.id];

  // Find paperInstance that partially overlaps
  for (const id in layout.paperInstances) {
    const paperRect = layout.paperInstances[id as Id<PaperInstance>];
    if (Rect.isMostlyInside(paperRect, strokeRect)) {
      return { instanceId: id as Id<PaperInstance>, rect: paperRect }; // Stop after moving to the first found instance
    }
  }

  return null;
}
