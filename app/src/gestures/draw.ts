import { GestureHandler, TouchEvent } from "gesturesystem";
import { Stroke } from "things/ink";
import { View } from "view";
import { Notebook } from "things/notebook";

import { Id } from "id";

export default class Draw implements GestureHandler {
  notebook: Notebook;
  view: View;
  strokeId: Id<Stroke> | null = null;

  constructor(view: View, notebook: Notebook) {
    this.notebook = notebook;
    this.view = view;
  }

  onEvent(e: TouchEvent) {
    if (e.type != "pencil") return;
    switch (e.phase) {
      case "began": {
        const currentPaper = this.view.currentPage!.paper;
        const newStroke = currentPaper.addNewStroke();
        newStroke.addPoint(e.current);
        this.strokeId = newStroke.props.id;
        break;
      }
      case "moved": {
        if (this.strokeId != null) {
          const stroke = this.notebook.getStrokeById(this.strokeId);
          stroke.addPoint(e.current);
        }
        break;
      }
      case "ended": {
        if (this.strokeId != null) {
          const stroke = this.notebook.getStrokeById(this.strokeId);
          stroke.addPoint(e.current);
          this.strokeId = null;
        }
        break;
      }
    }
  }
}
