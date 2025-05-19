import { State, initAutomergeDoc } from "state";

console.log("boop");

const automergeDoc = await initAutomergeDoc(); // TODO: make this more generic
const state = new State(automergeDoc);
