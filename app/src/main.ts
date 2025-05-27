import { DocumentId, Repo } from "@automerge/automerge-repo";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import { getYear } from "date-fns";

import Render from "lib/render";
import tick from "lib/tick";

// Tools
import Toolbar from "toolbar";
import PenTool from "tools/pen";
import EraseTool from "tools/erase";
import SelectTool from "tools/select";

// Gestures
import { InputSystem } from "inputsystem";
import { GestureSystem } from "gesturesystem";
import PinchIn from "gestures/pinchin";
import Draw from "gestures/draw";
import Navigate from "gestures/navigate";

// Calendar data
import { Calendar } from "lib/googlecalendar";

// Notebook
import { addCalendarPages, Notebook, NotebookProps } from "things/notebook";
import { View } from "view";
import { Selection } from "selection";
import AddPageButtons from "addpagebuttons";
import EventCardTool from "tools/eventcard";

const PERSIST_NOTEBOOK = true;

export async function initNotebook() {
  const repo = new Repo({
    network: [new BrowserWebSocketClientAdapter("wss://sync.automerge.org")],
    storage: new IndexedDBStorageAdapter(),
  });

  let notebookDocId = PERSIST_NOTEBOOK
    ? (localStorage.getItem("notebookDocId") as DocumentId)
    : undefined;
  let calendarDocId = localStorage.getItem("calendarDocId");

  let calendarDocHandle = calendarDocId
    ? await repo.find<Calendar>(calendarDocId as DocumentId)
    : undefined;

  let notebook: Notebook;

  if (!notebookDocId) {
    notebook = Notebook.create(repo, calendarDocHandle);

    const time = Date.now();
    addCalendarPages(
      notebook,
      getYear(new Date()),
      window.innerWidth,
      window.innerHeight
    );

    console.log("Time taken to add calendar pages", Date.now() - time);

    // Update URL with the new document ID

    if (PERSIST_NOTEBOOK) {
      localStorage.setItem("notebookDocId", notebook.documentId);
    }
  } else {
    const docHandle = await repo.find<NotebookProps>(notebookDocId);
    notebook = new Notebook(docHandle, calendarDocHandle);
  }

  return notebook;
}

const render = new Render();
const input = new InputSystem();

const notebook = await initNotebook();
const view = new View(notebook);
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
  new Draw(view, notebook, toolbar),
  new PinchIn(view),
  new Navigate(view, addPageButtons),
]);

//const swipe = new SwipeSystem(state.sceneGraph);

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

console.log(notebook.state);
