import { State, initAutomergeDoc } from "state";
import Render from "lib/render";
import tick from "lib/tick";
import { InputSystem } from "inputsystem";
import { GestureSystem, SingleFingerSwipe } from "gesturesystem";

console.log("boop");

const render = new Render();
const input = new InputSystem();
const gestures = new GestureSystem([new SingleFingerSwipe()]);

const automergeDoc = await initAutomergeDoc(); // TODO: make this more generic
const state = new State(automergeDoc);

tick((dt) => {
  // Update
  gestures.update(input.buffer);

  // Render
  render.clear();
  state.sceneGraph.render(render);

  input.clear(); // cleanup the input buffer for the next round
});
