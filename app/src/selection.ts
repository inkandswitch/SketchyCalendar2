import { Id } from "id";
import { Stroke } from "things/ink";
import { Polygon } from "lib/polygon";
import { Point } from "lib/point";
import { Vec } from "lib/vec";

import { TouchEvent } from "gesturesystem";

import Render, { dashedStroke } from "lib/render";
import { View } from "view";
import { PaperInstance } from "things/paperinstance";

export class Selection {
  mode: "off" | "selecting" | "selected" = "off";

  hull: Polygon | null = null;
  selectedStrokes: Set<Id<Stroke>> | null = null;
  selectedPaperInstances: Set<Id<PaperInstance>> | null = null;

  view: View;

  constructor(view: View) {
    this.view = view;
  }

  penDown(e: TouchEvent) {
    if (this.mode == "off") {
      this.startSelection(e.current);
    }
  }

  penMove(e: TouchEvent) {
    if (this.mode == "selecting") {
      this.extendSelection(e.current);
    } else if (this.mode == "selected") {
      this.moveSelection(e.delta);
    }
  }

  penUp(e: TouchEvent) {
    if (this.mode == "selecting") {
      this.finishSelection(e.current, e.totalDelta);
    } else if (this.mode == "selected") {
      this.finishMoveSelection(e.totalDelta);
    }
  }

  // Selection hull
  startSelection(point: Point) {
    this.mode = "selecting";
    this.hull = [point];
  }

  extendSelection(point: Point) {
    this.hull!.push(point);
  }

  finishSelection(point: Point, totalDelta: Vec) {
    if (Vec.len(totalDelta) < 5) {
      const currentPage = this.view.focusedPage!;
      const foundPaper = currentPage.getPaperInstanceAtPosition(point);
      if (foundPaper) {
        this.mode = "selected";
        this.selectedPaperInstances = new Set([foundPaper.id]);
        PaperInstance.selected.set(foundPaper.id, true);
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
      if (this.selectedStrokes) {
        for (const strokeId of this.selectedStrokes) {
          const stroke =
            this.view.focusedPage!.notebook.getStrokeById(strokeId);
          if (stroke) {
            stroke.props.points = stroke.props.points.map((pt) =>
              Vec.add(pt, delta)
            );
          }
        }
      }

      if (this.selectedPaperInstances) {
        for (const paperInstanceId of this.selectedPaperInstances) {
          const paperInstance =
            this.view.focusedPage!.notebook.getPaperInstanceById(
              paperInstanceId
            );
          paperInstance.moveTo(
            paperInstance.parentId,
            paperInstance.x + delta.x,
            paperInstance.y + delta.y
          );
        }
      }
    }
  }

  finishMoveSelection(totalDelta: Vec) {
    if (Vec.len(totalDelta) < 5) {
      // If the total movement is small, we consider it a click
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
