import { GestureHandler, TouchEvent } from "gesturesystem";
import { View } from "view";
import { Vec } from "lib/vec";
import { Point } from "lib/point";
import AddPageButtons from "addpagebuttons";
import { Page } from "things/page";
import OverlaySwitcher from "overlayswitcher";

export default class Navigate implements GestureHandler {
  view: View;
  addPageButtons: AddPageButtons;
  overlaySwitcher: OverlaySwitcher;
  touch: TouchEvent | null = null;
  swipedLaneOffset: number | null = null;

  //direction: "horizontal" | "vertical" | null = null;
  startPoint: Point | null = null;

  activeTouches: Array<TouchEvent> = [];

  constructor(
    view: View,
    addPageButtons: AddPageButtons,
    overlaySwitcher: OverlaySwitcher
  ) {
    this.view = view;
    this.addPageButtons = addPageButtons;
    this.overlaySwitcher = overlaySwitcher;
  }

  onEvent(e: TouchEvent) {
    if (e.type != "finger") return;

    switch (e.phase) {
      case "began": {
        this.activeTouches.push(e);

        if (!this.touch) {
          this.touch = e;
          this.startPoint = e.start;
          this.swipedLaneOffset =
            Math.floor((this.touch.current.y / window.innerHeight) * 3) - 1;
        }
        break;
      }
      case "moved": {
        // only handle this touch if there are no other active touches to avoid interfering with pinch in gesture
        if (this.activeTouches.length > 1) {
          this.touch = null;
          return;
        }

        if (this.touch && this.touch.id == e.id && !this.view.isZoomedIn()) {
          this.touch = e;
          const delta = Vec.sub(e.current, this.startPoint!);
          const factor = window.innerWidth * 0.1;

          const progress = Vec.len(delta) / factor;
          if (progress > 1) {
            this.startPoint = e.current;
            let nextPage: Page | null = null;

            if (Math.abs(delta.x) > Math.abs(delta.y)) {
              if (delta.x > 0) {
                nextPage = this.view.pageToLeft();
              } else {
                nextPage = this.view.pageToRight();
              }
            } else {
              if (delta.y > 0) {
                nextPage = this.view.pageAbove();
              } else {
                nextPage = this.view.pageBelow();
              }
            }

            if (nextPage) {
              this.view.focusPage(nextPage);
            }
          }
        }
        break;
      }
      case "ended": {
        this.activeTouches = this.activeTouches.filter((t) => t.id != e.id);

        if (this.touch && this.touch.id == e.id) {
          if (Vec.len(this.touch.totalDelta) < 10) {
            if (this.addPageButtons.tap(this.touch.current)) {
              this.touch = null;
              return;
            }

            if (this.overlaySwitcher.tap(this.touch.current)) {
              this.touch = null;
              return;
            }

            if (this.view.isZoomedIn()) {
              if (this.view.focusedPage) {
                const link = this.view.focusedPage.paper.getLinkAtPosition(
                  this.touch.current
                );

                console.log("tap", this.touch.current, link);

                if (link) {
                  this.view.focusPage(link.getTargetPage(), {
                    noAnimation: true,
                  });
                }
              }
            } else {
              const tappedPage = this.view.getPageAtPosition(
                this.touch.current
              );
              if (tappedPage) {
                this.view.focusPage(tappedPage);
                this.view.zoomIn();
              }
            }
          }
          this.touch = null;
        }
        break;
      }
    }
  }
}
