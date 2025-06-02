import { TouchEvent } from "gesturesystem";
import { View } from "view";

import { Id } from "id";
import { Rect } from "lib/rect";
import { Page } from "things/page";
import { PaperInstance } from "things/paperinstance";
import { Tool, ToolHandler } from "toolbar";

import { Vec } from "lib/vec";
import { Point } from "lib/point";
import { Paper } from "things/paper";

export default class CardTool extends Tool {
  icon: string;
  createCard: (paper: Paper, position: Point) => PaperInstance;

  constructor(
    icon: string,
    createCard: (paper: Paper, position: Point) => PaperInstance
  ) {
    super();

    this.icon = icon;
    this.createCard = createCard;
  }

  getHandler(view: View): ToolHandler {
    return new CardHandler(view, this.createCard);
  }
}

export class CardHandler implements ToolHandler {
  view: View;
  card: Id<PaperInstance> | null = null;
  createCard: (paper: Paper, position: Point) => PaperInstance;

  constructor(
    view: View,
    createCard: (paper: Paper, position: Point) => PaperInstance
  ) {
    this.view = view;
    this.createCard = createCard;
  }

  // Tool-specific methods
  penDown(e: TouchEvent) {
    const currentPage = this.view.focusedPage!;
    if (!currentPage) return;

    const paper = currentPage.paper;

    const worldPos = this.view.camera.screenToWorld(e.current);

    const newCard = this.createCard(paper, worldPos);
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

    const worldPos = this.view.camera.screenToWorld(e.current);
    const worldPrev = this.view.camera.screenToWorld(e.previous);
    const worldDelta = Vec.sub(worldPos, worldPrev);
    cardInstance.move(worldDelta);
  }

  penUp(e: TouchEvent) {
    PaperInstance.highlighted.clear();
    if (!this.card) return;

    const worldPos = this.view.camera.screenToWorld(e.current);

    const currentPage = this.view.focusedPage!;
    if (!currentPage) return;

    const cardInstance = currentPage.notebook.getPaperInstanceById(this.card);
    const found = getMostlyOverlappingInstance(currentPage, cardInstance);
    if (found) {
      cardInstance.moveTo(found.instance.paper.id, {
        x: worldPos.x - found.rect.position.x,
        y: worldPos.y - found.rect.position.y,
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
  const cardArea = Rect.area(cardRect);

  // Find paperInstance that partially overlaps
  for (const id in layout.paperInstances) {
    const instanceId = id as Id<PaperInstance>;
    const instance = currentPage.notebook.getPaperInstanceById(instanceId);
    //if (!isCalendarBackground(instance.paper.background)) continue; // Skip non-calendar backgrounds

    if (instanceId == cardInstance.id) continue; // Skip the card's own instance
    const rect = layout.paperInstances[instanceId];

    if (Rect.area(rect) <= cardArea) {
      continue; // Skip instances that are smaller than the card
    }

    if (Rect.isMostlyInside(rect, cardRect)) {
      return { instance, rect }; // Stop after moving to the first found instance
    }
  }

  return null;
}
