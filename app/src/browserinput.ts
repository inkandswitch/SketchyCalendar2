import { View } from "view";

export default class BrowserInput {
  constructor(view: View) {
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
  }
}
