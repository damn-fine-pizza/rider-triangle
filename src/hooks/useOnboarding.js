import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'rider-triangle-onboarding';

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Rider Triangle',
    message:
      'Compare motorcycle riding positions by overlaying bike photos and analyzing ergonomic angles.',
    highlight: null,
  },
  {
    id: 'bikes',
    title: 'Step 1: Select Your Bikes',
    message:
      'Use "Manage bikes" to upload your own bike photos, or use the default bikes to start.',
    highlight: 'bikes',
  },
  {
    id: 'calibrate',
    title: 'Step 2: Calibrate the Wheel',
    message: 'Select which wheel to use for calibration. The tire size determines the scale.',
    highlight: 'wheel',
  },
  {
    id: 'points',
    title: 'Step 3: Click on the Image',
    message:
      'Click to place calibration points (wheel TOP/BOTTOM, axle) then the rider triangle (seat, footpeg, handlebar).',
    highlight: 'tools',
  },
  {
    id: 'rider',
    title: 'Step 4: Enter Your Measurements',
    message: 'Add your height and body measurements for accurate angle calculations.',
    highlight: 'rider',
  },
  {
    id: 'results',
    title: 'Step 5: View Results',
    message:
      'See your ergonomic angles with color-coded comfort zones. Export or share your comparison!',
    highlight: 'angles',
  },
];

/**
 * Hook for managing first-time user onboarding.
 */
export function useOnboarding() {
  const [isComplete, setIsComplete] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'complete';
    } catch {
      return false;
    }
  });

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(!isComplete);

  // Persist completion state
  useEffect(() => {
    try {
      if (isComplete) {
        localStorage.setItem(STORAGE_KEY, 'complete');
      }
    } catch {
      // localStorage not available
    }
  }, [isComplete]);

  const currentStep = ONBOARDING_STEPS[currentStepIndex];

  const nextStep = useCallback(() => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStepIndex((i) => i + 1);
    } else {
      setIsComplete(true);
      setIsVisible(false);
    }
  }, [currentStepIndex]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((i) => i - 1);
    }
  }, [currentStepIndex]);

  const skip = useCallback(() => {
    setIsComplete(true);
    setIsVisible(false);
  }, []);

  const restart = useCallback(() => {
    setCurrentStepIndex(0);
    setIsComplete(false);
    setIsVisible(true);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage not available
    }
  }, []);

  return {
    isComplete,
    isVisible,
    currentStep,
    currentStepIndex,
    totalSteps: ONBOARDING_STEPS.length,
    nextStep,
    prevStep,
    skip,
    restart,
  };
}
