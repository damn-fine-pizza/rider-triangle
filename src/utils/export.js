import html2canvas from 'html2canvas';

/**
 * Export utilities for saving and sharing comparisons.
 */

/**
 * Export an element as PNG image.
 *
 * @param {HTMLElement} element - DOM element to capture
 * @param {string} filename - Download filename (without extension)
 * @returns {Promise<void>}
 */
export async function exportAsPNG(element, filename = 'rider-triangle-comparison') {
  if (!element) {
    throw new Error('No element provided for export');
  }

  const canvas = await html2canvas(element, {
    backgroundColor: '#f9fafb',
    scale: 2, // Higher resolution
    useCORS: true, // Allow cross-origin images
    logging: false,
  });

  // Convert to blob and download
  canvas.toBlob((blob) => {
    if (!blob) {
      throw new Error('Failed to create image blob');
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

/**
 * Encode state to URL-safe string.
 *
 * @param {Object} state - State object to encode
 * @returns {string} Base64 encoded string
 */
export function encodeState(state) {
  const json = JSON.stringify(state);
  // Use btoa for base64 encoding (URL-safe with encodeURIComponent)
  return encodeURIComponent(btoa(json));
}

/**
 * Decode state from URL string.
 *
 * @param {string} encoded - Base64 encoded string
 * @returns {Object|null} Decoded state object or null if invalid
 */
export function decodeState(encoded) {
  try {
    const json = atob(decodeURIComponent(encoded));
    return JSON.parse(json);
  } catch (e) {
    console.error('Failed to decode state:', e);
    return null;
  }
}

/**
 * Generate shareable URL with current state.
 *
 * @param {Object} state - State to share (markers, measurements, etc.)
 * @returns {string} Full URL with encoded state
 */
export function generateShareableURL(state) {
  const encoded = encodeState(state);
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?s=${encoded}`;
}

/**
 * Parse state from current URL.
 *
 * @returns {Object|null} Decoded state or null if not present
 */
export function parseURLState() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('s');
  if (!encoded) return null;
  return decodeState(encoded);
}

/**
 * Copy text to clipboard.
 *
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if successful
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    console.error('Failed to copy to clipboard:', e);
    return false;
  }
}

/**
 * Save session to localStorage.
 *
 * @param {string} name - Session name
 * @param {Object} state - State to save
 */
export function saveSession(name, state) {
  const sessions = getSavedSessions();
  sessions[name] = {
    state,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem('rider-triangle-sessions', JSON.stringify(sessions));
}

/**
 * Get all saved sessions.
 *
 * @returns {Object} Map of session name to {state, savedAt}
 */
export function getSavedSessions() {
  try {
    const stored = localStorage.getItem('rider-triangle-sessions');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Load a saved session.
 *
 * @param {string} name - Session name
 * @returns {Object|null} Session state or null if not found
 */
export function loadSession(name) {
  const sessions = getSavedSessions();
  return sessions[name]?.state || null;
}

/**
 * Delete a saved session.
 *
 * @param {string} name - Session name to delete
 */
export function deleteSession(name) {
  const sessions = getSavedSessions();
  delete sessions[name];
  localStorage.setItem('rider-triangle-sessions', JSON.stringify(sessions));
}
