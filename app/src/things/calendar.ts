import {
  addDays,
  getMonth,
  getWeek,
  getYear,
  isMonday,
  isToday,
  nextMonday,
  previousMonday,
} from "date-fns";
import { Notebook } from "./notebook";
import { Paper } from "./paper";
import { FONT_BIG, FONT_SMALL, PAPER_HEIGHT, PAPER_WIDTH } from "constants";
import { font, measureText } from "lib/render";

const GAP = 30;

const WEEK_DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function generateCalendarPages({
  notebook,
  title,
  year,
}: {
  title: string;
  notebook: Notebook;
  year: number;
}) {
  const SPACE_TOP = 150;
  const DAY_MONTHLY_SECTION_HEIGHT = (PAPER_HEIGHT - SPACE_TOP) / 6;
  const DAY_WIDTH = PAPER_WIDTH / 7;

  // year overview page

  const rootPage = notebook.createPage({
    parentId: null,
    template: { type: "year", date: new Date(year, 0, 1).toISOString() },
    siblingIndex: 0,
    width: PAPER_WIDTH,
    height: PAPER_HEIGHT,
    background: null,
  });

  const rootPageTitle = rootPage.paper.addNewText({
    labels: ["title"],
    siblingIndex: 0,
    value: `${title} ${year.toString()}`,
    x: 10,
    y: 10,
    font: FONT_BIG,
  });

  rootPageTitle.addTextAfter({
    gap: GAP * 2,
    text: "Today",
    labels: ["todayLink"],
    font: FONT_BIG,
  });

  const settingsLabel = "Settings";
  const settingsLinkSize = measureText(settingsLabel, font(FONT_BIG));

  const settingsLink = rootPage.paper.addNewText({
    labels: ["settingsLink"],
    siblingIndex: 0,
    value: settingsLabel,
    x: PAPER_WIDTH - settingsLinkSize.width - 100,
    y: PAPER_HEIGHT - settingsLinkSize.height - 100,
    font: FONT_BIG,
  });

  settingsLink.addLinkTo(`/config.html?notebookDocUrl=${notebook.documentId}`);

  const monthDates = [];
  const monthPages = [];

  // pages for each month

  for (let monthNumber = 0; monthNumber < 12; monthNumber++) {
    const monthDate = new Date(year, monthNumber, 1);
    const monthPage = rootPage.addChildPage({
      siblingIndex: monthNumber * 10000,
      width: PAPER_WIDTH,
      height: PAPER_HEIGHT,
      background: null,
      template: { type: "month", date: monthDate.toISOString() },
    });

    monthPage.paper.addNewText({
      labels: ["monthTitle"],
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
        labels: ["weekdayName", weekday],
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
      width: PAPER_WIDTH,
      height: PAPER_HEIGHT,
      background: null,
      template: { type: "week", date: currentDayInWeek.toISOString() },
    });

    const weekNumberText = weekPage.paper.addNewText({
      siblingIndex: 0,
      value: `Week ${weekNumber}`,
      x: 10,
      y: 10,
      labels: ["weekNumber"],
      font: FONT_BIG,
    });

    const monthNameText = weekNumberText.addTextAfter({
      gap: GAP,
      text: currentDayInWeek.toLocaleString("default", { month: "short" }),
      labels: ["monthName"],
      font: FONT_BIG,
    });

    monthNameText.addLinkTo(monthPage);

    // add optional second link to month page if end of week is in next month

    const endOfWeek = getEndOfWeek(currentDayInWeek);
    if (getMonth(getEndOfWeek(currentDayInWeek)) !== monthNumber) {
      const dividerDotText = monthNameText.addTextAfter({
        gap: GAP / 2,
        text: "-",
        font: FONT_BIG,
      });

      const secondMonthNameText = dividerDotText.addTextAfter({
        gap: GAP / 2,
        text: endOfWeek.toLocaleString("default", { month: "short" }),
        font: FONT_BIG,
      });

      secondMonthNameText.addLinkTo(monthPages[getMonth(endOfWeek)]);
    }

    const weekdayNameTexts = WEEK_DAY_NAMES.map((weekday, index) =>
      weekPage.paper.addNewText({
        siblingIndex: index,
        value: weekday,
        labels: ["weekdayName", weekday],
        x: 10 + DAY_WIDTH * index,
        y: 110,
        font: FONT_BIG,
      })
    );

    // create day pages

    for (let dayNumber = 0; dayNumber < 7; dayNumber++) {
      const dayDate = addDays(currentDayInWeek, dayNumber);
      const weekdayNameText = weekdayNameTexts[dayNumber];

      const dayPage = weekPage.addChildPage({
        siblingIndex: dayNumber * 10000,
        width: PAPER_WIDTH,
        height: PAPER_HEIGHT,
        background: null,
        template: { type: "day", date: dayDate.toISOString() },
      });

      weekdayNameText.addLinkTo(dayPage);

      const weekDayText = dayPage.paper.addNewText({
        siblingIndex: 0,
        value: dayDate.toLocaleString("default", { weekday: "short" }),
        labels: ["weekdayName"],
        x: 10,
        y: 10,
        font: FONT_BIG,
      });

      const weekNumberText = weekDayText.addTextAfter({
        gap: GAP * 2,
        text: `Week ${weekNumber}`,
        labels: ["weekNumber"],
        font: FONT_BIG,
      });

      weekNumberText.addLinkTo(weekPage);

      const monthNameText = weekNumberText.addTextAfter({
        gap: GAP,
        text: dayDate.toLocaleString("default", { month: "short" }),
        labels: ["monthName"],
        font: FONT_BIG,
      });

      monthNameText.addLinkTo(monthPage);

      // monthly section

      const dayMonthlySection = dayPage.paper.addNewPaper({
        labels: ["dayMonthlySection"],
        siblingIndex: 0,
        width: DAY_WIDTH,
        height: DAY_MONTHLY_SECTION_HEIGHT,
        background: null,
        x: 0,
        y: SPACE_TOP,
        locked: true,
      });

      dayMonthlySectionByDay.set(dayToKey(dayDate), dayMonthlySection.paper);

      const dayMonthlySectionText = dayMonthlySection.paper.addNewText({
        labels: ["date"],
        siblingIndex: 0,
        value: dayDate.toLocaleString("default", {
          day: "numeric",
          month: "short",
        }),
        x: 10,
        y: 10,
        font: FONT_SMALL,
      });

      dayMonthlySectionText.addLinkTo(dayPage);

      // day timeline

      const dayTimeline = dayPage.paper.addNewPaper({
        labels: ["dayTimeline"],
        siblingIndex: 0,
        width: DAY_WIDTH,
        height: PAPER_HEIGHT - SPACE_TOP - DAY_MONTHLY_SECTION_HEIGHT,
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
        position: { x: dayNumber * DAY_WIDTH, y: SPACE_TOP },
        labels: ["dayMonthlySection", dayDate.toISOString()],
      });

      dayTimeline.paper.transcludeTo(weekPage.paper, {
        position: {
          x: dayNumber * DAY_WIDTH,
          y: SPACE_TOP + DAY_MONTHLY_SECTION_HEIGHT,
        },
        labels: ["dayTimeline", dayDate.toISOString()],
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
          position: {
            x: dayNumber * DAY_WIDTH,
            y: SPACE_TOP + row * DAY_MONTHLY_SECTION_HEIGHT,
          },
          labels: ["dayMonthlySection", dayDate.toISOString()],
        });
      }

      currentDayInWeek = nextMonday(currentDayInWeek);

      row++;
    }
  }
}

export function updateCalendarPages(notebook: Notebook) {
  const yearPage = notebook.pages.find(
    (page) => page.template?.type === "year"
  );

  if (yearPage) {
    let todayLink = yearPage.paper.texts.find((text) =>
      text.labels.includes("todayLink")
    );

    const todayDailyPage = notebook.pages.find(
      (page) =>
        page.template?.type === "day" && isToday(new Date(page.template.date))
    );

    if (todayDailyPage && todayLink) {
      todayLink.addLinkTo(todayDailyPage);
    }
  }
}

function getStartOfWeek(date: Date): Date {
  if (isMonday(date)) {
    return date;
  }

  return previousMonday(date);
}

function getEndOfWeek(date: Date): Date {
  return addDays(getStartOfWeek(date), 6);
}

function dayToKey(date: Date): string {
  return date.toLocaleString("default", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
