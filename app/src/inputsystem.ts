import { Point } from "lib/point";

export type TouchId = number;

export type WrapperEventType = "pencil" | "finger";
export type WrapperEventPhase = "hover" | "began" | "moved" | "ended";

export type WrapperEvent = {
  id: TouchId;
  type: WrapperEventType;
  phase: WrapperEventPhase;
  predicted: boolean;
  position: Point;
  hoverHeight: number;
  pressure: number;
  altitude: number;
  azimuth: number;
  rollAngle: number;
  radius: number;
  timestamp: number;
};

const preventDefault = (e: TouchEvent) => e.preventDefault();

export class InputSystem {
  buffer: Array<WrapperEvent>;

  pointerDown = false;
  spaceBarDown = false;

  // settings
  usePredictedEvents = false;

  constructor() {
    this.buffer = new Array();

    (window as any).wrapperEvents = this.handleWrapperEvents.bind(this);

    // The fallback event handlers cause some weirdness in the app
    // // Initialize the input system
    // this.initFallbackEventListeners();

    // (window as any).wrapperEvents = (events: WrapperEvent[]) => {
    //   // From now on, the Wrapper should call the function named handleWrapperEvents
    //   (window as any).wrapperEvents = this.handleWrapperEvents.bind(this);
    //   this.clearFallbackEventListeners();
    //   this.handleWrapperEvents(events);
    // };
  }

  initFallbackEventListeners() {
    // Block the "swipe to go back/forward" gesture in Safari
    window.addEventListener("touchstart", preventDefault, { passive: false });

    window.onpointerdown = (e: PointerEvent) =>
      this.handlePointerEvent(e, "began");
    window.onpointermove = (e: PointerEvent) =>
      this.handlePointerEvent(e, "moved");
    window.onpointerup = (e: PointerEvent) =>
      this.handlePointerEvent(e, "ended");

    window.onkeydown = (e: KeyboardEvent) => {
      if (e.key === " ") this.spaceBarDown = true;
    };
    window.onkeyup = (e: KeyboardEvent) => {
      if (e.key === " ") this.spaceBarDown = false;
    };
  }

  handlePointerEvent(e: PointerEvent, phase: WrapperEventPhase) {
    if (phase === "began") this.pointerDown = true;
    if (phase === "ended") this.pointerDown = false;

    if (phase === "moved" && !this.pointerDown) phase = "hover";

    const type =
      e.pointerType == "touch" || this.spaceBarDown ? "finger" : "pencil";

    // Adjust as needed.
    // (The typical range of pressure values for the Apple Pencil is something like 0.5 to 3.5)
    const pressure = e.pointerType == "mouse" ? 1 : e.pressure * 5;

    this.handleWrapperEvents([
      {
        id: e.pointerId,
        type,
        phase,
        predicted: false,
        position: { x: e.clientX, y: e.clientY },
        hoverHeight: 0.5,
        pressure,
        altitude: 0,
        azimuth: 0,
        rollAngle: 0,
        radius: 0,
        timestamp: performance.now(),
      },
    ]);
  }

  clearFallbackEventListeners() {
    window.onpointerdown = null;
    window.onpointermove = null;
    window.onpointerup = null;
    window.removeEventListener("touchstart", preventDefault);
    window.onkeydown = null;
    window.onkeyup = null;
  }

  handleWrapperEvents(events: WrapperEvent[]) {
    for (const event of events) {
      if (event.predicted && !this.usePredictedEvents) continue;
      this.buffer.push(event);
    }
  }

  clear() {
    this.buffer = [];
  }
}
