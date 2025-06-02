import { PAPER_HEIGHT } from "constants";
import { Point } from "lib/point";
import Render, { font } from "lib/render";
import { NotebookCollection } from "things/notebook";
import { Page } from "things/page";
import { Paper } from "things/paper";
import { View } from "view";

type TagOption = {
  paper: Paper;
  position: Point;
};

export default class HighlightSettings {
  isActive: boolean = false;
  view: View;
  notebookCollection: NotebookCollection;

  constructor(view: View, notebookCollection: NotebookCollection) {
    this.view = view;
    this.notebookCollection = notebookCollection;
  }

  getTagOptions(): TagOption[] {
    const options: TagOption[] = [];

    const allTags = this.notebookCollection.activeTagPapers();

    let offset = PAPER_HEIGHT - 20;

    for (const paper of allTags) {
      options.push({
        paper,
        position: { x: 20, y: offset - paper.height },
      });

      offset -= paper.height;
    }

    if (!this.isActive || !this.view.focusedPage) return [];

    return options;
  }

  tap(point: Point): boolean {
    return false;
  }

  render(r: Render) {
    if (!this.isActive) return;

    const options = this.getTagOptions();

    for (const option of options) {
      option.paper.render(r, option.position, {
        hasShadow: true,
      });
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
