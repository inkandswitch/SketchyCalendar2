import { GestureHandler, TouchEvent } from "gesturesystem";
import { Stroke } from "things/ink";
import { View } from "view";
import { Notebook } from "things/notebook";

import { Id } from "id";

import { Point } from "lib/vec";
import { Vec } from "lib/vec";

export default class Draw implements GestureHandler {
  notebook: Notebook;
  view: View;
  strokeId: Id<Stroke> | null = null;
  offset: Point | null = null;

  constructor(view: View, notebook: Notebook) {
    this.notebook = notebook;
    this.view = view;
  }

  onEvent(e: TouchEvent) {
    if (e.type != "pencil") return;
    switch (e.phase) {
      case "began": {
        const currentPage = this.view.currentPage!;
        console.log(currentPage);
        if (!currentPage) return;
        const found = currentPage.paper.getPaperAtPosition(e.current);
        if (!found) return;
        const newStroke = found.paper.addNewStroke();
        this.offset = found.offset;
        newStroke.addPoint(Vec.sub(e.current, this.offset));
        this.strokeId = newStroke.props.id;
        break;
      }
      case "moved": {
        if (this.strokeId != null) {
          const stroke = this.notebook.getStrokeById(this.strokeId);
          stroke.addPoint(Vec.sub(e.current, this.offset));
        }
        break;
      }
      case "ended": {
        if (this.strokeId != null) {
          const stroke = this.notebook.getStrokeById(this.strokeId);
          stroke.addPoint(Vec.sub(e.current, this.offset));
          this.strokeId = null;
        }
        break;
      }
    }
  }
}
