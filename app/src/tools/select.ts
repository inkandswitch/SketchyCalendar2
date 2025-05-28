import { TouchEvent } from "gesturesystem";
import { View } from "view";
import { NotebookCollection } from "things/notebook";

import { Tool, ToolHandler } from "toolbar";
import { Selection } from "selection";

export default class SelectTool extends Tool {
  icon: string;
  selection: Selection;

  constructor(selection: Selection) {
    super();

    this.icon = "select";
    this.selection = selection;
  }

  getHandler(view: View, notebook: NotebookCollection): ToolHandler {
    return new SelectHandler(view, notebook, this.selection);
  }
}

export class SelectHandler implements ToolHandler {
  view: View;
  notebookCollection: NotebookCollection;

  selection: Selection;

  constructor(
    view: View,
    notebookCollection: NotebookCollection,
    selection: Selection
  ) {
    this.view = view;
    this.notebookCollection = notebookCollection;
    this.selection = selection;
  }

  // Tool-specific methods
  penDown(e: TouchEvent) {
    this.selection.penDown(e);
  }

  penMove(e: TouchEvent) {
    this.selection.penMove(e);
  }

  penUp(e: TouchEvent) {
    this.selection.penUp(e);
  }
}
