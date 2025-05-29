import { DocumentId, Repo } from "@automerge/automerge-repo";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";

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
import { Notebook, NotebookCollection, NotebookProps } from "things/notebook";
import { generateCalendarPages, updateCalendarPages } from "things/calendar";
import EventCardTool from "tools/eventcard";
import { View } from "view";
import { getYear } from "date-fns";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import OverlaySwitcher from "overlayswitcher";

const ADD_DEV_NOTEBOOK = true;
const PERSIST_DEV_NOTEBOOK = true;

async function loadOrCreateNotebook(
  repo: Repo,
  key: string,
  onInit: (notebook: Notebook) => void
) {
  const notebookDocId = localStorage.getItem(`${key}:docId`) as DocumentId;

  if (notebookDocId) {
    const docHandle = await repo.find<NotebookProps>(notebookDocId);
    const notebook = new Notebook(repo, docHandle);

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
    network: [new BrowserWebSocketClientAdapter("wss://sync.automerge.org")],
    storage: new IndexedDBStorageAdapter(),
  });

  const notebookCollection = new NotebookCollection();

  // const testNotebook = await loadOrCreateNotebook(repo, "test", (notebook) => {
  //   const rootPage = notebook.createPage({
  //     parentId: null,
  //     siblingIndex: 0,
  //     width: window.innerWidth,
  //     height: window.innerHeight,
  //     background: null,
  //   });

  //   const childPage = rootPage.addChildPage({
  //     siblingIndex: 0,
  //     width: window.innerWidth,
  //     height: window.innerHeight,
  //     background: null,
  //   });

  //   const text = rootPage.paper.addNewText({
  //     siblingIndex: 0,
  //     value: "Down",
  //     x: 50,
  //     y: 50,
  //     font: "100px Arial",
  //   });

  //   text.addLinkTo(childPage);

  //   const text2 = childPage.paper.addNewText({
  //     siblingIndex: 0,
  //     value: "UP",
  //     x: 50,
  //     y: 50,
  //     font: "100px Arial",
  //   });

  //   text2.addLinkTo(rootPage);
  // });

  // notebookCollection.addNotebook(testNotebook);

  if (ADD_DEV_NOTEBOOK) {
    let devNotebook: Notebook;
    if (PERSIST_DEV_NOTEBOOK) {
      devNotebook = await loadOrCreateNotebook(
        repo,
        "devCalendar",
        (notebook) => {
          generateCalendarPages({
            notebook,
            title: "Test Calendar",
            year: getYear(new Date()),
            pageWidth: window.innerWidth,
            pageHeight: window.innerHeight,
          });
        }
      );
    } else {
      devNotebook = Notebook.create(repo);

      generateCalendarPages({
        notebook: devNotebook,
        title: "Test Calendar",
        year: getYear(new Date()),
        pageWidth: window.innerWidth,
        pageHeight: window.innerHeight,
      });
    }

    updateCalendarPages(devNotebook);
    notebookCollection.addNotebook(devNotebook);
  }

  const personalCalendarNotebook = await loadOrCreateNotebook(
    repo,
    "personalCalendar",
    (notebook) => {
      generateCalendarPages({
        notebook,
        title: "Personal Calendar",
        year: getYear(new Date()),
        pageWidth: window.innerWidth,
        pageHeight: window.innerHeight,
      });
    }
  );
  updateCalendarPages(personalCalendarNotebook);
  notebookCollection.addNotebook(personalCalendarNotebook);

  const sharedCalendarNotebook = await loadOrCreateNotebook(
    repo,
    "sharedCalendar",
    (notebook) => {
      generateCalendarPages({
        notebook,
        title: "Lab Calendar",
        year: getYear(new Date()),
        pageWidth: window.innerWidth,
        pageHeight: window.innerHeight,
      });
    }
  );

  updateCalendarPages(sharedCalendarNotebook);
  notebookCollection.addNotebook(sharedCalendarNotebook);

  return notebookCollection;
}

const render = new Render();
const input = new InputSystem();

const notebookCollection = await initNotebookCollection();
const view = new View(notebookCollection);
const selection = new Selection(view, notebookCollection);

const addPageButtons = new AddPageButtons(view);
const overlaySwitcher = new OverlaySwitcher(view, notebookCollection);

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
  new Navigate(view, addPageButtons, overlaySwitcher),
]);

console.log(notebookCollection.rootPages);

tick((dt) => {
  toolbar.isActive = view.isZoomedIn();
  overlaySwitcher.isActive = view.isZoomedIn();
  addPageButtons.isActive = !view.isZoomedIn();

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
});
