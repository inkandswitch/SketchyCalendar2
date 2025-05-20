import { WrapperEvent } from "inputsystem";
import { SceneGraph } from "scenegraph";

export class SwipeSystem {
  scenegraph: SceneGraph;

  last_x: number = 0;
  constructor(scenegraph: SceneGraph) {
    this.scenegraph = scenegraph;
  }

  update(events: Array<WrapperEvent>) {
    if (events.length == 0) return;
    for (const event of events) {
      if (event.type == "finger") {
        switch (event.phase) {
          case "began": {
            //this.scenegraph.zoomLevel.target =
            //this.scenegraph.zoomLevel.target == 1 ? 0.33 : 1;
            //console.log(this.scenegraph.zoomLevel.target);
            //this.last_x = event.position.x;
            break;
          }
          case "moved": {
            // const dx = event.position.x - this.last_x;
            // this.last_x = event.position.x;
            // this.scenegraph.zoomViewOffsets[0].target += dx;
            // this.scenegraph.zoomViewOffsets[1].target += dx * 3;
            break;
          }
          case "ended": {
            break;
          }
        }
      }
    }
  }
}
