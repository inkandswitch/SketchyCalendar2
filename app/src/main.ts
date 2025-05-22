import { DocumentId, Repo } from "@automerge/automerge-repo";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import { getYear } from "date-fns";

import Render from "lib/render";
import tick from "lib/tick";

import Toolbar from "toolbar";
import PenTool from "tools/pen";

import { InputSystem } from "inputsystem";
import { GestureSystem } from "gesturesystem";
import PinchIn from "gestures/pinchin";
import Draw from "gestures/draw";
import Navigate from "gestures/navigate";

import { Calendar } from "lib/googlecalendar";

import { addCalendarPages, Notebook, NotebookProps } from "things/notebook";
import { View } from "view";

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
    localStorage.setItem("notebookDocId", notebook.documentId);
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

const toolbar = new Toolbar({ x: 10, y: 10 }, [
  new PenTool("pen_black", "black", 1),
  new PenTool("pen_blue", "blue", 1),
  new PenTool("pen_red", "red", 1),
  new PenTool("highlight_yellow", "#FFFF0044", 20),
  new PenTool("highlight_green", "#00FF0033", 20),
]);

const gestures = new GestureSystem([
  new Draw(view, notebook, toolbar),
  new PinchIn(view),
  new Navigate(view),
]);

//const swipe = new SwipeSystem(state.sceneGraph);

tick((dt) => {
  // Update
  gestures.update(input.buffer);
  view.update(dt);
  input.clear(); // cleanup the input buffer for the next round

  // Render
  render.clear();

  view.render(render);
  toolbar.render(render); // Render the toolbar after the rest of the view
});

console.log(notebook.state);
