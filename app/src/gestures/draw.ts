import { GestureHandler, TouchEvent } from "gesturesystem";
import { Stroke } from "things/ink";
import { View } from "view";
import { Notebook } from "things/notebook";

import { Id } from "id";

import { Point } from "lib/point";
import { Vec } from "lib/vec";
import Toolbar, { ToolHandler } from "toolbar";

export default class Draw implements GestureHandler {
  notebook: Notebook;
  view: View;
  toolbar: Toolbar;

  drawHandler: ToolHandler | null = null;

  constructor(view: View, notebook: Notebook, toolbar: Toolbar) {
    this.toolbar = toolbar;
    this.notebook = notebook;
    this.view = view;

    this.drawHandler = this.toolbar.activeTool!.getHandler(view, notebook);
  }

  tap(e: TouchEvent): boolean {
    if (this.toolbar.tap(e.current)) {
      console.log("Toolbar tapped");
      this.drawHandler = this.toolbar.activeTool!.getHandler(
        this.view,
        this.notebook
      );
      return true;
    }
    return false;
  }

  onEvent(e: TouchEvent) {
    if (e.type != "pencil") return;
    switch (e.phase) {
      case "began": {
        if (this.tap(e)) {
        } else {
          this.drawHandler?.penDown(e);
        }
        break;
      }
      case "moved": {
        this.drawHandler?.penMove(e);
        break;
      }
      case "ended": {
        this.drawHandler?.penUp(e);
        break;
      }
    }
  }
}
