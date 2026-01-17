/**
 * Image compression utilities to reduce storage size.
 * Uses Canvas API to resize and compress images.
 */

const DEFAULT_MAX_WIDTH = 1600;
const DEFAULT_MAX_HEIGHT = 1200;
const DEFAULT_QUALITY = 0.8;

/**
 * Compress an image file to reduce storage size.
 *
 * @param {File} file - Image file to compress
 * @param {Object} options - Compression options
 * @param {number} options.maxWidth - Maximum width (default 1600)
 * @param {number} options.maxHeight - Maximum height (default 1200)
 * @param {number} options.quality - JPEG quality 0-1 (default 0.8)
 * @returns {Promise<string>} Compressed image as base64 data URL
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = DEFAULT_MAX_WIDTH,
    maxHeight = DEFAULT_MAX_HEIGHT,
    quality = DEFAULT_QUALITY,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };

    reader.onerror = reject;

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG for better compression (unless PNG is needed for transparency)
      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(mimeType, quality);

      resolve(dataUrl);
    };

    img.onerror = () => reject(new Error('Failed to load image'));

    reader.readAsDataURL(file);
  });
}

/**
 * Get the size of a base64 string in bytes.
 *
 * @param {string} base64 - Base64 encoded string
 * @returns {number} Size in bytes
 */
export function getBase64Size(base64) {
  // Remove data URL prefix if present
  const base64Data = base64.split(',')[1] || base64;
  // Base64 encodes 3 bytes as 4 characters
  return Math.ceil((base64Data.length * 3) / 4);
}

/**
 * Format bytes to human-readable string.
 *
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Check if an image needs compression based on size.
 *
 * @param {string} base64 - Base64 encoded image
 * @param {number} maxBytes - Maximum size in bytes (default 500KB)
 * @returns {boolean} True if image should be compressed
 */
export function shouldCompress(base64, maxBytes = 500 * 1024) {
  return getBase64Size(base64) > maxBytes;
}
