import { DocumentId, Repo } from "@automerge/automerge-repo";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";

import { Camera } from "camera";
import Render from "lib/render";
import tick from "lib/tick";

// Tools
import Toolbar from "toolbar";
import EraseTool from "tools/erase";
import PenTool from "tools/pen";
import SelectTool from "tools/select";

// Gestures
import BrowserInput from "browserinput";
import Draw from "gestures/draw";
import Navigate from "gestures/navigate";
import PinchIn from "gestures/pinchin";
import Zoom from "gestures/zoom";
import { GestureSystem } from "gesturesystem";
import { InputSystem } from "inputsystem";

// Notebook
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import AddPageButtons from "addpagebuttons";
import { getYear } from "date-fns";
import OverlaySwitcher from "overlayswitcher";
import { Selection } from "selection";
import TagMenu from "tagmenu";
import { generateCalendarPages, updateCalendarPages } from "things/calendar";
import {
  Notebook,
  NotebookCollection,
  NotebookColor,
  NotebookProps,
} from "things/notebook";
import CardTool from "tools/card";
import { View } from "view";
import { TAG_PAPER_HEIGHT } from "constants";
import { TAG_PAPER_WIDTH } from "constants";

const ADD_DEV_NOTEBOOK = false;
const PERSIST_DEV_NOTEBOOK = true;

(window as any).loadShareCalendar = (notebookDocId: string) => {
  localStorage.setItem("shareCalendar:docId", notebookDocId);
};

(window as any).loadPersonalCalendar = (notebookDocId: string) => {
  localStorage.setItem("personalCalendar:docId", notebookDocId);
};

async function loadOrCreateNotebook(
  repo: Repo,
  key: string,
  color: NotebookColor,
  collection: NotebookCollection,
  onInit: (notebook: Notebook) => void
) {
  const notebookDocId = localStorage.getItem(`${key}:docId`) as DocumentId;

  if (notebookDocId) {
    const docHandle = await repo.find<NotebookProps>(notebookDocId);
    const notebook = new Notebook(repo, docHandle, collection);

    return notebook;
  } else {
    const notebook = Notebook.create(repo, color, collection);
    onInit(notebook);
    localStorage.setItem(`${key}:docId`, notebook.documentId);
    return notebook;
  }
}

export async function initNotebookCollection() {
  const repo = new Repo({
    network: [new BrowserWebSocketClientAdapter("wss://sync3.automerge.org")],
    storage: new IndexedDBStorageAdapter(),
  });

  const notebookCollection = new NotebookCollection();

  // const testNotebook = Notebook.create(repo);
  // notebookCollection.addNotebook(testNotebook);

  // const rootPage = testNotebook.createPage({
  //   parentId: null,
  //   siblingIndex: 0,
  //   width: PAPER_WIDTH,
  //   height: PAPER_HEIGHT,
  //   background: null,
  // });

  // const childPage = rootPage.addChildPage({
  //   siblingIndex: 0,
  //   width: PAPER_WIDTH,
  //   height: PAPER_HEIGHT,
  //   background: null,
  // });

  // const text = rootPage.paper.addNewText({
  //   siblingIndex: 0,
  //   value: "Down",
  //   x: 50,
  //   y: 50,
  //   font: "100px Arial",
  // });

  // text.addLinkTo(childPage);

  // const text2 = childPage.paper.addNewText({
  //   siblingIndex: 0,
  //   value: "UP",
  //   x: 50,
  //   y: 50,
  //   font: "100px Arial",
  // });

  // text2.addLinkTo(rootPage);

  // notebookCollection.addNotebook(testNotebook);

  if (ADD_DEV_NOTEBOOK) {
    let devNotebook: Notebook;
    if (PERSIST_DEV_NOTEBOOK) {
      devNotebook = await loadOrCreateNotebook(
        repo,
        "devCalendar",
        "orange",
        notebookCollection,
        (notebook) => {
          generateCalendarPages({
            notebook,
            title: "Test Calendar",
            year: getYear(new Date()),
          });
        }
      );
    } else {
      devNotebook = Notebook.create(repo, "orange", notebookCollection);

      generateCalendarPages({
        notebook: devNotebook,
        title: "Test Calendar",
        year: getYear(new Date()),
      });
    }

    updateCalendarPages(devNotebook);
    notebookCollection.addNotebook(devNotebook);
  }

  const personalCalendarNotebook = await loadOrCreateNotebook(
    repo,
    "personalCalendar",
    "blue",
    notebookCollection,
    (notebook) => {
      generateCalendarPages({
        notebook,
        title: "Personal Calendar",
        year: getYear(new Date()),
      });
    }
  );
  updateCalendarPages(personalCalendarNotebook);
  notebookCollection.addNotebook(personalCalendarNotebook);

  const sharedCalendarNotebook = await loadOrCreateNotebook(
    repo,
    "sharedCalendar",
    "green",
    notebookCollection,
    (notebook) => {
      generateCalendarPages({
        notebook,
        title: "Lab Calendar",
        year: getYear(new Date()),
      });
    }
  );
  updateCalendarPages(sharedCalendarNotebook);
  notebookCollection.addNotebook(sharedCalendarNotebook);

  return notebookCollection;
}

