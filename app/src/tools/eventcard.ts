import { TouchEvent } from "gesturesystem";
import { View } from "view";

import { Id } from "id";
import { Vec } from "lib/vec";
import { PaperInstance } from "things/paperinstance";
import { Tool, ToolHandler } from "toolbar";

export default class EventCardTool extends Tool {
  icon: string;

  constructor() {
    super();

    this.icon = "card";
  }

  getHandler(view: View): ToolHandler {
    return new EventCardHandler(view);
  }
}

export class EventCardHandler implements ToolHandler {
  view: View;
  card: Id<PaperInstance> | null = null;

  constructor(view: View) {
    this.view = view;
  }

  // Tool-specific methods
  penDown(e: TouchEvent) {
    const currentPage = this.view.focusedPage!;
    if (!currentPage) return;
    const found = currentPage.paper.getPaperAtPosition(e.current);
    if (!found) return;

    const paper = found.paper;
    const local_pos = Vec.sub(e.current, found.offset);
    const newCard = paper.addNewPaper({
      x: local_pos.x,
      y: local_pos.y,
      width: 140,
      height: 100,
      background: "#feff9c", // Postitnote yellow
      locked: false,
      siblingIndex: paper.children.length,
    });
    this.card = newCard.id;
  }

  penMove(e: TouchEvent) {
    if (!this.card) return;

    const currentPage = this.view.focusedPage!;
    if (!currentPage) return;

    const cardInstance = currentPage.notebook.getPaperInstanceById(this.card);

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

    cardInstance.moveTo(found.paper.id, 50, local_pos.y);
  }

  penUp(e: TouchEvent) {
    this.card = null;
  }
}
