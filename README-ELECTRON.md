# ClassManager – Electron Desktop App

## 🚀 ការចាប់ផ្តើម (Getting Started)

### Prerequisites
- Node.js 20+
- npm 10+

### ការ Install
```bash
npm install
```

---

## 🛠 Development Mode (ចាប់ Electron + Vite ក្នុង Dev)

```bash
# Step 1: Compile Electron TypeScript
npm run electron:compile

# Step 2: Start Vite + Electron together
npm run electron:dev
```

---

## 📦 Build สำหรับ Production

### Mac (DMG – Intel + Apple Silicon)
```bash
npm run electron:build:mac
```
→ Output: `release/ClassManager-1.0.0.dmg`

### Windows (NSIS Installer)
```bash
npm run electron:build:win
```
→ Output: `release/ClassManager Setup 1.0.0.exe`

### ទាំង Mac + Windows
```bash
npm run electron:build
```

---

## 🖼 App Icons

ដាក់ icon files ក្នុងថត `assets/`:

| File | Platform | Size |
|------|----------|------|
| `assets/icon.icns` | macOS | 512x512 (multi-resolution) |
| `assets/icon.ico` | Windows | 256x256 |
| `assets/icon.png` | Linux | 512x512 |

### បង្កើត icon ពី PNG មួយ
Install `electron-icon-builder`:
```bash
npx electron-icon-builder --input=assets/icon-source.png --output=assets
```

---

## 📁 Project Structure

```
ClassManager-main/
├── electron/
│   ├── main.ts          ← Electron main process
│   ├── preload.ts       ← Secure IPC bridge (contextBridge)
│   └── dev-runner.mjs   ← Dev launcher helper
├── electron-dist/       ← Compiled Electron JS (auto-generated)
├── src/                 ← React + Vite frontend (unchanged)
├── dist/                ← Vite built output (auto-generated)
├── release/             ← Packaged installers (auto-generated)
├── assets/              ← App icons (.icns, .ico, .png)
├── electron-builder.yml ← Build/packaging configuration
├── tsconfig.electron.json ← TypeScript config for Electron
└── vite.config.ts       ← Updated with base: './'
```

---

## 🔌 Electron API (ពី React)

```tsx
// Check if running inside Electron
const isElectron = !!window.electronAPI;

// Print current page
await window.electronAPI?.printPage();

// Show native save dialog
const result = await window.electronAPI?.showSaveDialog({
  title: 'Save Report',
  defaultPath: 'report.pdf',
  filters: [{ name: 'PDF', extensions: ['pdf'] }]
});

// Get app version
const version = await window.electronAPI?.getVersion();
```

---

## ⚙️ Firebase Notes

Firebase SDK works normally inside Electron because the app still runs in a Chromium renderer. No changes needed to `src/firebase.ts`.

For offline support, Firebase's built-in Firestore persistence will work as-is.

---

## 🔒 Security

- `contextIsolation: true` – renderer cannot access Node.js APIs directly
- `nodeIntegration: false` – no direct Node.js in renderer
- All IPC handlers are whitelist-only via `preload.ts`
- External URLs open in the default browser, not in the app window
