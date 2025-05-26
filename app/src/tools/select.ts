import { TouchEvent } from "gesturesystem";
import { View } from "view";
import { Notebook } from "things/notebook";

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

  getHandler(view: View, notebook: Notebook): ToolHandler {
    return new SelectHandler(view, notebook, this.selection);
  }
}

export class SelectHandler implements ToolHandler {
  view: View;
  notebook: Notebook;

  selection: Selection;

  constructor(view: View, notebook: Notebook, selection: Selection) {
    this.view = view;
    this.notebook = notebook;
    this.selection = selection;
  }

  // Tool-specific methods
  penDown(e: TouchEvent) {
    this.selection.startSelection(e.current);
  }

  penMove(e: TouchEvent) {
    this.selection.extendSelection(e.current);
  }

  penUp(e: TouchEvent) {
    this.selection.finishSelection();
  }
}
