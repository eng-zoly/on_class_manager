import { contextBridge, ipcRenderer } from 'electron';

// If running on macOS, mark root element so CSS can adapt spacing for native traffic lights
if (process.platform === 'darwin') {
  const addMacClass = () => {
    if (document.documentElement) {
      document.documentElement.classList.add('is-mac');
    }
  };
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', addMacClass);
  } else {
    addMacClass();
  }
}

/**
 * Secure bridge between Renderer (React) and Main process.
 * Only the APIs listed here are accessible from the renderer.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // ── App Info ──────────────────────────────────────────
  getVersion: (): Promise<string> =>
    ipcRenderer.invoke('get-app-version'),

  getPlatform: (): Promise<NodeJS.Platform> =>
    ipcRenderer.invoke('get-platform'),

  // ── Printing ─────────────────────────────────────────
  printPage: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('print-page'),

  // ── Native Dialogs ────────────────────────────────────
  showSaveDialog: (
    options: Electron.SaveDialogOptions
  ): Promise<Electron.SaveDialogReturnValue> =>
    ipcRenderer.invoke('show-save-dialog', options),

  showOpenDialog: (
    options: Electron.OpenDialogOptions
  ): Promise<Electron.OpenDialogReturnValue> =>
    ipcRenderer.invoke('show-open-dialog', options),
});

// ── Type declarations for TypeScript ──────────────────────────
// These are also in src/electron.d.ts so the renderer can use them
