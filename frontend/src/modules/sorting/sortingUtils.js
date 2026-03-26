export const generateSortingArray = (size = 30) =>
  Array.from({ length: size }, () => Math.floor(Math.random() * 95) + 5);

export const speedToDelay = (speedValue) => {
  const clamped = Math.max(1, Math.min(100, speedValue));
  return Math.round(500 - ((clamped - 1) / 99) * 450);
};

export const shouldHideBarLabels = (size) => size > 30;

export const formatExecutionTime = (ms) => `${(ms / 1000).toFixed(2)}s`;
