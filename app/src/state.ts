import { DocHandle, DocumentId, Repo } from "@automerge/automerge-repo";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";

import { createEmptyNotebook, Notebook } from "things/notebook";
import { SceneGraph } from "scenegraph";
import { createPaper } from "things/paper";

export async function initAutomergeDoc() {
  const repo = new Repo({
    network: [new BrowserWebSocketClientAdapter("wss://sync.automerge.org")],
    storage: new IndexedDBStorageAdapter(),
  });

  let documentId = window.location.hash.slice(1) as DocumentId;

  let stateDocHandle: DocHandle<Notebook>;

  if (!documentId) {
    stateDocHandle = repo.create(createEmptyNotebook());
    documentId = stateDocHandle.documentId;

    // Update URL with the new document ID
    window.location.hash = documentId;
  } else {
    stateDocHandle = await repo.find<Notebook>(documentId);
  }

  return stateDocHandle;
}

export class State {
  notebookDocHandle: DocHandle<Notebook>;
  sceneGraph: SceneGraph;

  constructor(notebookDocHandle: DocHandle<Notebook>) {
    this.notebookDocHandle = notebookDocHandle;
    this.sceneGraph = new SceneGraph();
    this.sceneGraph.rebuild(this.notebookDocHandle.doc());

    // Rebuild the scenegraph when the doc updates
    this.notebookDocHandle.addListener("change", (state) => {
      this.sceneGraph.rebuild(state.doc);
    });
  }

  createNewPaper() {
    this.notebookDocHandle.change((state) => {
      const paper = createPaper(10, 10);
      state.papers[paper.id] = paper;
    });
  }
}
