import { DocumentId, Repo } from "@automerge/automerge-repo";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import { GestureSystem, SingleFingerSwipe } from "gesturesystem";
import { Id } from "id";
import { InputSystem } from "inputsystem";
import Render from "lib/render";
import tick from "lib/tick";
import { SceneGraph } from "scenegraph";
import { Notebook, NotebookProps } from "things/notebook";
import { Paper, PaperProps } from "things/paper";

console.log("boop");

export async function initNotebook() {
  const repo = new Repo({
    network: [new BrowserWebSocketClientAdapter("wss://sync.automerge.org")],
    storage: new IndexedDBStorageAdapter(),
  });

  let documentId = window.location.hash.slice(1) as DocumentId;

  let notebook: Notebook;

  if (!documentId) {
    notebook = Notebook.create(repo);

    const myPaper = notebook.createPaper({
      parentId: "foo" as Id<Paper>,
      x: 0,
      y: 0,
      width: window.innerWidth,
      height: window.innerHeight,
      siblingIndex: 0,
      background: null,
    });

    myPaper.addNewPaper({
      x: 10,
      y: 10,
      width: 200,
      height: 200,
      siblingIndex: 0,
      background: null,
    });

    // Update URL with the new document ID
    window.location.hash = documentId;
  } else {
    const docHandle = await repo.find<NotebookProps>(documentId);
    notebook = new Notebook(docHandle);
  }

  return notebook;
}

const render = new Render();
const input = new InputSystem();
const gestures = new GestureSystem([new SingleFingerSwipe()]);

const notebook = await initNotebook(); // TODO: make this more generic
const sceneGraph = new SceneGraph(notebook);

tick((dt) => {
  // Update
  gestures.update(input.buffer);

  // Render
  render.clear();

  sceneGraph.render(render);

  input.clear(); // cleanup the input buffer for the next round
});
