import { app, BrowserWindow, shell, ipcMain, dialog, Menu } from 'electron';
import { join } from 'path';
import { existsSync, createWriteStream, unlinkSync } from 'fs';
import { get as httpsGet } from 'https';
import { get as httpGet } from 'http';
import { URL } from 'url';

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

// ─── Direct In-App Update Downloader ──────────────────────────
function downloadFileWithProgress(
  urlStr: string,
  destPath: string,
  onProgress: (data: { percent: number; transferred: number; total: number; speed: number }) => void,
  maxRedirects = 5
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) {
      return reject(new Error('Too many redirects while downloading update'));
    }

    const parsedUrl = new URL(urlStr);
    const getFn = parsedUrl.protocol === 'http:' ? httpGet : httpsGet;

    const req = getFn(
      urlStr,
      {
        headers: {
          'User-Agent': 'ClassManager-Desktop-App',
          'Accept': 'application/octet-stream, application/vnd.github+json, */*',
        },
      },
      (res) => {
        // Follow HTTP Redirects (GitHub Release 302 -> AWS S3)
        if (
          res.statusCode &&
          [301, 302, 303, 307, 308].includes(res.statusCode) &&
          res.headers.location
        ) {
          res.resume();
          return resolve(
            downloadFileWithProgress(res.headers.location, destPath, onProgress, maxRedirects - 1)
          );
        }

        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          return reject(new Error(`Download failed with HTTP ${res.statusCode}`));
        }

        const total = parseInt(res.headers['content-length'] || '0', 10);
        let transferred = 0;
        let lastTime = Date.now();
        let lastTransferred = 0;
        let speed = 0;

        const fileStream = createWriteStream(destPath);

        res.on('data', (chunk: Buffer) => {
          transferred += chunk.length;
          const now = Date.now();
          if (now - lastTime >= 250) {
            speed = Math.round(((transferred - lastTransferred) / (now - lastTime)) * 1000);
            lastTime = now;
            lastTransferred = transferred;
            const percent = total > 0 ? Math.min(100, Math.round((transferred / total) * 100)) : 0;
            onProgress({ percent, transferred, total, speed });
          }
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(() => {
            onProgress({ percent: 100, transferred, total: total || transferred, speed: 0 });
            resolve(destPath);
          });
        });

        fileStream.on('error', (err) => {
          if (existsSync(destPath)) {
            try { unlinkSync(destPath); } catch {}
          }
          reject(err);
        });

        res.on('error', (err) => {
          if (existsSync(destPath)) {
            try { unlinkSync(destPath); } catch {}
          }
          reject(err);
        });
      }
    );

    req.on('error', (err) => {
      reject(err);
    });
  });
}

// Handle In-App Update Download & Auto-Open
ipcMain.handle('download-and-open-update', async (event, { url, fileName }: { url: string; fileName: string }) => {
  try {
    const downloadsFolder = app.getPath('downloads');
    const targetFile = join(downloadsFolder, fileName);

    await downloadFileWithProgress(url, targetFile, (progressData) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('update-download-progress', progressData);
      }
    });

    // Automatically open the downloaded installer (e.g. mounts DMG on Mac or executes EXE on Win)
    await shell.openPath(targetFile);

    return { success: true, filePath: targetFile };
  } catch (err: any) {
    return { success: false, error: err.message || 'បរាជ័យក្នុងការទាញយក' };
  }
});

// Open file path in OS
ipcMain.handle('open-file-path', async (_event, filePath: string) => {
  return shell.openPath(filePath);
});

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
