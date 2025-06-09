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
import { TAG_PAPER_HEIGHT, TAG_PAPER_WIDTH } from "constants";
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

const ADD_DEV_NOTEBOOK = false;
const PERSIST_DEV_NOTEBOOK = true;

(window as any).loadShareCalendar = (notebookDocId: string) => {
  localStorage.setItem("shareCalendar:docId", notebookDocId);
};

(window as any).loadPersonalCalendar = (notebookDocId: string) => {
  localStorage.setItem("personalCalendar:docId", notebookDocId);
};

const SHARED_LAB_CALENDAR_DOC_URL =
  "4YSr2ALFD3wmTzfaqg4USdBBsxNX" as DocumentId; // Load hardcoded shared calendar

async function loadOrCreateNotebook(
  repo: Repo,
  key: string,
  color: NotebookColor,
  collection: NotebookCollection,
  onInit: (notebook: Notebook) => void
) {
  let notebookDocId = localStorage.getItem(`${key}:docId`) as DocumentId;

  if (key == "sharedCalendar") {
    notebookDocId = SHARED_LAB_CALENDAR_DOC_URL; // Load hardcoded shared calendar
  }

  if (notebookDocId) {
    const docHandle = await repo.find<NotebookProps>(notebookDocId);
    console.log(docHandle);
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
    network: [new BrowserWebSocketClientAdapter("ws://192.168.178.101:3030")],
    storage: new IndexedDBStorageAdapter(),
    sharePolicy: async (_peerId, documentId) => {
      return documentId == SHARED_LAB_CALENDAR_DOC_URL;
    },
  });

  const notebookCollection = new NotebookCollection();

  const testNotebook = Notebook.create(repo, "orange", notebookCollection);
  notebookCollection.addNotebook(testNotebook);

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
        width: 160,
        height: 120,
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

// Try to handle errors
// Access the network adapters
// const networkAdapters = notebookCollection.repo.networkSubsystem.adapters;
// const wsAdapter = networkAdapters.find(
//   (adapter) => adapter instanceof BrowserWebSocketClientAdapter
// ) as BrowserWebSocketClientAdapter;

// wsAdapter.on("peer-disconnected", () => {
//   view.setToastMessage("closed connection to server");
// });

// wsAdapter.on("close", () => {
//   view.setToastMessage("closed connection to server");
// });

// Global error handler for uncaught exceptions
window.addEventListener("error", (event) => {
  console.error("Global error caught:", event.error);
  // You can send this to a logging service, show a user-friendly message, etc.
  view.setToastMessage(event.error);
});

// Global handler for unhandled promise rejections
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
  view.setToastMessage(event.reason);
  // Prevent the default browser behavior (logging to console)
  event.preventDefault();
});

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
