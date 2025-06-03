import { ColorDropDownAction } from "actionbar";
import {
  NO_STICKY_NOTE_COLOR,
  PAPER_HEIGHT,
  STICKY_NOTE_COLORS,
} from "constants";
import { Id } from "id";
import { Point } from "lib/point";
import { Rect } from "lib/rect";
import Render from "lib/render";
import { NotebookCollection } from "things/notebook";
import { Paper } from "things/paper";
import Toolbar, { Tool } from "toolbar";
import CardTool from "tools/card";
import { View } from "view";

type TagOption = {
  paper: Paper;
  position: Point;
  tool: Tool;
  colorPicker: ColorDropDownAction;
};

export default class TagMenu {
  isActive: boolean = false;
  view: View;
  notebookCollection: NotebookCollection;
  toolbar: Toolbar;
  colorPickersByPaperId: Map<Id<Paper>, ColorDropDownAction> = new Map();
  toolsByPaperId: Map<Id<Paper>, Tool> = new Map();
  activeTool: Tool | null = null;

  constructor(
    view: View,
    notebookCollection: NotebookCollection,
    toolbar: Toolbar
  ) {
    this.view = view;
    this.notebookCollection = notebookCollection;
    this.toolbar = toolbar;
  }

  getTagOptions(): TagOption[] {
    const options: TagOption[] = [];

    const allTags = this.notebookCollection.activeTagPapers();

    let offset = PAPER_HEIGHT - 20;

    for (const paper of allTags) {
      let tool = this.toolsByPaperId.get(paper.id);

      if (!tool) {
        tool = new CardTool("tag", (targetPaper, position) =>
          paper.transcludeTo(targetPaper, { position, locked: false })
        );
        this.toolsByPaperId.set(paper.id, tool);
      }

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
        tool,
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
        const highlightIsActive = options.some(
          (option) => option.colorPicker.value !== NO_STICKY_NOTE_COLOR
        );

        console.log(options.map((o) => o.colorPicker.value));

        Paper.noBackgroundColors = highlightIsActive;

        return true;
      }

      if (
        Rect.isPointInside(
          {
            position: option.position,
            width: option.paper.width,
            height: option.paper.height,
          },
          point
        )
      ) {
        this.activeTool = option.tool;
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
        isSelected: option.tool === this.activeTool,
      });

      option.colorPicker.render(r);
    }
  }
}
