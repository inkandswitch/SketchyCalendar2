import { WrapperEvent } from "inputsystem";

type GestureHandler = {
  onEvent?: (e: WrapperEvent) => void;
  isEnabled?: boolean;
};

export class GestureSystem {
  handlers: Array<GestureHandler>;

  constructor(handlers: Array<GestureHandler>) {
    this.handlers = handlers;
  }

  update(events: Array<WrapperEvent>) {
    if (events.length == 0) return;
    for (const event of events) {
      for (const handler of this.handlers) {
        if (handler.isEnabled && !handler.isEnabled) continue;
        if (handler.onEvent) handler.onEvent(event);
      }
    }
  }
}

export class SingleFingerSwipe implements GestureHandler {
  isEnabled = true;
  start = { x: 0, y: 0 };
  swiping = false;

  onEvent(e: WrapperEvent) {
    switch (e.phase) {
      case "began":
        this.start.x = e.position.x;
        this.start.y = e.position.y;
        this.swiping = true;
        console.log("gesture started", { x: this.start.x, y: this.start.y });

        break;
      case "moved":
        if (!this.swiping) return;
        const dx = e.position.x - this.start.x;
        const dy = e.position.y - this.start.y;
        console.log("gesture moved", { dx, dy });
        break;
      case "ended":
        const endX = e.position.x;
        const endY = e.position.y;
        const distanceX = endX - this.start.x;
        const distanceY = endY - this.start.y;
        this.swiping = false;
        console.log("gesture ended", { distanceX, distanceY });
        break;
    }
  }
}
