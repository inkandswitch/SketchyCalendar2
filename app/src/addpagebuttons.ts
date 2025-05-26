import { Point } from "lib/point";
import { Rect } from "lib/rect";
import Render, { fill, fillAndStroke } from "lib/render";
import { View } from "view";

type Button = Rect & {
  icon: string;
  onTap: () => void;
};

const BUTTON_SIZE = 40;

const PADDING = 10;

export default class AddPageButtons {
  buttons: Button[] = [];
  isActive: boolean = true;
  view: View;

  constructor(view: View) {
    this.view = view;

    this.buttons = [
      {
        position: {
          x: (window.innerWidth - BUTTON_SIZE) / 2,
          y: window.innerHeight - BUTTON_SIZE - PADDING,
        },
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        icon: "add_page",
        onTap: () => {
          const currentPage = this.view.currentPage;
          if (currentPage) {
            currentPage.addChildPage({
              siblingIndex: 0,
              width: currentPage.paper.width,
              height: currentPage.paper.height,
              background: null,
            });
            console.log("add page bottom");
          }
        },
      },
      {
        position: {
          x: window.innerWidth - BUTTON_SIZE - PADDING,
          y: (window.innerHeight - BUTTON_SIZE) / 2,
        },
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        icon: "add_page",
        onTap: () => {
          const currentPage = this.view.currentPage?.parent;
          if (currentPage) {
            this.view.notebook.createPage({
              parentId: currentPage.parent?.id ?? null,
              siblingIndex: 0,
              width: currentPage.paper.width,
              height: currentPage.paper.height,
              background: null,
            });
            console.log("add page right");
          }
        },
      },
    ];
  }

  tap(point: Point): boolean {
    if (!this.isActive) return false;

    for (const button of this.buttons) {
      if (Rect.isPointInside(growRect(button, 20), point)) {
        button.onTap();
        return true;
      }
    }

    return false;
  }

  render(r: Render) {
    if (!this.isActive) return;

    for (const button of this.buttons) {
      r.round_rect(
        button.position.x,
        button.position.y,
        button.width,
        button.height,
        3,
        fillAndStroke("#FFF", "#0002", 1)
      );

      r.image(
        "./img/" + button.icon + ".png",
        button.position.x,
        button.position.y
      );
    }
  }
}

function growRect(rect: Rect, amount: number) {
  return {
    ...rect,
    x: rect.position.x - amount,
    y: rect.position.y - amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
  };
}
