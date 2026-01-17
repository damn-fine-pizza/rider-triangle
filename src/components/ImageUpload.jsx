import { useState, useCallback, useRef } from 'react';

/**
 * Image upload component with drag & drop and file picker.
 *
 * @param {function} onUpload - Callback with (file, fileName) when image is selected
 * @param {string} className - Additional CSS classes
 */
export function ImageUpload({ onUpload, className = '' }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const validateFile = useCallback((file) => {
    if (!file) return 'No file selected';

    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'Please select an image file (JPEG, PNG, etc.)';
    }

    // Check file size (max 10MB for base64 storage)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'Image is too large. Maximum size is 10MB.';
    }

    return null;
  }, []);

  const handleFile = useCallback(
    (file) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      // Extract name without extension for label suggestion
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      onUpload(file, nameWithoutExt);
    },
    [onUpload, validateFile]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer?.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <div className={className}>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
          transition-colors duration-200
          ${
            isDragging
              ? 'border-[--accent] bg-blue-50 dark:bg-blue-900/30'
              : 'border-[--border-color] hover:border-[--accent] hover:bg-[--bg-card-hover]'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="text-muted">
          <svg
            className="mx-auto h-10 w-10 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm font-medium">
            {isDragging ? 'Drop image here' : 'Click or drag to upload'}
          </p>
          <p className="text-xs mt-1">JPEG, PNG up to 10MB</p>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
