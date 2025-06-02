import { ColorDropDownAction } from "actionbar";
import {
  NO_STICKY_NOTE_COLOR,
  PAPER_HEIGHT,
  STICKY_NOTE_COLORS,
} from "constants";
import { Id } from "id";
import { Point } from "lib/point";
import Render from "lib/render";
import { NotebookCollection } from "things/notebook";
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
        const onChangeColor = (c: string) => {
          colorPicker!.value = c;
          Paper.colorsByTagPaperId.set(paper.id, c);
        };

        colorPicker = new ColorDropDownAction(
          STICKY_NOTE_COLORS.concat(NO_STICKY_NOTE_COLOR),
          onChangeColor,
          "horizontal"
        );
        this.colorPickersByPaperId.set(paper.id, colorPicker);
      }

      colorPicker.position = {
        x: 20 + paper.width + 5,
        y: offset - colorPicker.height,
      };

      options.push({
        paper,
        position: {
          x: 20,
          y: offset - paper.height - (colorPicker.height - paper.height) / 2,
        },
        colorPicker,
      });

      offset -= colorPicker.height;
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
