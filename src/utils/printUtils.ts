/**
 * Utility functions for document printing and dynamic PDF filename generation.
 */

/**
 * Formats a Date object or date string into DD-MM-YYYY format.
 */
export function formatDateForFilename(dateInput?: Date | string | null): string {
  if (!dateInput) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}-${month}-${year}`;
  }

  if (typeof dateInput === 'string') {
    // Check if format is YYYY-MM-DD
    const match = dateInput.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      const [, y, m, d] = match;
      return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    }
  }

  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}-${month}-${year}`;
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Sanitizes text to be safe for filenames across operating systems (Windows, macOS, Linux).
 */
export function sanitizeFilename(text: string): string {
  if (!text) return 'Student';
  return text
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
}

/**
 * Automatically sets a dynamic document.title before printing (so the browser uses it as
 * the default filename when 'Save as PDF' is selected), calls window.print(),
 * and immediately restores document.title back to its original state.
 *
 * Implements:
 * 1. Store original document.title
 * 2. Set new title (e.g. លទ្ធផលប្រឡង_[Student Name]_[DD-MM-YYYY])
 * 3. Trigger window.print() & immediately restore document.title
 */
export function triggerPrintWithDynamicTitle(dynamicTitle: string, onPrint?: () => void): void {
  // 1. Temporarily store original document.title
  const originalTitle = document.title || 'Class Management System';

  // 2. Set new title
  document.title = dynamicTitle;

  let isRestored = false;
  const restore = () => {
    if (!isRestored) {
      isRestored = true;
      document.title = originalTitle;
      window.removeEventListener('afterprint', restore);
    }
  };

  // Register listener for browser afterprint event
  window.addEventListener('afterprint', restore);

  try {
    // 3. Trigger Print
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  } finally {
    // Immediately restore back to original state
    restore();
  }
}
