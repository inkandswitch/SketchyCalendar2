import { Id } from "id";
import { DocHandle, Repo } from "@automerge/automerge-repo";
import { ThingMap, buildThingChildrenMap } from "things/thingmap";
import { EventEmitter } from "eventemitter3";
import { NewPaperInstanceProps, PaperInstanceProps } from "./paperinstance";
import { PaperInstance } from "./paperinstance";
import { Paper } from "./paper";
import { NewPageProps, Page, PageProps } from "./page";
import { PaperProps } from "./paper";
import { StrokeProps } from "./ink";
import { Text, TextProps } from "./text";
import {
  isMonday,
  nextMonday,
  getYear,
  previousMonday,
  getMonth,
  getWeek,
  addDays,
  formatISO,
} from "date-fns";

export type NotebookProps = {
  pages: Record<Id<Page>, PageProps>;
  papers: Record<Id<Paper>, PaperProps>;
  paperInstances: Record<Id<PaperInstance>, PaperInstanceProps>;
  strokes: Record<Id<StrokeProps>, StrokeProps>;
  texts: Record<Id<Text>, TextProps>;
};

export type State = {
  docHandle: DocHandle<NotebookProps>;
  props: NotebookProps;
  objMap: Map<string, any>;
  paperChildrenMap: Map<Id<Paper>, Array<PaperInstanceProps>>;
  pageChildrenMap: Map<Id<Page>, Array<PageProps>>;
  textChildrenMap: Map<Id<Paper>, Array<TextProps>>;
  strokeChildrenMap: Map<Id<Paper>, Array<StrokeProps>>;
};

type NotebookEvents = {
  changed: () => void;
};

export class Notebook extends EventEmitter<NotebookEvents> {
  #state: State;

  paperChildrenMap: Map<Id<Paper>, Array<PaperInstanceProps>> = new Map();
  paperInstances: Map<Id<PaperInstance>, PaperInstance> = new Map();

  papers: Map<Id<PaperProps>, Paper> = new Map();

  constructor(docHandle: DocHandle<NotebookProps>) {
    super();

    const props = docHandle.doc();

    this.#state = {
      docHandle,
      props,
      objMap: new Map(),
      paperChildrenMap: new Map(),
      pageChildrenMap: new Map(),
      textChildrenMap: new Map(),
      strokeChildrenMap: new Map(),
    };

    docHandle.addListener("change", this.#onChange);
    this.rebuild();
  }

  static create(repo: Repo) {
    const docHandle = repo.create<NotebookProps>({
      pages: {},
      papers: {},
      paperInstances: {},
      strokes: {},
      texts: {},
    });

    return new Notebook(docHandle);
  }

  #onChange = () => {
    this.emit("changed");
    this.rebuild();
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

  get rootPages(): Array<Page> {
    return this.pages
      .filter((page) => {
        return page.parent == null;
      })
      .sort((a, b) => a.siblingIndex - b.siblingIndex);
  }

  get documentId(): string {
    return this.#state.docHandle.documentId;
  }

  get state(): State {
    return this.#state;
  }
}

//const FONT = "200px Arial";
const FONT = "30px Arial";

const WEEK_DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function addCalendarPages(
  notebook: Notebook,
  year: number,
  pageWidth: number,
  pageHeight: number
) {
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
    value: "2024 Calendar",
    x: 50,
    y: 50,
    font: FONT,
  });

  const monthDates = [];
  const monthPages = [];

  // pages for each month

  for (let monthNumber = 0; monthNumber < 12; monthNumber++) {
    const monthDate = new Date(year, monthNumber, 1);
    const monthPage = rootPage.addChildPage({
      siblingIndex: monthNumber,
      width: pageWidth,
      height: pageHeight,
      background: null,
    });

    monthPage.paper.addNewText({
      siblingIndex: 0,
      value: monthDate.toLocaleString("default", { month: "long" }),
      x: 50,
      y: 50,
      font: FONT,
    });

    WEEK_DAY_NAMES.forEach((weekday, index) => {
      monthPage.paper.addNewText({
        siblingIndex: index,
        value: weekday,
        x: 50 + DAY_WIDTH * index,
        y: 100,
        font: FONT,
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
      siblingIndex: weekNumber,
      width: pageWidth,
      height: pageHeight,
      background: null,
    });

    weekPage.paper.addNewText({
      siblingIndex: weekNumber,
      value: `Week ${weekNumber}`,
      x: 50,
      y: 50,
      font: FONT,
    });

    WEEK_DAY_NAMES.forEach((weekday, index) => {
      weekPage.paper.addNewText({
        siblingIndex: index,
        value: weekday,
        x: 50 + DAY_WIDTH * index,
        y: 100,
        font: FONT,
      });
    });

    // create day pages

    for (let dayNumber = 0; dayNumber < 7; dayNumber++) {
      const dayDate = addDays(currentDayInWeek, dayNumber);

      const dayPage = weekPage.addChildPage({
        siblingIndex: dayNumber,
        width: pageWidth,
        height: pageHeight,
        background: null,
      });

      dayPage.paper.addNewText({
        siblingIndex: 0,
        value: dayDate.toLocaleString("default", { weekday: "short" }),
        x: 50,
        y: 50,
        font: FONT,
      });

      // monthly section

      const dayMonthlySection = dayPage.paper.addNewPaper({
        siblingIndex: 0,
        width: DAY_WIDTH,
        height: DAY_MONTHLY_SECTION_HEIGHT,
        background: null,
        x: 0,
        y: SPACE_TOP,
      });

      dayMonthlySectionByDay.set(dayToKey(dayDate), dayMonthlySection.paper);

      dayMonthlySection.paper.addNewText({
        siblingIndex: 0,
        value: dayDate.toLocaleString("default", {
          day: "numeric",
          month: "short",
        }),
        x: 25,
        y: 25,
        font: FONT,
      });

      // day timeline

      const dayTimeline = dayPage.paper.addNewPaper({
        siblingIndex: 0,
        width: DAY_WIDTH,
        height: pageHeight - SPACE_TOP - DAY_MONTHLY_SECTION_HEIGHT,
        background: {
          type: "Calendar",
        },
        x: 0,
        y: SPACE_TOP + DAY_MONTHLY_SECTION_HEIGHT,
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
