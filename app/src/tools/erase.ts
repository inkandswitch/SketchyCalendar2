import { TouchEvent } from "gesturesystem";
import { View } from "view";
import { NotebookCollection } from "things/notebook";

import { Vec } from "lib/vec";
import { Tool, ToolHandler } from "toolbar";

export default class EraseTool extends Tool {
  icon: string;
  radius: number;

  constructor(radius: number) {
    super();

    this.icon = "eraser";
    this.radius = radius;
  }

  getHandler(view: View, notebook: NotebookCollection): ToolHandler {
    return new EraseHandler(view, notebook, this.radius);
  }
}

export class EraseHandler implements ToolHandler {
  view: View;
  notebook: NotebookCollection;

  radius: number;

  constructor(view: View, notebook: NotebookCollection, radius: number = 20) {
    this.view = view;
    this.notebook = notebook;
    this.radius = radius;
  }

  erase(e: TouchEvent) {
    // Get the current paper
    const currentPage = this.view.focusedPage!;
    if (!currentPage) return;
    const screenPos = this.view.camera.screenToWorld(e.current);
    const found = currentPage.paper.getPaperAtPosition(screenPos);
    if (!found) return;

    const scaledRadius = this.radius / (this.view.camera.zoom * 2);

    const local_pos = Vec.sub(screenPos, found.offset);
    for (const stroke of found.paper.strokes) {
      for (const point of stroke.props.points) {
        if (Vec.dist(point, local_pos) < scaledRadius) {
          found.paper.removeStroke(stroke.props.id);
          break;
        }
      }
    }
  }

  // Tool-specific methods
  penDown(e: TouchEvent) {
    this.erase(e);
  }

  penMove(e: TouchEvent) {
    this.erase(e);
  }

  penUp(e: TouchEvent) {}
}
