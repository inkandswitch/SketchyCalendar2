import { TouchEvent } from "gesturesystem";
import { View } from "view";
import { Notebook } from "things/notebook";

import { Vec } from "lib/vec";
import { Tool, ToolHandler } from "toolbar";
import { Paper } from "things/paper";
import { Id } from "id";
import { PaperInstance } from "things/paperinstance";

export default class EventCardTool extends Tool {
  icon: string;

  constructor() {
    super();

    this.icon = "card";
  }

  getHandler(view: View, notebook: Notebook): ToolHandler {
    return new EventCardHandler(view, notebook);
  }
}

export class EventCardHandler implements ToolHandler {
  view: View;
  notebook: Notebook;
  card: Id<PaperInstance> | null = null;

  constructor(view: View, notebook: Notebook) {
    this.view = view;
    this.notebook = notebook;
  }

  // Tool-specific methods
  penDown(e: TouchEvent) {
    const currentPage = this.view.currentPage!;
    if (!currentPage) return;
    const found = currentPage.paper.getPaperAtPosition(e.current);
    if (!found) return;

    const paper = found.paper;
    const local_pos = Vec.sub(e.current, found.offset);
    const newCard = paper.addNewPaper({
      x: local_pos.x,
      y: local_pos.y,
      width: 160,
      height: 100,
      background: "#feff9c", // Postitnote yellow
      locked: false,
      siblingIndex: paper.children.length,
    });
    this.card = newCard.id;
  }

  penMove(e: TouchEvent) {
    if (!this.card) return;
    const cardInstance = this.notebook.getPaperInstanceById(this.card);

    const currentPage = this.view.currentPage!;
    if (!currentPage) return;

    const found = currentPage.paper.getPaperAtPosition(
      e.current,
      { x: 0, y: 0 },
      new Set([cardInstance.paper.id])
    );
    if (!found) return;

    if (found.paper.id == cardInstance.paper.id) {
      console.log("parent to self");
    }

    const local_pos = Vec.sub(e.current, found.offset);

    cardInstance.moveTo(found.paper.id, local_pos.x, local_pos.y);
  }

  penUp(e: TouchEvent) {
    this.card = null;
  }
}
