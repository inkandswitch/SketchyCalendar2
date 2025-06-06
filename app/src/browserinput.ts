import { View } from "view";
import { AddPageButtons } from "addpagebuttons";
import { OverlaySwitcher } from "overlayswitcher";

export default class BrowserInput {
  constructor(
    view: View,
    addPageButtons: AddPageButtons,
    overlaySwitcher: OverlaySwitcher
  ) {
    window.addEventListener("keydown", (e) => {
      console.log(e.key);
      switch (e.key) {
        case "-": {
          view.zoomOut();
          break;
        }
        case "+": {
          view.zoomIn();
          break;
        }
        case "ArrowLeft": {
          const page = view.pageToLeft();
          if (page) view.focusPage(page);
          break;
        }
        case "ArrowRight": {
          const page = view.pageToRight();
          if (page) view.focusPage(page);
          break;
        }
        case "ArrowUp": {
          const page = view.pageAbove();
          if (page) view.focusPage(page);
          break;
        }
        case "ArrowDown": {
          const page = view.pageBelow();
          if (page) view.focusPage(page);
          break;
        }
        default: {
          break;
        }
      }
    });

    window.addEventListener("click", (e) => {
      const pos = {
        x: e.clientX,
        y: e.clientY,
      };
      if (e.shiftKey) {
        if (addPageButtons.tap(pos)) {
          return;
        }

        if (overlaySwitcher.tap(pos)) {
          return;
        }

        if (view.focusedPage) {
          const link = view.focusedPage.paper.getLinkAtPosition(
            view.camera.screenToWorld(pos)
          );

          if (link) {
            const target = link.getTarget();
            if (typeof target === "string") {
              window.open(target, "_blank");
            } else {
              view.focusPage(target);
            }
          }
        }
      }
    });
  }
}