const render = new Render();
const input = new InputSystem();
const camera = new Camera();

const notebookCollection = await initNotebookCollection();
const view = new View(camera, notebookCollection);
const selection = new Selection(view, notebookCollection);

const addPageButtons = new AddPageButtons(view);
const overlaySwitcher = new OverlaySwitcher(view, notebookCollection);

console.log(notebookCollection.activeTagPapers());

const toolbar = new Toolbar(
  { x: window.innerWidth - 60, y: 20 },
  [
    new PenTool("pen_black", "black", 1),
    new PenTool("pen_blue", "blue", 1),
    new PenTool("pen_red", "red", 1),
    new PenTool("highlight_yellow", "#FFFF0044", 20),
    new PenTool("highlight_green", "#00FF0033", 20),
    new PenTool("whiteout", "#FFFFFF", 30),
    new EraseTool(20),
    new SelectTool(selection),
    new CardTool("card", (paper, position) => {
      return paper.addNewPaper({
        x: position.x,
        y: position.y,
        width: 140,
        height: 100,
        background: "#feff9c", // Postitnote yellow
        locked: false,
        siblingIndex: paper.children.length,
      });
    }),

    new CardTool("tag", (paper, position) => {
      return paper.addNewPaper({
        x: position.x,
        y: position.y,
        width: TAG_PAPER_WIDTH,
        height: TAG_PAPER_HEIGHT,
        locked: false,
        siblingIndex: paper.children.length,
        background: { type: "Tag" },
      });
    }),
  ],
  selection
);

const tagMenu = new TagMenu(view, notebookCollection);

const gestures = new GestureSystem([
  new Draw(view, notebookCollection, toolbar, tagMenu),
  new PinchIn(view),
  new Navigate(view, addPageButtons, overlaySwitcher, tagMenu),
  new Zoom(view),
]);

new BrowserInput(view, addPageButtons, overlaySwitcher);

console.log(notebookCollection.rootPages);

tick((dt) => {
  toolbar.isActive = view.isZoomedIn();
  overlaySwitcher.isActive = view.isZoomedIn();
  tagMenu.isActive = view.isZoomedIn();
  addPageButtons.isActive = view.zoom.target == 0 && view.zoom.isCloseEnough();

  // Update
  gestures.update(input.buffer);
  view.update(dt);
  input.clear(); // cleanup the input buffer for the next round
  selection.update();

  // Render
  render.clear();
  view.render(render);
  toolbar.render(render);
  selection.render(render);
  addPageButtons.render(render);
  overlaySwitcher.render(render);
  tagMenu.render(render);
});
