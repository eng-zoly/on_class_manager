/**
 * Type declarations for the Electron contextBridge API.
 * This lets TypeScript know about window.electronAPI in the renderer.
 */

interface ElectronSaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
}

interface ElectronOpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
}

interface ElectronDialogResult {
  canceled: boolean;
  filePath?: string;
  filePaths?: string[];
}

interface UpdateDownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  speed: number;
}

interface ElectronAPI {
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  printPage: () => Promise<{ success: boolean; error?: string }>;
  showSaveDialog: (options: ElectronSaveDialogOptions) => Promise<ElectronDialogResult>;
  showOpenDialog: (options: ElectronOpenDialogOptions) => Promise<ElectronDialogResult>;
  downloadAndOpenUpdate: (options: { url: string; fileName: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  onUpdateDownloadProgress: (callback: (data: UpdateDownloadProgress) => void) => () => void;
  openFilePath: (filePath: string) => Promise<string>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
