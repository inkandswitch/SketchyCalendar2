import { DocumentId, Repo } from "@automerge/automerge-repo";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import { getYear } from "date-fns";

import Render from "lib/render";
import tick from "lib/tick";

// Tools
import Toolbar from "toolbar";
import EraseTool from "tools/erase";
import PenTool from "tools/pen";
import SelectTool from "tools/select";

// Gestures
import Draw from "gestures/draw";
import Navigate from "gestures/navigate";
import PinchIn from "gestures/pinchin";
import { GestureSystem } from "gesturesystem";
import { InputSystem } from "inputsystem";

// Notebook
import AddPageButtons from "addpagebuttons";
import { Selection } from "selection";
import {
  addCalendarPages,
  Notebook,
  NotebookCollection,
  NotebookProps,
} from "things/notebook";
import EventCardTool from "tools/eventcard";
import { View } from "view";

const PERSIST_NOTEBOOK = false;

async function loadOrCreateNotebook(
  repo: Repo,
  key: string,
  onInit: (notebook: Notebook) => void
) {
  const notebookDocId = localStorage.getItem(`${key}:docId`) as DocumentId;

  if (notebookDocId && PERSIST_NOTEBOOK) {
    const docHandle = await repo.find<NotebookProps>(notebookDocId);
    const notebook = new Notebook(docHandle);

    return notebook;
  } else {
    const notebook = Notebook.create(repo);
    onInit(notebook);
    localStorage.setItem(`${key}:docId`, notebook.documentId);

    return notebook;
  }
}

export async function initNotebookCollection() {
  const repo = new Repo({
    network: [], //[new BrowserWebSocketClientAdapter("wss://sync.automerge.org")],
    storage: new IndexedDBStorageAdapter(),
  });

  const personalCalendarNotebook = await loadOrCreateNotebook(
    repo,
    "personalCalendar",
    (notebook) => {
      addCalendarPages({
        notebook,
        title: "Personal Calendar",
        year: getYear(new Date()),
        pageWidth: window.innerWidth,
        pageHeight: window.innerHeight,
      });
    }
  );

  const sharedCalendarNotebook = await loadOrCreateNotebook(
    repo,
    "sharedCalendar",
    (notebook) => {
      addCalendarPages({
        notebook,
        title: "Lab Calendar",
        year: getYear(new Date()),
        pageWidth: window.innerWidth,
        pageHeight: window.innerHeight,
      });
    }
  );

  const notebookCollection = new NotebookCollection();
  notebookCollection.addNotebook(personalCalendarNotebook);
  notebookCollection.addNotebook(sharedCalendarNotebook);

  return notebookCollection;
}

const render = new Render();
const input = new InputSystem();

const notebookCollection = await initNotebookCollection();
const view = new View(notebookCollection);
const selection = new Selection(view);

const addPageButtons = new AddPageButtons(view);

const toolbar = new Toolbar({ x: window.innerWidth - 60, y: 20 }, [
  new PenTool("pen_black", "black", 1),
  new PenTool("pen_blue", "blue", 1),
  new PenTool("pen_red", "red", 1),
  new PenTool("highlight_yellow", "#FFFF0044", 20),
  new PenTool("highlight_green", "#00FF0033", 20),
  new PenTool("whiteout", "#FFFFFF", 30),
  new EraseTool(20),
  new SelectTool(selection),
  new EventCardTool(),
]);

const gestures = new GestureSystem([
  new Draw(view, notebookCollection, toolbar),
  new PinchIn(view),
  new Navigate(view, addPageButtons),
]);

console.log(notebookCollection.rootPages);

tick((dt) => {
  toolbar.isActive = view.isZoomedIn();
  addPageButtons.isActive = !view.isZoomedIn();

  // Update
  gestures.update(input.buffer);
  view.update(dt);
  input.clear(); // cleanup the input buffer for the next round

  // Render
  render.clear();
  view.render(render);
  toolbar.render(render);
  selection.render(render);
  addPageButtons.render(render);
});
