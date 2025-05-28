import { EventEmitter } from "eventemitter3";

import {
  addDays,
  getMonth,
  getWeek,
  getYear,
  isMonday,
  nextMonday,
  previousMonday,
} from "date-fns";

import { DocHandle, Repo } from "@automerge/automerge-repo";
import { Id } from "id";
import { buildThingChildrenMap } from "things/thingmap";

import { NewPageProps, Page, PageProps } from "things/page";
import {
  NewPaperInstanceProps,
  PaperInstance,
  PaperInstanceProps,
} from "things/paperinstance";

import { Calendar, GoogleCalendar } from "lib/googlecalendar";
import { Stroke, StrokeProps } from "things/ink";
import { Paper, PaperProps } from "things/paper";
import { Text, TextProps } from "things/text";

export type NotebookProps = {
  pages: Record<Id<Page>, PageProps>;
  papers: Record<Id<Paper>, PaperProps>;
  paperInstances: Record<Id<PaperInstance>, PaperInstanceProps>;
  strokes: Record<Id<Stroke>, StrokeProps>;
  texts: Record<Id<Text>, TextProps>;
};

export type State = {
  notebook: Notebook;
  docHandle: DocHandle<NotebookProps>;
  props: NotebookProps;
  objMap: Map<string, any>;
  paperChildrenMap: Map<Id<Paper>, Array<PaperInstanceProps>>;
  pageChildrenMap: Map<Id<Page>, Array<PageProps>>;
  textChildrenMap: Map<Id<Paper>, Array<TextProps>>;
  strokeChildrenMap: Map<Id<Paper>, Array<StrokeProps>>;
  googleCalendar: GoogleCalendar;
};

type NotebookEvents = {
  changed: () => void;
};

export class NotebookCollection extends EventEmitter<NotebookEvents> {
  constructor() {
    super();
  }

  notebooks: Set<Notebook> = new Set();

  addNotebook(notebook: Notebook) {
    this.notebooks.add(notebook);
    notebook.addListener("changed", this.#onChange);
    this.#onChange();
  }

  #onChange = () => {
    this.emit("changed");
  };

  get rootPages(): Array<Page> {
    return Array.from(this.notebooks.values())
      .flatMap((notebook) => notebook.pages)
      .filter((page) => {
        return page.parent == null;
      })
      .sort((a, b) => a.siblingIndex - b.siblingIndex);
  }
}

export class Notebook extends EventEmitter<NotebookEvents> {
  #state: State;

  paperChildrenMap: Map<Id<Paper>, Array<PaperInstanceProps>> = new Map();
  paperInstances: Map<Id<PaperInstance>, PaperInstance> = new Map();

  papers: Map<Id<PaperProps>, Paper> = new Map();

  constructor(
    docHandle: DocHandle<NotebookProps>,
    calendarDocHandle?: DocHandle<Calendar>
  ) {
    super();

    const props = docHandle.doc();

    this.#state = {
      notebook: this,
      docHandle,
      props,
      objMap: new Map(),
      paperChildrenMap: new Map(),
      pageChildrenMap: new Map(),
      textChildrenMap: new Map(),
      strokeChildrenMap: new Map(),
      googleCalendar: new GoogleCalendar(calendarDocHandle),
    };

    docHandle.addListener("change", this.#onChange);
    this.rebuild();
  }

  static create(repo: Repo, calendarDocHandle?: DocHandle<Calendar>) {
    const docHandle = repo.create<NotebookProps>({
      pages: {},
      papers: {},
      paperInstances: {},
      strokes: {},
      texts: {},
    });

    return new Notebook(docHandle, calendarDocHandle);
  }

