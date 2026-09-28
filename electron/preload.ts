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

  // ── Auto Update In-App ────────────────────────────────
  downloadAndOpenUpdate: (
    options: { url: string; fileName: string }
  ): Promise<{ success: boolean; filePath?: string; error?: string }> =>
    ipcRenderer.invoke('download-and-open-update', options),

  onUpdateDownloadProgress: (
    callback: (data: { percent: number; transferred: number; total: number; speed: number }) => void
  ) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('update-download-progress', handler);
    return () => {
      ipcRenderer.removeListener('update-download-progress', handler);
    };
  },

  openFilePath: (filePath: string): Promise<string> =>
    ipcRenderer.invoke('open-file-path', filePath),
});

// ── Type declarations for TypeScript ──────────────────────────
// These are also in src/electron.d.ts so the renderer can use them
