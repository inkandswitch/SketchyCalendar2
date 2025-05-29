import { Id } from "id";
import { Stroke } from "things/ink";
import { Polygon } from "lib/polygon";
import { Point } from "lib/point";
import { Vec } from "lib/vec";

import { TouchEvent } from "gesturesystem";

import Render, { dashedStroke } from "lib/render";
import { View } from "view";
import { PaperInstance } from "things/paperinstance";
import { NotebookCollection } from "things/notebook";

import { getMostlyOverlappingInstance } from "tools/eventcard";

export class Selection {
  mode: "off" | "selecting" | "selected" = "off";

  hull: Polygon | null = null;
  selectedStrokes: Set<Id<Stroke>> | null = null;
  selectedPaperInstances: Set<Id<PaperInstance>> | null = null;

  view: View;
  notebookCollection: NotebookCollection;

  delta: Vec = { x: 0, y: 0 };

  constructor(view: View, notebookCollection: NotebookCollection) {
    this.view = view;
    this.notebookCollection = notebookCollection;
  }

  penDown(e: TouchEvent) {
    if (this.mode == "off") {
      this.startHull(e.current);
    }
  }

  penMove(e: TouchEvent) {
    if (this.mode == "selecting") {
      this.extendHull(e.current);
    } else if (this.mode == "selected") {
      this.moveSelection(e.delta);
    }
  }

  penUp(e: TouchEvent) {
    if (this.mode == "selecting") {
      this.finishHull(e.current, e.totalDelta);
    } else if (this.mode == "selected") {
      this.finishMoveSelection(e.totalDelta);
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
      const layout = currentPage.getLayout();

      const foundPaper = currentPage.getPaperInstanceAtPosition(point);
      if (foundPaper) {
        this.mode = "selected";
        this.selectedPaperInstances = new Set([foundPaper.id]);
        PaperInstance.selected.set(foundPaper.id, true);
        // Reparent the card instance to the current page
        const rect = layout.paperInstances[foundPaper.id];
        foundPaper.moveTo(
          currentPage.paper.id,
          rect.position.x,
          rect.position.y
        );
        return;
      }
    }

    // Collect the strokes inside of the hull
    const currentPaper = this.view.focusedPage!.paper;
    this.selectedStrokes = currentPaper.getStrokesInsideHull(this.hull!);

    if (this.selectedStrokes.size > 0) {
      this.mode = "selected";
      for (const strokeId of this.selectedStrokes) {
        const strokeObj = currentPaper.notebook.getStrokeById(strokeId);
        if (strokeObj) {
          Stroke.selected.set(strokeId, true);
        }
      }
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
    //   const currentPage = this.view.focusedPage!;

    //   if (this.selectedStrokes) {
    //     for (const strokeId of this.selectedStrokes) {
    //       const stroke =
    //         this.view.focusedPage!.notebook.getStrokeById(strokeId);
    //       if (stroke) {
    //         stroke.props.points = stroke.props.points.map((pt) =>
    //           Vec.add(pt, delta)
    //         );
    //       }
    //     }
    //   }

    //   if (this.selectedPaperInstances) {
    //     for (const paperInstanceId of this.selectedPaperInstances) {
    //       const paperInstance =
    //         this.view.focusedPage!.notebook.getPaperInstanceById(
    //           paperInstanceId
    //         );
    //       paperInstance.moveTo(
    //         currentPage.paper.id,
    //         paperInstance.x + delta.x,
    //         paperInstance.y + delta.y
    //       );
    //     }
    //   }
    // }
  }

  update() {
    if (this.mode !== "selected") return;

    PaperInstance.highlighted.clear();
    const currentPage = this.view.focusedPage!;

    if (this.selectedPaperInstances) {
      for (const paperInstanceId of this.selectedPaperInstances) {
        const paperInstance =
          this.notebookCollection.getPaperInstanceById(paperInstanceId);
        if (paperInstance.paper.id != currentPage.paper.id) {
          paperInstance.moveTo(
            currentPage.paper.id,
            paperInstance.x + this.delta.x,
            paperInstance.y + this.delta.y
          );

          const found = getMostlyOverlappingInstance(
            currentPage,
            paperInstance
          );
          if (found) {
            PaperInstance.highlighted.set(found.instance.id, true);
          }
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

          if (paperInstance.paper.id != currentPage.paper.id) {
            paperInstance.moveTo(
              found.instance.paper.id,
              50,
              paperInstance.y - found.rect.position.y
            );
          }
        }
      }

      // If the total movement is small, we consider it a click
      PaperInstance.highlighted.clear();
      this.clear();
    }
  }

  clear() {
    this.mode = "off";
    this.hull = null;
    this.selectedStrokes = null;
    this.selectedPaperInstances = null;
    Stroke.selected.clear();
    PaperInstance.selected.clear();
  }

  render(r: Render) {
    if (this.mode == "selecting") {
      r.poly(this.hull!, dashedStroke("green", 2, [10, 10]), false);
    }
  }
}
