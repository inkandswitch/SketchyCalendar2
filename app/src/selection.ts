import { Id } from "id";
import { Stroke } from "things/ink";
import { Polygon } from "lib/polygon";
import { Point } from "lib/point";
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

  startSelection(point: Point) {
    this.mode = "selecting";
    this.hull = [point];
  }

  extendSelection(point: Point) {
    if (this.hull) {
      this.hull!.push(point);
    }
  }

  finishSelection() {
    this.mode = "selected";
    const currentPaper = this.view.currentPage!.paper;
    for (const stroke of currentPaper.strokes) {
      for (const pt of stroke) {
      }
    }

    // Find the elements within the hull
  }

  render(r: Render) {
    if (this.hull) {
      r.poly(this.hull, dashedStroke("green", 2, [10, 10]), false);
    }
  }
}
