/**
 * IndexedDB wrapper for storing large data (images).
 * Provides a simple key-value interface with async operations.
 */

const DB_NAME = 'rider-triangle-db';
const DB_VERSION = 1;
const STORE_NAME = 'images';

let dbPromise = null;

/**
 * Open the IndexedDB database.
 *
 * @returns {Promise<IDBDatabase>} Database instance
 */
function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object store for images
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });

  return dbPromise;
}

/**
 * Store a value in IndexedDB.
 *
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @returns {Promise<void>}
 */
export async function setItem(key, value) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(value, key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get a value from IndexedDB.
 *
 * @param {string} key - Storage key
 * @returns {Promise<*>} Stored value or undefined
 */
export async function getItem(key) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Remove a value from IndexedDB.
 *
 * @param {string} key - Storage key
 * @returns {Promise<void>}
 */
export async function removeItem(key) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get all keys from IndexedDB.
 *
 * @returns {Promise<string[]>} Array of keys
 */
export async function getAllKeys() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAllKeys();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Clear all data from IndexedDB.
 *
 * @returns {Promise<void>}
 */
export async function clear() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Check if IndexedDB is supported.
 *
 * @returns {boolean} True if IndexedDB is available
 */
export function isSupported() {
  return 'indexedDB' in window;
}
