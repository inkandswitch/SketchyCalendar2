import { State, initAutomergeDoc } from "state";
import Render from "lib/render";
import tick from "lib/tick";
import { InputSystem } from "inputsystem";
import { GestureSystem } from "gesturesystem";
import PinchIn from "gestures/pinchin";
import { SwipeSystem } from "swipe";

const render = new Render();
const input = new InputSystem();

const automergeDoc = await initAutomergeDoc(); // TODO: make this more generic
const state = new State(automergeDoc);

const gestures = new GestureSystem([new PinchIn(state.sceneGraph)]);

//const swipe = new SwipeSystem(state.sceneGraph);

tick((dt) => {
  // Update
  gestures.update(input.buffer);
  state.sceneGraph.update(dt);
  input.clear(); // cleanup the input buffer for the next round

  // Render
  render.clear();
  state.sceneGraph.render(render);
});
