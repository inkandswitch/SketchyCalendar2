import { LINK_COLOR } from "./constants";
import { Notebook } from "things/notebook";

const container = document.createElement("div");
container.style.position = "absolute";
container.style.bottom = "20px";
container.style.right = "20px";
container.style.display = "none";
container.style.zIndex = "1000";

const link = document.createElement("a");
link.target = "_blank";
link.textContent = "Settings";
link.style.font = "30px Avenir";
link.style.textDecoration = "none";
link.style.color = LINK_COLOR;

container.appendChild(link);

document.body.appendChild(container);

export function showSettingsLink(notebook: Notebook) {
  link.href = `/config.html?notebookDocUrl=${notebook.documentId}`;
  container.style.display = "inherit";
}

export function hideSettingsLink() {
  container.style.display = "none";
}
