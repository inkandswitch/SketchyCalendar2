import { isToday } from "date-fns";
import { Id } from "id";
import { GoogleCalendar } from "lib/googlecalendar";
import { Point } from "lib/point";
import Render, { fill, fillAndStroke, font, stroke } from "lib/render";
import { Notebook, State } from "./notebook";
import { NewPaperInstanceProps, PaperInstance } from "./paperinstance";
import { NewTextProps, Text } from "./text";
import { Stroke } from "./ink";
import { Vec } from "lib/vec";
import { Polygon } from "lib/polygon";
import { Link } from "./link";
import {
  UNDERLAY_INK_COLOR,
  SELECTION_COLOR,
  SHADOW_COLOR,
  UNDERLAY_BACKGROUND_COLOR,
  LINK_COLORS,
} from "../constants";
import { generateId } from "id";

export type Background = null | string | Id<PaperProps> | CalendarBackground;

export type PaperRenderOptions = {
  isBackground?: boolean;
  isSelected?: boolean;
  hasShadow?: boolean;
  highlighted?: boolean;
};

export function isCalendarBackground(
  background: Background
): background is CalendarBackground {
  if (
    background &&
    typeof background === "object" &&
    background.type === "Calendar"
  ) {
    return true;
  }

  return false;
}

export type PaperProps = {
  id: Id<Paper>;
  width: number;
  height: number;
  background: Background;
};

export type CalendarBackground = {
  type: "Calendar";
  date: Date;
};

export class Paper {
  #state: State;

  id: Id<Paper>;
  width: number;
  height: number;
  background: Background;

  children: Array<PaperInstance>;
  texts: Array<Text>;
  strokes: Array<Stroke>;

  constructor(
    state: State,
    props: PaperProps,
    children: Array<PaperInstance>,
    texts: Array<Text>,
    strokes: Array<Stroke>
  ) {
    this.#state = state;
    this.id = props.id;
    this.width = props.width;
    this.height = props.height;
    this.background = props.background;
    this.children = children;
    this.texts = texts;
    this.strokes = strokes;
  }

  static fromId(state: State, id: Id<Paper>) {
    const cached = state.objMap.get(id) as Paper | undefined;
    if (cached) {
      return cached;
    }

    const children = (state.paperChildrenMap.get(id) ?? []).map((props) =>
      PaperInstance.fromId(state, props.id)
    );

    const texts = (state.textChildrenMap.get(id) ?? []).map((props) =>
      Text.fromId(state, props.id)
    );

    const strokes = (state.strokeChildrenMap.get(id) ?? []).map(
      (props) => new Stroke(state, props)
    );

    const props = state.props.papers[id];
    const paper = new Paper(state, props, children, texts, strokes);
    state.objMap.set(props.id, paper);
    return paper;
  }

  static create(state: State, props: PaperProps) {
    const paper = new Paper(state, props, [], [], []);

    state.docHandle.change((state) => {
      state.papers[props.id] = props;
    });

    state.objMap.set(props.id, paper);
    return paper;
  }

  copy(): Paper {
    const newPaper = Paper.create(this.#state, {
      id: generateId<Paper>(),
      width: this.width,
      height: this.height,
      background: this.background,
    });

    for (const text of this.texts) {
      text.copy(newPaper.id);
    }

    for (const stroke of this.strokes) {
      stroke.copy(newPaper.id);
    }

