import { DocHandle } from "@automerge/automerge-repo";

export type EventWithCalendarId = gapi.client.calendar.Event & {
  calendarId: string;
};

export type Calendar = {
  calendars: Record<string, gapi.client.calendar.Calendar>;
  events: Record<string, EventWithCalendarId>;
};

export class GoogleCalendar {
  constructor(private readonly docHandle?: DocHandle<Calendar>) {}

  get events(): EventWithCalendarId[] {
    if (!this.docHandle) {
      return [];
    }

    return Object.values(this.docHandle.doc().events);
  }

  get calendars(): gapi.client.calendar.Calendar[] {
    if (!this.docHandle) {
      return [];
    }

    return Object.values(this.docHandle.doc().calendars);
  }

  getEventsOnDay(date: Date) {
    if (!this.docHandle) {
      return [];
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return this.events.filter((event) => {
      const eventEnd = toDate(event.end);
      const eventStart = toDate(event.start);

      return (
        eventStart && eventEnd && eventStart <= dayEnd && eventEnd >= dayStart
      );
    });
  }
}

function toDate(date: any): Date | undefined {
  if (typeof date === "object" && date !== null) {
    if ("date" in date) {
      return new Date(date.date);
    }

    if ("dateTime" in date) {
      return new Date(date.dateTime);
    }
  }
}
