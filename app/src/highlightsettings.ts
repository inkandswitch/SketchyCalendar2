import { ColorDropDownAction } from "actionbar";
import { PAPER_HEIGHT, STICKY_NOTE_COLORS } from "constants";
import { Id } from "id";
import { Point } from "lib/point";
import { Rect } from "lib/rect";
import Render from "lib/render";
import { NotebookCollection } from "things/notebook";
import { Page } from "things/page";
import { Paper } from "things/paper";
import { View } from "view";

type TagOption = {
  paper: Paper;
  position: Point;
  colorPicker: ColorDropDownAction;
};

export default class HighlightSettings {
  isActive: boolean = false;
  view: View;
  notebookCollection: NotebookCollection;
  colorPickersByPaperId: Map<Id<Paper>, ColorDropDownAction> = new Map();

  constructor(view: View, notebookCollection: NotebookCollection) {
    this.view = view;
    this.notebookCollection = notebookCollection;
  }

  getTagOptions(): TagOption[] {
    const options: TagOption[] = [];

    const allTags = this.notebookCollection.activeTagPapers();

    let offset = PAPER_HEIGHT - 20;

    for (const paper of allTags) {
      let colorPicker = this.colorPickersByPaperId.get(paper.id);

      if (!colorPicker) {
        colorPicker = new ColorDropDownAction(
          STICKY_NOTE_COLORS,
          (color) => {
            console.log("selected color", color);
          },
          "horizontal"
        );
        this.colorPickersByPaperId.set(paper.id, colorPicker);
      }

      const x = 20;
      const y = offset - paper.height;

      colorPicker.position = { x: 20 + paper.width, y: offset - paper.height };

      options.push({
        paper,
        position: { x, y },
        colorPicker,
      });

      offset -= paper.height;
    }

    if (!this.isActive || !this.view.focusedPage) return [];

    return options;
  }

  tap(point: Point): boolean {
    if (!this.isActive) return false;

    const options = this.getTagOptions();

    for (const option of options) {
      if (option.colorPicker.tap(point)) {
        return true;
      }
    }

    return false;
  }

  render(r: Render) {
    if (!this.isActive) return;

    const options = this.getTagOptions();

    for (const option of options) {
      option.paper.render(r, option.position, {
        hasShadow: true,
      });

      option.colorPicker.render(r);
    }
  }
}
