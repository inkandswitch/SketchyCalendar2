export class AnimateVariable {
  value: number;
  target: number;

  constructor(value: number, a: number = 32, b: number = 20) {
    this.value = value;
    this.target = value;
  }

  setTarget(target: number) {
    this.target = target;
  }

  getCurrent(): number {
    return this.value;
  }

  update(dx: number) {
    this.value = this.value + (this.target - this.value) * dx * 15;
  }
}

// export class AnimateVariable {
//   value: number;
//   acceleration: number;
//   target: number;

//   a: number = 32;
//   b: number = 20;

//   constructor(value: number, a: number = 32, b: number = 20) {
//     this.value = value;
//     this.acceleration = 0;
//     this.target = value;
//     this.a = a;
//     this.b = b;
//   }

//   setTarget(target: number) {
//     this.target = target;
//   }

//   getCurrent(): number {
//     return this.value;
//   }

//   update(dx: number) {
//     let diff = this.target - this.value;
//     let diff_acceleration = diff - this.acceleration;
//     this.acceleration += diff_acceleration * dx * this.a;
//     this.value += this.acceleration * dx * this.b;
//   }

//   setDynamics(a: number, b: number) {
//     this.a = a;
//     this.b = b;
//   }
// }

// export class AnimatePosition {
//   position: Position;
//   x: AnimateVariable;
//   y: AnimateVariable;

//   constructor(position: Position) {
//     this.position = position;
//     this.x = new AnimateVariable(position.x);
//     this.y = new AnimateVariable(position.y);
//   }

//   set(position: Position) {
//     this.x.value = position.x;
//     this.y.value = position.y;
//     this.setTarget(position);
//   }

//   setTarget(position: Position) {
//     this.x.setTarget(position.x);
//     this.y.setTarget(position.y);
//   }

//   update(dx: number) {
//     this.x.update(dx);
//     this.y.update(dx);

//     this.position.x = this.x.getCurrent();
//     this.position.y = this.y.getCurrent();
//   }
// }
