import { TouchEvent } from "gesturesystem";
import { View } from "view";

import { Id } from "id";
import { Vec } from "lib/vec";
import { PaperInstance } from "things/paperinstance";
import { Tool, ToolHandler } from "toolbar";
import { Rect } from "lib/rect";

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

    const paper = currentPage.paper;
    // const found = currentPage.paper.getPaperAtPosition(e.current);
    // if (!found) return;

    //    const paper = found.paper;
    //const local_pos = Vec.sub(e.current, found.offset);
    const newCard = paper.addNewPaper({
      x: e.current.x,
      y: e.current.y,
      width: 140,
      height: 100,
      background: "#feff9c", // Postitnote yellow
      locked: false,
      siblingIndex: paper.children.length,
    });
    this.card = newCard.id;
  }

  penMove(e: TouchEvent) {
    PaperInstance.highlighted.clear();
    if (!this.card) return;

    const currentPage = this.view.focusedPage!;
    if (!currentPage) return;

    const cardInstance = currentPage.notebook.getPaperInstanceById(this.card);
    cardInstance.moveTo(cardInstance.parentId, e.current.x, e.current.y);
    const cardRect = cardInstance.getRect();

    const layout = currentPage.getLayout();
    // Find paperInstance that partially overlaps
    for (const instanceId in layout.paperInstances) {
      if (instanceId == cardInstance.id) continue; // Skip the card's own instance
      const rect = layout.paperInstances[instanceId as Id<PaperInstance>];

      if (Rect.isMostlyInside(rect, cardRect)) {
        PaperInstance.highlighted.set(instanceId as Id<PaperInstance>, true);
        return; // Stop after moving to the first found instance
      }
    }

    // If no paper instance was found, the card will remain in its current position
    cardInstance.moveTo(currentPage.paper.id, e.current.x, e.current.y);
  }

  penUp(e: TouchEvent) {
    PaperInstance.highlighted.clear();
    if (!this.card) return;

    const currentPage = this.view.focusedPage!;
    if (!currentPage) return;

    const cardInstance = currentPage.notebook.getPaperInstanceById(this.card);
    cardInstance.moveTo(cardInstance.parentId, e.current.x, e.current.y);
    const cardRect = cardInstance.getRect();

    const layout = currentPage.getLayout();
    // Find paperInstance that partially overlaps
    for (const instanceId in layout.paperInstances) {
      if (instanceId == cardInstance.id) continue; // Skip the card's own instance
      const rect = layout.paperInstances[instanceId as Id<PaperInstance>];

      if (Rect.isMostlyInside(rect, cardRect)) {
        // If the card is mostly inside another paper instance, move it to that instance
        const targetInstance = currentPage.notebook.getPaperInstanceById(
          instanceId as Id<PaperInstance>
        );

        cardInstance.moveTo(
          targetInstance.paper.id,
          50,
          e.current.y - rect.position.y
        );
        return; // Stop after moving to the first found instance
      }
    }

    // If no paper instance was found, the card will remain in its current position

    this.card = null;
  }
}
