import { Id } from "id";
import { Point } from "lib/point";
import Render, { fill, fillAndStroke, font, stroke } from "lib/render";
import { State } from "./notebook";
import { NewPaperInstanceProps, PaperInstance } from "./paperinstance";
import { NewTextProps, Text } from "./text";
import { Stroke } from "./ink";

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

  render(r: Render, position: Point) {
    r.rect(
      position.x,
      position.y,
      this.width,
      this.height,
      fillAndStroke("white", "black", 1)
    );

    if (isCalendarBackground(this.background)) {
      renderCalendarBackground(r, this, position, this.background);
    }

    for (const child of this.children) {
      child.render(r, position);
    }

    for (const text of this.texts) {
      text.render(r, position);
    }
  }
}

function renderCalendarBackground(
  r: Render,
  paper: Paper,
  position: Point,
  background: CalendarBackground
) {
  const date = new Date();

  // Draw calendar grid
  const calendarHeight = paper.height;

  for (let i = 0; i < 13; i++) {
    const hour = i + 8;
    const offset = (calendarHeight / 13) * i;
    const y = position.y + offset;
    r.text(`${hour}:00`, position.x + 10, y + 15, fill("#AAA"));

    r.line(position.x, y, position.x + paper.width, y, stroke("#AAA", 1));
  }

  const isToday = false;
  /*        card.props &&
      new Date(card.props.date).toDateString() == new Date().toDateString();*/

  if (isToday) {
    const offset = getTimeOffset(new Date(), 8, 21, 0, calendarHeight);

    r.line(
      position.x,
      position.y + offset,
      position.x + paper.width,
      position.y + offset,
      stroke("#cc7474", 1)
    );
  }

  // const events = []; //getEventsOnDay(date, calendarIds, this.calendarDocHandle);
  // for (const event of events) {
  //   const start = new Date(event.start!.dateTime!);
  //   const start_offset =
  //     headerHeight + getTimeOffset(start, 8, 21, 0, calendarHeight);
  //   const end = new Date(event.end!.dateTime!);
  //   const end_offset =
  //     headerHeight + getTimeOffset(end, 8, 21, 0, calendarHeight);
  //   render.round_rect(
  //     instance.x + 50,
  //     instance.y + start_offset,
  //     card.width - 50,
  //     end_offset - start_offset,
  //     3,
  //     fill("#00000011")
  //   );
  //   render.text(
  //     event.summary!,
  //     instance.x + 60,
  //     instance.y + start_offset + 15,
  //     fill("#AAA")
  //   );
  // }
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
