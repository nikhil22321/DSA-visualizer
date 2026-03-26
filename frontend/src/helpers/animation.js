export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const nextFrame = () =>
  new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });

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
      // eslint-disable-next-line no-await-in-loop
      await sleep(40);
    }
    if (abortRef.current) {
      return { elapsed: performance.now() - start, completed: false };
    }

    const step = steps[index];
    onStep(step, index, performance.now() - start);
    if (onTone) onTone(step);

    // eslint-disable-next-line no-await-in-loop
    await nextFrame();
    // eslint-disable-next-line no-await-in-loop
    await sleep(getDelay());
  }

  return { elapsed: performance.now() - start, completed: true };
};
