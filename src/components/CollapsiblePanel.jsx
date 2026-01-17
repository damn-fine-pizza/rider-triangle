import { useState, useCallback } from 'react';

/**
 * Collapsible panel for mobile-friendly UI.
 * Panels can be expanded/collapsed with a header toggle.
 */
export function CollapsiblePanel({
  title,
  children,
  defaultOpen = true,
  stepNumber,
  badge,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <div className={`bg-white rounded-2xl shadow overflow-hidden ${className}`}>
      {/* Header - always visible */}
      <button
        onClick={toggleOpen}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        aria-expanded={isOpen}
        aria-controls={`panel-${stepNumber || title}`}
      >
        <div className="flex items-center gap-2">
          {stepNumber && (
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {stepNumber}
            </span>
          )}
          <h2 className="font-medium">{title}</h2>
          {badge && (
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content - collapsible */}
      <div
        id={`panel-${stepNumber || title}`}
        className={`transition-all duration-200 ease-in-out ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}
