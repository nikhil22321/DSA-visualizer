export const highlightedPseudocode = (lines, activeLine) =>
  lines.map((line, idx) => ({
    lineNumber: idx + 1,
    text: line,
    active: activeLine === idx + 1,
  }));
