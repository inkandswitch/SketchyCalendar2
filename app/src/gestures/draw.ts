import { GestureHandler, TouchEvent } from "gesturesystem";
import { NotebookCollection } from "things/notebook";
import { View } from "view";

import Toolbar, { ToolHandler } from "toolbar";
import TagMenu from "tagmenu";

export default class Draw implements GestureHandler {
  notebook: NotebookCollection;
  view: View;
  toolbar: Toolbar;
  tagMenu: TagMenu;

  drawHandler: ToolHandler | null = null;

  constructor(
    view: View,
    notebook: NotebookCollection,
    toolbar: Toolbar,
    tagMenu: TagMenu
  ) {
    this.toolbar = toolbar;
    this.tagMenu = tagMenu;
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
      this.tagMenu.activeTool = null;
      return true;
    }

    if (this.tagMenu.tap(e.current)) {
      if (this.tagMenu.activeTool) {
        this.drawHandler = this.tagMenu.activeTool.getHandler(
          this.view,
          this.notebook
        );
        this.toolbar.activeTool = null;
      }
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
