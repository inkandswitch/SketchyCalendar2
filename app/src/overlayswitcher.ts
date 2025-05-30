import { Point } from "lib/point";
import { Rect } from "lib/rect";
import Render, { font, measureText, RenderStyle } from "lib/render";
import { FONT_BIG, LINK_COLORS } from "constants";
import { NotebookCollection } from "things/notebook";
import { Page } from "things/page";
import { View } from "view";

type OverlayButton = Rect & {
  label: string;
  page: Page;
  style: RenderStyle;
};

export default class OverlaySwitcher {
  isActive: boolean = false;
  view: View;
  notebookCollection: NotebookCollection;

  constructor(view: View, notebookCollection: NotebookCollection) {
    this.view = view;
    this.notebookCollection = notebookCollection;
  }

  getButtons(): OverlayButton[] {
    if (!this.isActive || !this.view.focusedPage) return [];

    const allPages = this.notebookCollection
      .getMatchingPages(this.view.focusedPage)
      .concat(this.view.focusedPage)
      .sort((a, b) => {
        // sort based on notebook order
        const aNotebookIndex = Array.from(
          this.notebookCollection.notebooks.values()
        ).indexOf(a.notebook);

        const bNotebookIndex = Array.from(
          this.notebookCollection.notebooks.values()
        ).indexOf(b.notebook);

        return bNotebookIndex - aNotebookIndex;
      });

    const buttons: OverlayButton[] = [];
    let offset = 40;

    for (const page of allPages) {
      const title = getTitle(page).split(" ")[0];
      const style = font(
        FONT_BIG,
        this.view.focusedPage === page
          ? LINK_COLORS[page.notebook.color]
          : "#888"
      );

      const { width, height } = measureText(title, style);

      buttons.push({
        label: title,
        page,
        style,
        position: {
          x: window.innerWidth - offset - width,
          y: window.innerHeight - height - 40,
        },
        width,
        height,
      });

      offset += width + 20;
    }

    return buttons.length > 1 ? buttons : [];
  }

  tap(point: Point): boolean {
    if (!this.isActive) return false;

    for (const button of this.getButtons()) {
      if (Rect.isPointInside(button, point)) {
        this.view.focusPage(button.page, { noAnimation: true });
        return true;
      }
    }

    return false;
  }

  render(r: Render) {
    const buttons = this.getButtons();

    for (const button of buttons) {
      r.text(button.label, button.position.x, button.position.y, button.style);
    }
  }
}

function getTitle(page: Page) {
  let current = page;

  while (current.parent) {
    current = current.parent;
  }

  const titleText = current.paper.texts.find((text) =>
    text.labels.includes("title")
  );

  if (titleText) {
    return titleText.value;
  }

  return "untitled";
}
