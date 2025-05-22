import { isToday } from "date-fns";
import { Id } from "id";
import { GoogleCalendar } from "lib/googlecalendar";
import { Point } from "lib/point";
import Render, { fill, fillAndStroke, font, stroke } from "lib/render";
import { State } from "./notebook";
import { NewPaperInstanceProps, PaperInstance } from "./paperinstance";
import { NewTextProps, Text } from "./text";
import { Stroke } from "./ink";
import { Vec } from "lib/vec";

export type Background = null | string | Id<PaperProps> | CalendarBackground;

function isCalendarBackground(
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

  addNewPaper(props: Omit<NewPaperInstanceProps, "parentId">) {
    const paperInstance = PaperInstance.create(this.#state, {
      parentId: this.id,
      siblingIndex: props.siblingIndex,
      x: props.x,
      y: props.y,
      background: props.background,
      width: props.width,
      height: props.height,
    });

    return paperInstance;
  }

  transcludeTo(paper: Paper, position: Point): PaperInstance {
    return PaperInstance.createInstanceOf(this.#state, {
      paperId: this.id,
      parentId: paper.id,
      siblingIndex: 0,
      x: position.x,
      y: position.y,
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

  render(r: Render, position: Point) {
    r.rect(
      position.x,
      position.y,
      this.width,
      this.height,
      fillAndStroke("white", "black", 1)
    );

    for (const text of this.texts) {
      text.render(r, position);
    }

    for (const stroke of this.strokes) {
      stroke.render(r, position);
    }

    if (isCalendarBackground(this.background)) {
      renderCalendarBackground(
        r,
        this,
        position,
        this.background.date,
        this.#state.googleCalendar
      );
    }

    // Render last so they appear on top
    for (const child of this.children) {
      child.render(r, position);
    }
  }

  getPaperAtPosition(
    position: Point,
    offset: Point = { x: 0, y: 0 }
  ): { paper: Paper; offset: Point } | null {
    const x = position.x - offset.x;
    const y = position.y - offset.y;

    if (x >= 0 && y >= 0 && x <= this.width && y <= this.height) {
      for (const paperInstance of this.children) {
        const childOffset = Vec.add(paperInstance, offset);
        const childPaper = paperInstance.paper.getPaperAtPosition(
          position,
          childOffset
        );
        if (childPaper) {
          return childPaper;
        }
      }

      return { paper: this, offset };
    }

    return null;
  }
}

function renderCalendarBackground(
  r: Render,
  paper: Paper,
  position: Point,
  date: Date,
  googleCalendar: GoogleCalendar
) {
  // Draw calendar grid
  const calendarHeight = paper.height;

  for (let i = 0; i < 13; i++) {
    const hour = i + 8;
    const offset = (calendarHeight / 13) * i;
    const y = position.y + offset;
    r.text(`${hour}:00`, position.x + 10, y + 15, font("12px Arial", "#AAA"));

    r.line(position.x, y, position.x + paper.width, y, stroke("#AAA", 1));
  }

  if (isToday(date)) {
    const offset = getTimeOffset(new Date(), 8, 21, 0, calendarHeight);

    r.line(
      position.x,
      position.y + offset,
      position.x + paper.width,
      position.y + offset,
      stroke("#cc7474", 1)
    );
  }

  const events = googleCalendar.getEventsOnDay(date);

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
