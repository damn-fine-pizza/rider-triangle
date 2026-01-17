/**
 * Onboarding overlay for guiding first-time users.
 */
export function OnboardingOverlay({
  isVisible,
  currentStep,
  currentStepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}) {
  if (!isVisible || !currentStep) return null;

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onSkip} aria-hidden="true" />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <div className="bg-[--bg-card] rounded-2xl shadow-xl overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-[--bg-card-hover]">
            <div
              className="h-full bg-[--accent] transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="text-xs text-muted mb-1">
              Step {currentStepIndex + 1} of {totalSteps}
            </div>
            <h2 id="onboarding-title" className="text-xl font-semibold mb-3">
              {currentStep.title}
            </h2>
            <p className="text-secondary mb-6">{currentStep.message}</p>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button onClick={onSkip} className="text-sm text-muted hover:text-primary">
                Skip tutorial
              </button>

              <div className="flex gap-2">
                {!isFirstStep && (
                  <button onClick={onPrev} className="btn-secondary">
                    Back
                  </button>
                )}
                <button onClick={onNext} className="btn-primary">
                  {isLastStep ? 'Get Started' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Compact onboarding tip that can be shown inline.
 */
export function OnboardingTip({ title, message, onDismiss }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium text-blue-900">{title}</div>
          <div className="text-blue-700 mt-0.5">{message}</div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-blue-500 hover:text-blue-700 flex-shrink-0"
            aria-label="Dismiss tip"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
