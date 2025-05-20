import { Point } from "lib/point";
import { TouchId, WrapperEvent } from "inputsystem";
import { Vec } from "lib/vec";

export type TouchState = {
  start: Point;
  current: Point;
  previous: Point;
  delta: Vec;
  totalDelta: Vec;
  id: TouchId;
};

export type TouchEvent = TouchState & WrapperEvent;

export type GestureHandler = {
  onEvent?: (e: TouchEvent) => void;
};

export class GestureSystem {
  handlers: Array<GestureHandler>;
  touches: Record<TouchId, TouchState> = {};

  constructor(handlers: Array<GestureHandler>) {
    this.handlers = handlers;
  }

  update(events: Array<WrapperEvent>) {
    if (events.length == 0) return;

    // Preprocess events with additional data
    const touchEvents: Array<TouchEvent> = [];
    for (const e of events) {
      switch (e.phase) {
        case "began": {
          if (this.touches[e.id]) continue;
          this.touches[e.id] = {
            start: e.position,
            current: e.position,
            previous: e.position,
            delta: Vec(0, 0),
            totalDelta: Vec(0, 0),
            id: e.id,
          };
          touchEvents.push({
            ...this.touches[e.id],
            ...e,
          });
          break;
        }

        case "moved": {
          if (!this.touches[e.id]) continue;
          const touch = this.touches[e.id];
          touch.current = e.position;
          touch.delta = Vec.sub(touch.current, touch.previous);
          touch.totalDelta = Vec.sub(touch.current, touch.start);
          touch.previous = touch.current;
          touchEvents.push({
            ...this.touches[e.id],
            ...e,
          });
          break;
        }

        case "ended": {
          if (!this.touches[e.id]) continue;
          const touch = this.touches[e.id];
          touch.current = e.position;
          touch.delta = Vec.sub(touch.current, touch.previous);
          touch.totalDelta = Vec.sub(touch.current, touch.start);
          touch.previous = touch.current;
          delete this.touches[e.id];
          touchEvents.push({
            ...this.touches[e.id],
            ...e,
          });
          break;
        }
      }
    }

    for (const event of touchEvents) {
      for (const handler of this.handlers) {
        if (handler.onEvent) handler.onEvent(event);
      }
    }
  }
}
