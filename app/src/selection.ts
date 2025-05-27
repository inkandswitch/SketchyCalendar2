import { Id } from "id";
import { Stroke } from "things/ink";
import { Polygon } from "lib/polygon";
import { Point } from "lib/point";
import { Vec } from "lib/vec";

import { TouchEvent } from "gesturesystem";

import Render, { dashedStroke } from "lib/render";
import { View } from "view";

export class Selection {
  mode: "off" | "selecting" | "selected" = "off";

  hull: Polygon | null = null;
  selectedStrokes: Set<Id<Stroke>> | null = null;

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
      this.finishSelection();
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

  finishSelection() {
    this.mode = "selected";

    // Collect the points of the hull
    this.selectedStrokes = new Set<Id<Stroke>>();
    const currentPaper = this.view.currentPage!.paper;
    for (const stroke of currentPaper.strokes) {
      for (const pt of stroke.props.points) {
        if (Polygon.isPointInside(this.hull!, pt)) {
          this.selectedStrokes.add(stroke.props.id);
          break; // No need to check other points in the stroke
        }
      }
    }

    console.log(this.selectedStrokes);
    // Find the elements within the hull
  }

  // Move selection
  moveSelection(delta: Point) {
    if (this.mode == "selected" && this.selectedStrokes) {
      for (const strokeId of this.selectedStrokes) {
        const stroke = this.view.notebook.getStrokeById(strokeId);
        if (stroke) {
          stroke.props.points = stroke.props.points.map((pt) =>
            Vec.add(pt, delta)
          );
        }
      }
    }
  }

  finishMoveSelection(totalDelta: Point) {
    if (Vec.len(totalDelta) < 5) {
      // If the total movement is small, we consider it a click
      this.mode = "off";
      this.hull = null;
      this.selectedStrokes = null;
    }
  }

  render(r: Render) {
    if (this.mode == "selecting") {
      r.poly(this.hull!, dashedStroke("green", 2, [10, 10]), false);
    }

    if (this.mode == "selected") {
      if (this.selectedStrokes) {
        for (const strokeId of this.selectedStrokes) {
          const stroke = this.view.notebook.getStrokeById(strokeId);
          if (stroke) {
          }
        }
      }
    }
  }
}
