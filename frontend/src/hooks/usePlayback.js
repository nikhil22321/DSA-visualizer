import { useCallback, useEffect, useMemo, useState } from "react";

export const usePlayback = ({ steps, speed, shortcutsEnabled = true }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const maxStep = useMemo(() => Math.max(steps.length - 1, 0), [steps.length]);

  const stepForward = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, maxStep));
  }, [maxStep]);

  const stepBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, []);

  const jumpToStep = useCallback(
    (value) => {
      const safeValue = Math.max(0, Math.min(value, maxStep));
      setCurrentStep(safeValue);
    },
    [maxStep],
  );

  useEffect(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, [steps]);

  useEffect(() => {
    if (!isPlaying || !steps.length) {
      return undefined;
    }
    if (currentStep >= maxStep) {
      setIsPlaying(false);
      return undefined;
    }

    const timer = setTimeout(() => {
      setCurrentStep((prev) => Math.min(prev + 1, maxStep));
    }, Math.max(speed, 50));

    return () => clearTimeout(timer);
  }, [isPlaying, steps.length, currentStep, maxStep, speed]);

  useEffect(() => {
    if (!shortcutsEnabled) {
      return undefined;
    }
    const onKeyDown = (event) => {
      if (["INPUT", "TEXTAREA"].includes(event.target.tagName)) {
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        setIsPlaying((prev) => !prev);
      }
      if (event.code === "ArrowRight") {
        event.preventDefault();
        stepForward();
      }
      if (event.code === "ArrowLeft") {
        event.preventDefault();
        stepBack();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcutsEnabled, stepBack, stepForward]);

  return {
    currentStep,
    isPlaying,
    maxStep,
    setIsPlaying,
    stepForward,
    stepBack,
    reset,
    jumpToStep,
  };
};
