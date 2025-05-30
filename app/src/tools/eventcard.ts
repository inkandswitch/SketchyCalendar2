import { TouchEvent } from "gesturesystem";
import { View } from "view";

import { Id } from "id";
import { Rect } from "lib/rect";
import { Page } from "things/page";
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

    const paper = currentPage.paper;
    // const found = currentPage.paper.getPaperAtPosition(e.current);
    // if (!found) return;

    //    const paper = found.paper;
    //const local_pos = Vec.sub(e.current, found.offset);

    const screenPos = this.view.camera.screenToWorld(e.current);

    const newCard = paper.addNewPaper({
      x: screenPos.x,
      y: screenPos.y,
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

    const found = getMostlyOverlappingInstance(currentPage, cardInstance);
    if (found) {
      PaperInstance.highlighted.set(found.instance.id, true);
    }
    cardInstance.reparent(currentPage.paper.id);
    cardInstance.move(e.delta);
  }

  penUp(e: TouchEvent) {
    PaperInstance.highlighted.clear();
    if (!this.card) return;

    const currentPage = this.view.focusedPage!;
    if (!currentPage) return;

    const cardInstance = currentPage.notebook.getPaperInstanceById(this.card);
    const found = getMostlyOverlappingInstance(currentPage, cardInstance);
    if (found) {
      cardInstance.moveTo(found.instance.paper.id, {
        x: e.current.x - found.rect.position.x,
        y: e.current.y - found.rect.position.y,
      });
      return; // Stop after moving to the first found instance
    }

    // If no paper instance was found, the card will remain in its current position
    this.card = null;
  }
}

export function getMostlyOverlappingInstance(
  currentPage: Page,
  cardInstance: PaperInstance
): { instance: PaperInstance; rect: Rect } | null {
  const layout = currentPage.getLayout();
  const cardRect = cardInstance.getRect();

  // Find paperInstance that partially overlaps
  for (const id in layout.paperInstances) {
    const instanceId = id as Id<PaperInstance>;
    const instance = currentPage.notebook.getPaperInstanceById(instanceId);
    //if (!isCalendarBackground(instance.paper.background)) continue; // Skip non-calendar backgrounds

    if (instanceId == cardInstance.id) continue; // Skip the card's own instance
    const rect = layout.paperInstances[instanceId];

    if (Rect.isMostlyInside(rect, cardRect)) {
      return { instance, rect }; // Stop after moving to the first found instance
    }
  }

  return null;
}
