import { DocumentId, Repo } from "@automerge/automerge-repo";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import { getYear } from "date-fns";

import { GestureSystem } from "gesturesystem";
import PinchIn from "gestures/pinchin";
import Draw from "gestures/draw";
import Navigate from "gestures/navigate";

import { Id } from "id";
import { InputSystem } from "inputsystem";
import Render from "lib/render";
import tick from "lib/tick";
import { addCalendarPages, Notebook, NotebookProps } from "things/notebook";
import { View } from "view";

export async function initNotebook() {
  const repo = new Repo({
    network: [new BrowserWebSocketClientAdapter("wss://sync.automerge.org")],
    storage: new IndexedDBStorageAdapter(),
  });

  let documentId = window.location.hash.slice(1) as DocumentId;

  let notebook: Notebook;

  if (!documentId) {
    notebook = Notebook.create(repo);

    const time = Date.now();
    addCalendarPages(
      notebook,
      getYear(new Date()),
      window.innerWidth,
      window.innerHeight
    );

    console.log("Time taken to add calendar pages", Date.now() - time);

    // Update URL with the new document ID
    // window.location.hash = notebook.documentId;
  } else {
    const docHandle = await repo.find<NotebookProps>(documentId);
    notebook = new Notebook(docHandle);
  }

  return notebook;
}

const render = new Render();
const input = new InputSystem();

const notebook = await initNotebook();
const view = new View(notebook);

console.log(notebook.rootPages);

const gestures = new GestureSystem([
  new Draw(view, notebook),
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
});

console.log(notebook.state);