    return newPaper;
  }

  getLinkAtPosition(position: Point): Link | null {
    for (const text of this.texts) {
      const link = this.#state.props.links[text.id];

      if (!link) {
        continue;
      }

      if (text.isPointInside(position)) {
        return Link.fromId(this.#state, link.id);
      }
    }

    for (const paperInstance of this.children) {
      const localPosition = Vec.sub(position, paperInstance);

      const link = paperInstance.paper.getLinkAtPosition(localPosition);
      if (link) {
        return link;
      }
    }

    return null;
  }

  get notebook() {
    return this.#state.notebook;
  }

  addNewPaper(props: Omit<NewPaperInstanceProps, "parentId">) {
    const paperInstance = PaperInstance.create(this.#state, {
      parentId: this.id,
      siblingIndex: props.siblingIndex,
      x: props.x,
      y: props.y,
      background: props.background,
      width: props.width,
      height: props.height,
      locked: props.locked,
      labels: props.labels,
    });

    return paperInstance;
  }

  transcludeTo(
    paper: Paper,
    { position, labels }: { position: Point; labels?: string[] }
  ): PaperInstance {
    return PaperInstance.createInstanceOf(this.#state, {
      paperId: this.id,
      parentId: paper.id,
      siblingIndex: 0,
      x: position.x,
      y: position.y,
      locked: true,
      labels,
    });
  }

  addNewText(props: Omit<NewTextProps, "parentId">) {
    return Text.create(this.#state, {
      ...props,
      parentId: this.id,
    });
  }

  addNewStroke(color: string, weight: number) {
    return Stroke.create(this.#state, this.id, color, weight);
  }

  removeStroke(strokeId: Id<Stroke>) {
    this.#state.docHandle.change((state) => {
      delete state.strokes[strokeId];
    });
  }

  setColor(color: string) {
    this.#state.docHandle.change((state) => {
      const paper = state.papers[this.id];
      paper.background = color;
    });
  }

  render(r: Render, position: Point, options: PaperRenderOptions = {}) {
    const {
      hasShadow = false,
      isSelected = false,
      isBackground = false,
      highlighted = false,
    } = options;

    // Render background color if specified
    let backgroundColor = stroke("#999", 1);
    if (typeof this.background == "string") {
      backgroundColor = isBackground
        ? fillAndStroke(UNDERLAY_BACKGROUND_COLOR, UNDERLAY_INK_COLOR, 1)
        : fillAndStroke(this.background, "#00000022", 1);
    }

    if (hasShadow) {
      r.rect(
        position.x + 3,
        position.y + 3,
        this.width,
        this.height,
        fill(SHADOW_COLOR)
      );
    }

    if (isSelected) {
      r.rect(
        position.x - 2,
        position.y - 2,
        this.width + 4,
        this.height + 4,
        fill(SELECTION_COLOR)
      );
    }

    r.rect(position.x, position.y, this.width, this.height, backgroundColor);

    if (highlighted) {
      r.rect(
        position.x,
        position.y,
        this.width,
        this.height,
        fill("#0000FF0A")
      );
    }
    if (isCalendarBackground(this.background)) {
      // Render background
      renderCalendarBackground(
        r,
        this,
        position,
        this.background.date,
        this.notebook
      );
    }

    // Render page contents
    for (const text of this.texts) {
      text.render(r, position, isBackground);
    }

    for (const stroke of this.strokes) {
      if (!Stroke.selected.has(stroke.props.id)) {
        stroke.render(r, position, isBackground);
      }
    }

    // Render children back to front
    const sortedChildren = this.children.sort(
      (a: PaperInstance, b: PaperInstance) => a.siblingIndex - b.siblingIndex
    );

    // Render last so they appear on top
    for (const child of sortedChildren) {
      child.render(r, position, isBackground);
    }

    // Render selected strokes on top again
    for (const stroke of this.strokes) {
      if (Stroke.selected.has(stroke.props.id)) {
        stroke.render(r, position, isBackground);
      }
    }
  }

  getPaperAtPosition(
    position: Point,
    offset: Point = { x: 0, y: 0 },
    ignore: Set<Id<Paper>> = new Set()
  ): { paper: Paper; offset: Point } | null {
    if (ignore.has(this.id)) return null;

    const x = position.x - offset.x;
    const y = position.y - offset.y;

    // Sort so we start with the topmost paper instance
    const sortedChildren = this.children.sort(
      (a: PaperInstance, b: PaperInstance) => b.siblingIndex - a.siblingIndex
    );

    if (x >= 0 && y >= 0 && x <= this.width && y <= this.height) {
      for (const paperInstance of sortedChildren) {
        const childOffset = Vec.add(paperInstance, offset);
        const childPaper = paperInstance.paper.getPaperAtPosition(
          position,
          childOffset,
          ignore
        );
        if (childPaper) {
          return childPaper;
        }
      }

      return { paper: this, offset };
    }

    return null;
  }

  getStrokesInsideHull(
    hull: Polygon,
    offset: Point = { x: 0, y: 0 }
  ): Set<Id<Stroke>> {
    let found = new Set<Id<Stroke>>();
    for (const stroke of this.strokes) {
      for (const pt of stroke.props.points) {
        const offsestPt = Vec.add(pt, offset);
        if (Polygon.isPointInside(hull, offsestPt)) {
          found.add(stroke.props.id);
          break; // No need to check other points in the stroke
        }
      }
    }

    for (const paperInstance of this.children) {
      const childOffset = Vec.add(paperInstance, offset);
      const childFound = paperInstance.paper.getStrokesInsideHull(
        hull,
        childOffset
      );
      for (const strokeId of childFound) {
        found.add(strokeId);
      }
    }

    return found;
  }
}

function renderCalendarBackground(
  r: Render,
  paper: Paper,
  position: Point,
  date: Date,
  notebook: Notebook
) {
  // Draw calendar grid
  const calendarHeight = paper.height;

  for (let i = 0; i < 13; i++) {
    const hour = i + 8;
    const offset = (calendarHeight / 13) * i;
    const y = position.y + offset;
    r.text(`${hour}:00`, position.x + 10, y + 10, font("12px Arial", "#CCC"));

    r.line(position.x, y, position.x + paper.width, y, stroke("#CCC", 1));
  }

  if (isToday(date)) {
    const offset = getTimeOffset(new Date(), 8, 21, 0, calendarHeight);

    r.line(
      position.x,
      position.y + offset,
      position.x + paper.width,
      position.y + offset,
      stroke(LINK_COLORS[notebook.color], 1)
    );
  }

  const events = notebook.googleCalendar.getEventsOnDay(date);

  for (const event of events) {
    const start = new Date(event.start!.dateTime!);
    const start_offset = getTimeOffset(start, 8, 21, 0, calendarHeight);
    const end = new Date(event.end!.dateTime!);
    const end_offset = getTimeOffset(end, 8, 21, 0, calendarHeight);
    r.round_rect(
      position.x + 50,
      position.y + start_offset,
      paper.width - 50,
      end_offset - start_offset,
      3,
      fill("#00000011")
    );
    r.text(
      event.summary!,
      position.x + 60,
      position.y + start_offset + 15,
      fill("#AAA")
    );
  }
}

function getTimeOffset(
  date: Date,
  startHour: number,
  endHour: number,
  offsetStart: number,
  offsetEnd: number
): number {
  const totalMinutesInRange = (endHour - startHour) * 60;
  const minutesSinceStart =
    (date.getHours() - startHour) * 60 + date.getMinutes();

  // Clamp minutesSinceStart between 0 and totalMinutesInRange
  const clampedMinutes = Math.max(
    0,
    Math.min(minutesSinceStart, totalMinutesInRange)
  );

  const ratio = clampedMinutes / totalMinutesInRange;
  const offset = offsetStart + ratio * (offsetEnd - offsetStart);

  return offset;
}