  #onChange = () => {
    this.rebuild();
    this.emit("changed");
  };

  destroy() {
    this.#state.docHandle.removeListener("change", this.#onChange);
  }

  rebuild() {
    const props = this.#state.docHandle.doc();

    this.#state.props = props;

    this.#state.objMap.clear();

    this.#state.paperChildrenMap = buildThingChildrenMap(props.paperInstances);
    this.#state.pageChildrenMap = buildThingChildrenMap(props.pages);
    this.#state.textChildrenMap = buildThingChildrenMap(props.texts);
    this.#state.strokeChildrenMap = buildThingChildrenMap(props.strokes, false);
  }

  createPaper(props: NewPaperInstanceProps): PaperInstance {
    return PaperInstance.create(this.#state, props);
  }

  createPage(props: NewPageProps): Page {
    return Page.create(this.#state, props);
  }

  get pages() {
    return Object.keys(this.#state.props.pages).map((pageId) =>
      Page.fromId(this.#state, pageId as Id<Page>)
    );
  }

  get documentId(): string {
    return this.#state.docHandle.documentId;
  }

  getPageById(id: Id<Page>): Page {
    return Page.fromId(this.#state, id);
  }

  getStrokeById(id: Id<Stroke>): Stroke {
    return Stroke.fromId(this.#state, id);
  }

  getPaperInstanceById(id: Id<PaperInstance>): PaperInstance {
    return PaperInstance.fromId(this.#state, id);
  }
}

//const FONT = "200px Arial";
const FONT_BIG = "100 30px Avenir";
const FONT_SMALL = "100 16px Avenir";

const WEEK_DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function addCalendarPages({
  notebook,
  title,
  year,
  pageWidth,
  pageHeight,
}: {
  title: string;
  notebook: Notebook;
  year: number;
  pageWidth: number;
  pageHeight: number;
}) {
  const SPACE_TOP = 150;
  const DAY_MONTHLY_SECTION_HEIGHT = (pageHeight - SPACE_TOP) / 6;
  const DAY_WIDTH = pageWidth / 7;

  // year overview page

  const rootPage = notebook.createPage({
    parentId: null,
    siblingIndex: 0,
    width: pageWidth,
    height: pageHeight,
    background: null,
  });

  rootPage.paper.addNewText({
    siblingIndex: 0,
    value: `${title} ${year.toString()}`,
    x: 10,
    y: 10,
    font: FONT_BIG,
  });

  // test page
  // rootPage.paper.addNewPaper({
  //   siblingIndex: 0,
  //   width: DAY_WIDTH,
  //   height: pageHeight,
  //   background: {
  //     type: "Calendar",
  //     date: new Date(),
  //   },
  //   x: 400,
  //   y: 0,
  // });

  const monthDates = [];
  const monthPages = [];

  // pages for each month

  for (let monthNumber = 0; monthNumber < 12; monthNumber++) {
    const monthDate = new Date(year, monthNumber, 1);
    const monthPage = rootPage.addChildPage({
      siblingIndex: monthNumber * 10000,
      width: pageWidth,
      height: pageHeight,
      background: null,
    });

    monthPage.paper.addNewText({
      siblingIndex: 0,
      value: monthDate.toLocaleString("default", { month: "long" }),
      x: 10,
      y: 10,
      font: FONT_BIG,
    });

    WEEK_DAY_NAMES.forEach((weekday, index) => {
      monthPage.paper.addNewText({
        siblingIndex: index,
        value: weekday,
        x: 10 + DAY_WIDTH * index,
        y: 110,
        font: FONT_BIG,
      });
    });

    monthDates.push(monthDate);
    monthPages.push(monthPage);
  }

  let currentDayInWeek = monthDates[0];

  const dayMonthlySectionByDay = new Map<string, Paper>();

  // pages for each week with daily page

  while (getYear(currentDayInWeek) === year) {
    const monthNumber = getMonth(currentDayInWeek);
    const monthPage = monthPages[monthNumber];
    const weekNumber = getWeek(currentDayInWeek);

    // currentDayInWeek might not be aligned to the start of the week
    // so here we make sure it is
    currentDayInWeek = getStartOfWeek(currentDayInWeek);

    const weekPage = monthPage.addChildPage({
      siblingIndex: weekNumber * 10000,
      width: pageWidth,
      height: pageHeight,
      background: null,
    });

    weekPage.paper.addNewText({
      siblingIndex: weekNumber,
      value: `Week ${weekNumber}`,
      x: 10,
      y: 10,
      font: FONT_BIG,
    });

    WEEK_DAY_NAMES.forEach((weekday, index) => {
      weekPage.paper.addNewText({
        siblingIndex: index,
        value: weekday,
        x: 10 + DAY_WIDTH * index,
        y: 110,
        font: FONT_BIG,
      });
    });

    // create day pages

    for (let dayNumber = 0; dayNumber < 7; dayNumber++) {
      const dayDate = addDays(currentDayInWeek, dayNumber);

      const dayPage = weekPage.addChildPage({
        siblingIndex: dayNumber * 10000,
        width: pageWidth,
        height: pageHeight,
        background: null,
      });

      dayPage.paper.addNewText({
        siblingIndex: 0,
        value: dayDate.toLocaleString("default", { weekday: "short" }),
        x: 10,
        y: 10,
        font: FONT_BIG,
      });

      // monthly section

      const dayMonthlySection = dayPage.paper.addNewPaper({
        siblingIndex: 0,
        width: DAY_WIDTH,
        height: DAY_MONTHLY_SECTION_HEIGHT,
        background: null,
        x: 0,
        y: SPACE_TOP,
        locked: true,
      });

      dayMonthlySectionByDay.set(dayToKey(dayDate), dayMonthlySection.paper);

      dayMonthlySection.paper.addNewText({
        siblingIndex: 0,
        value: dayDate.toLocaleString("default", {
          day: "numeric",
          month: "short",
        }),
        x: 10,
        y: 10,
        font: FONT_SMALL,
      });

      // day timeline

      const dayTimeline = dayPage.paper.addNewPaper({
        siblingIndex: 0,
        width: DAY_WIDTH,
        height: pageHeight - SPACE_TOP - DAY_MONTHLY_SECTION_HEIGHT,
        background: {
          type: "Calendar",
          date: dayDate,
        },
        x: 0,
        y: SPACE_TOP + DAY_MONTHLY_SECTION_HEIGHT,
        locked: true,
      });

      // tranclusions to week page

      dayMonthlySection.paper.transcludeTo(weekPage.paper, {
        x: dayNumber * DAY_WIDTH,
        y: SPACE_TOP,
      });

      dayTimeline.paper.transcludeTo(weekPage.paper, {
        x: dayNumber * DAY_WIDTH,
        y: SPACE_TOP + DAY_MONTHLY_SECTION_HEIGHT,
      });
    }

    currentDayInWeek = nextMonday(currentDayInWeek);
  }

  // create transclusions to month pages from each day

  for (let monthNumber = 0; monthNumber < 12; monthNumber++) {
    const monthPage = monthPages[monthNumber];
    let currentDayInWeek = monthDates[monthNumber];
    let row = 0;

    while (getMonth(currentDayInWeek) === monthNumber) {
      // currentDayInWeek might not be aligned to the start of the week
      // so here we make sure it is
      currentDayInWeek = getStartOfWeek(currentDayInWeek);

      for (let dayNumber = 0; dayNumber < 7; dayNumber++) {
        const dayDate = addDays(currentDayInWeek, dayNumber);

        const dayMonthlySection = dayMonthlySectionByDay.get(
          dayToKey(dayDate)
        )!;

        dayMonthlySection.transcludeTo(monthPage.paper, {
          x: dayNumber * DAY_WIDTH,
          y: SPACE_TOP + row * DAY_MONTHLY_SECTION_HEIGHT,
        });
      }

      currentDayInWeek = nextMonday(currentDayInWeek);

      row++;
    }
  }
}

function getStartOfWeek(date: Date): Date {
  if (isMonday(date)) {
    return date;
  }

  return previousMonday(date);
}

function dayToKey(date: Date): string {
  return date.toLocaleString("default", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
