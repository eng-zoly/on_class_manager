import { app, BrowserWindow, shell, ipcMain, dialog, Menu } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';

// ─── Constants ────────────────────────────────────────────────
const isDev = !app.isPackaged;
const VITE_DEV_SERVER_URL = 'http://localhost:5173';

// ─── GPU & Performance Optimizations ─────────────────────────
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

let mainWindow: BrowserWindow | null = null;

// ─── Create Main Window ───────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'ClassManager',
    // Show window only after content is ready (prevents white flash)
    show: false,
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
    // macOS: clean hidden titlebar with nicely aligned traffic-light controls
    titleBarStyle: process.platform === 'darwin' ? 'hidden' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? { x: 20, y: 22 } : undefined,
    icon: getAppIcon(),
  });

  // Load app
  if (isDev) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    const indexPath = join(__dirname, '..', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  // Show window gracefully after paint
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  buildMenu();
}

// ─── App Icon (cross-platform) ────────────────────────────────
function getAppIcon(): string | undefined {
  const base = join(__dirname, '..', 'assets');
  if (process.platform === 'win32') {
    const ico = join(base, 'icon.ico');
    return existsSync(ico) ? ico : undefined;
  }
  if (process.platform === 'darwin') {
    const icns = join(base, 'icon.icns');
    return existsSync(icns) ? icns : undefined;
  }
  const png = join(base, 'icon.png');
  return existsSync(png) ? png : undefined;
}

// ─── Application Menu ─────────────────────────────────────────
function buildMenu() {
  const isMac = process.platform === 'darwin';

  const template: Electron.MenuItemConstructorOptions[] = [
    // macOS app menu
    ...(isMac
      ? ([
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ] as Electron.MenuItemConstructorOptions[])
      : []),

    // File menu
    {
      label: 'File',
      submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
    },

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const },
            ]
          : [{ role: 'delete' as const }, { type: 'separator' as const }, { role: 'selectAll' as const }]),
      ],
    },

    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(isDev ? [{ type: 'separator' as const }, { role: 'toggleDevTools' as const }] : []),
      ],
    },

    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' as const }, { role: 'front' as const }]
          : [{ role: 'close' as const }]),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── IPC Handlers ─────────────────────────────────────────────

// Print current page
ipcMain.handle('print-page', async () => {
  if (!mainWindow) return { success: false, error: 'No window' };
  try {
    await mainWindow.webContents.print({ silent: false, printBackground: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// Show native save dialog
ipcMain.handle('show-save-dialog', async (_event, options: Electron.SaveDialogOptions) => {
  if (!mainWindow) return { canceled: true };
  return dialog.showSaveDialog(mainWindow, options);
});

// Show native open dialog
ipcMain.handle('show-open-dialog', async (_event, options: Electron.OpenDialogOptions) => {
  if (!mainWindow) return { canceled: true };
  return dialog.showOpenDialog(mainWindow, options);
});

// Get app version
ipcMain.handle('get-app-version', () => app.getVersion());

// Get platform
ipcMain.handle('get-platform', () => process.platform);

// ─── App Lifecycle ────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();

  // macOS: re-create window on dock icon click
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // On macOS, keep app in dock unless user explicitly quits
  if (process.platform !== 'darwin') app.quit();
});

// Security: prevent new window creation
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (isDev && url.startsWith(VITE_DEV_SERVER_URL)) return;
    event.preventDefault();
    shell.openExternal(url);
  });
});
