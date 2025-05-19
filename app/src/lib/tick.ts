// Bare minimum delay between frames
const FPS15 = 1 / 15;

export default function tick(callback: (dt: number) => void) {
  let prevTimeStamp = 0;

  let isRunning = true;

  function step(timeStamp: number = 0) {
    if (!isRunning) {
      return;
    }

    // Compute dt
    const dt = Math.min((timeStamp - prevTimeStamp) / 1000, FPS15);
    prevTimeStamp = timeStamp;

    callback(dt);

    if (isRunning) {
      window.requestAnimationFrame(step);
    }
  }

  window.requestAnimationFrame((t: number) => {
    prevTimeStamp = t;
    step(t);
  });

  return () => {
    isRunning = false;
  };
}
