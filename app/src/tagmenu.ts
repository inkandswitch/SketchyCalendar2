import { ColorDropDownAction } from "actionbar";
import {
  FONT_BIG,
  NO_STICKY_NOTE_COLOR,
  STICKY_NOTE_COLORS,
  TAG_PAPER_WIDTH,
} from "constants";
import { Id } from "id";
import { Point } from "lib/point";
import { Rect } from "lib/rect";
import Render, { fillAndStroke, font } from "lib/render";
import { NotebookCollection } from "things/notebook";
import { Paper } from "things/paper";
import { Tool } from "toolbar";
import CardTool from "tools/card";
import { View } from "view";

type TagOption = {
  paper: Paper;
  position: Point;
  tool: Tool;
  colorPicker: ColorDropDownAction;
};

type TagMenuUiElements = {
  options: TagOption[];
  container: Rect;
};

export default class TagMenu {
  isActive: boolean = false;
  isExpanded: boolean = false;
  view: View;
  notebookCollection: NotebookCollection;
  colorPickersByPaperId: Map<Id<Paper>, ColorDropDownAction> = new Map();
  toolsByPaperId: Map<Id<Paper>, Tool> = new Map();
  activeTool: Tool | null = null;

  constructor(view: View, notebookCollection: NotebookCollection) {
    this.view = view;
    this.notebookCollection = notebookCollection;
  }

  getTagMenuUiElements(): TagMenuUiElements | null {
    const HEADER_HEIGHT = 60;

    const allTags = this.notebookCollection.activeTagPapers();

    if (allTags.length === 0) {
      return null;
    }

    if (!this.isExpanded || allTags.length === 0) {
      return {
        options: [],
        container: {
          position: { x: 20, y: window.innerHeight - HEADER_HEIGHT },
          width: TAG_PAPER_WIDTH + 80,
          height: HEADER_HEIGHT,
        },
      };
    }

    const options: TagOption[] = [];

    let offset = window.innerHeight - 20;

    for (const paper of allTags) {
      let tool = this.toolsByPaperId.get(paper.id);

      if (!tool) {
        tool = new CardTool("tag", (targetPaper, position) => {
          const newPaperInstance = paper.transcludeTo(targetPaper, {
            position,
            locked: false,
          });

          // aweful hack, need to wait so order is applied to new version
          setTimeout(() => {
            this.view.focusedPage!.paper.orderTags();
          }, 100);

          return newPaperInstance;
        });
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
        x: 40 + paper.width + 5,
        y: offset - colorPicker.height,
      };

      options.push({
        paper,
        position: {
          x: 40,
          y: offset - paper.height - (colorPicker.height - paper.height) / 2,
        },
        tool,
        colorPicker,
      });

      offset -= colorPicker.height;
    }

    const lastOption = options[options.length - 1];

    const containerHeight =
      HEADER_HEIGHT + (window.innerHeight - lastOption.position.y);

    return {
      options,
      container: {
        position: { x: 20, y: window.innerHeight - containerHeight },
        width: TAG_PAPER_WIDTH + 80,
        height: containerHeight,
      },
    };
  }

  tap(point: Point): boolean {
    if (!this.isActive) return false;

    const uiElements = this.getTagMenuUiElements();

    if (!uiElements) return false;

    const { options, container } = uiElements;

    for (const option of options) {
      if (option.colorPicker.tap(point)) {
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

    if (Rect.isPointInside(container, point)) {
      Paper.colorByTagsMode = this.isExpanded = !this.isExpanded;
      return true;
    }

    return false;
  }

  render(r: Render) {
    if (!this.isActive) return;

    const uiElements = this.getTagMenuUiElements();

    if (!uiElements) return;

    const { options, container } = uiElements;

    r.rect(
      container.position.x,
      container.position.y,
      container.width,
      container.height,
      fillAndStroke("white", "#eee", 1)
    );

    r.text(
      "Tags",
      container.position.x + 20,
      container.position.y + 10,
      font(FONT_BIG)
    );

    for (const option of options) {
      option.paper.render(r, option.position, {
        hasShadow: true,
        isSelected: option.tool === this.activeTool,
      });

      option.colorPicker.render(r);
    }
  }
}
