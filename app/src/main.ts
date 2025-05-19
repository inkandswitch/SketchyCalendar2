import { State, initAutomergeDoc } from "state";
import Render from "lib/render";
import tick from "lib/tick";

console.log("boop");

const render = new Render();

const automergeDoc = await initAutomergeDoc(); // TODO: make this more generic
const state = new State(automergeDoc);

tick((dt) => {
  render.clear();
  state.sceneGraph.render(render);
});
