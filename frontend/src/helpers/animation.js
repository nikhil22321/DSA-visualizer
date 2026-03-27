export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const nextFrame = () =>
  new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });

// 🔥 MAIN UNIVERSAL ANIMATION ENGINE
export const runStepAnimation = async ({
  steps,
  onStep,
  getDelay,
  pauseRef,
  abortRef,
  onTone,
}) => {
  const start = performance.now();

  for (let index = 0; index < steps.length; index += 1) {
    if (abortRef.current) {
      return { elapsed: performance.now() - start, completed: false };
    }

    while (pauseRef.current && !abortRef.current) {
      await sleep(40);
    }

    if (abortRef.current) {
      return { elapsed: performance.now() - start, completed: false };
    }

    const step = steps[index];

    // 🔥 Apply UI updates (GRID / ARRAY / GRAPH)
    onStep(step, index, performance.now() - start);

    // 🔊 optional sound
    if (onTone) onTone(step);

    await nextFrame();
    await sleep(getDelay());
  }

  return { elapsed: performance.now() - start, completed: true };
};