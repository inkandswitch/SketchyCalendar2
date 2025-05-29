import { AutomergeUrl, DocumentId, Repo } from "@automerge/automerge-repo";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import { Notebook, NotebookProps } from "things/notebook";

const repo = new Repo({
  network: [new BrowserWebSocketClientAdapter("wss://sync.automerge.org")],
  storage: new IndexedDBStorageAdapter(),
});

const urlParams = new URLSearchParams(window.location.search);
const notebookDocId = urlParams.get("notebookDocUrl");

if (notebookDocId) {
  const docHandle = await repo.find<NotebookProps>(notebookDocId as DocumentId);

  const calendarUrlInput = document.getElementById(
    "calendar-url"
  ) as HTMLInputElement;
  const saveButton = document.getElementById(
    "save-button"
  ) as HTMLButtonElement;

  const pageTitle = document.getElementById("page-title") as HTMLHeadingElement;
  const loadingPage = document.getElementById("loading-page") as HTMLDivElement;
  const configPage = document.getElementById("config-page") as HTMLDivElement;

  const notebook = new Notebook(docHandle);

  calendarUrlInput.value = notebook.calendarDocUrl ?? "";

  const rootPage = notebook.pages.find(
    (page) => page.template && page.template.type === "year"
  )!;

  const title = rootPage.paper.texts.find((text) =>
    text.labels.includes("title")
  )!;

  pageTitle.textContent = title.value;

  loadingPage.classList.add("hidden");
  configPage.classList.remove("hidden");

  saveButton.addEventListener("click", async () => {
    try {
      const calendarUrl = calendarUrlInput.value;

      if (!calendarUrl.startsWith("automerge:")) {
        throw new Error("Invalid calendar url");
      }

      const calendarDocHandle = await repo.find<NotebookProps>(
        notebookDocId as DocumentId
      );

      notebook.setCalendarUrl(calendarUrl as AutomergeUrl);
    } catch (e) {
      alert("Invalid calendar url");
    }
  });
}
