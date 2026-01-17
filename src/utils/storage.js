/**
 * Storage utility for persisting app state in localStorage.
 * Handles bike configurations, images (as base64), and calibration data.
 */

const STORAGE_KEY = 'rider-triangle-state';

/**
 * Load saved state from localStorage
 * @returns {Object|null} Saved state or null if none exists
 */
export function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch (e) {
    console.warn('Failed to load state from localStorage:', e);
    return null;
  }
}

/**
 * Save state to localStorage
 * @param {Object} state - State to save
 */
export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save state to localStorage:', e);
    // If quota exceeded, try to clear old data
    if (e.name === 'QuotaExceededError') {
      console.warn('Storage quota exceeded. Consider clearing old images.');
    }
  }
}

/**
 * Clear saved state from localStorage
 */
export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear state:', e);
  }
}

/**
 * Convert File to base64 data URL
 * @param {File} file - Image file
 * @returns {Promise<string>} Base64 data URL
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Check if a string is a valid base64 data URL
 * @param {string} str - String to check
 * @returns {boolean} True if valid data URL
 */
export function isDataURL(str) {
  return typeof str === 'string' && str.startsWith('data:');
}

/**
 * Estimate storage usage in bytes
 * @returns {number} Estimated bytes used
 */
export function estimateStorageUsage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? new Blob([saved]).size : 0;
  } catch {
    return 0;
  }
}

/**
 * Format bytes to human readable string
 * @param {number} bytes - Bytes
 * @returns {string} Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
