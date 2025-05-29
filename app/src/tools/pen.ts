import { TouchEvent } from "gesturesystem";
import { View } from "view";

import { Point } from "lib/point";
import { Vec } from "lib/vec";
import { Tool, ToolHandler } from "toolbar";

import { Id } from "id";
import { Stroke } from "things/ink";
import { Paper } from "things/paper";

export default class PenTool extends Tool {
  color: string;
  weight: number;
  icon: string;

  constructor(icon: string, color: string, weight: number) {
    super();

    this.icon = icon;
    this.color = color;
    this.weight = weight;
  }

  getHandler(view: View): ToolHandler {
    return new PenHandler(view, this);
  }
}

// Pen handler
export class PenHandler implements ToolHandler {
  view: View;
  tool: PenTool;

  paperId: Id<Paper> | null = null;
  strokeId: Id<Stroke> | null = null;
  offset: Point | null = null;

  constructor(view: View, tool: PenTool) {
    this.view = view;
    this.tool = tool;
  }

  // Tool-specific methods
  penDown(e: TouchEvent) {
    const position = this.view.camera.screenToWorld(e.current);
    // Get the current paper
    const currentPage = this.view.focusedPage!;
    if (!currentPage) return;
    const found = currentPage.paper.getPaperAtPosition(position);
    if (!found) return;

    this.paperId = found.paper.id;

    // Create a new stroke
    const newStroke = found.paper.addNewStroke(
      this.tool.color,
      this.tool.weight
    );
    this.strokeId = newStroke.props.id;

    // Compute the offset, so we can add points relative to the paper
    this.offset = found.offset;
    newStroke.addPoint(Vec.sub(position, this.offset));
  }

  penMove(e: TouchEvent) {
    if (this.strokeId != null) {
      const position = this.view.camera.screenToWorld(e.current);
      const currentPage = this.view.focusedPage!;
      if (!currentPage) return;
      const found = currentPage.paper.getPaperAtPosition(position);
      if (!found) return;

      // Check if the paper has changed
      if (this.paperId !== found.paper.id) {
        this.paperId = found.paper.id;
        this.offset = found.offset;

        const newStroke = found.paper.addNewStroke(
          this.tool.color,
          this.tool.weight
        );
        this.strokeId = newStroke.props.id;
      }

      const stroke = currentPage.notebook.getStrokeById(this.strokeId);
      stroke.addPoint(Vec.sub(position, this.offset!));
    }
  }

  penUp(e: TouchEvent) {
    this.penMove(e);
    this.strokeId = null;
  }
}
