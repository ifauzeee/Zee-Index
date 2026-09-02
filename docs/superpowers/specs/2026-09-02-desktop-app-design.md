# Zee-Index Desktop App — Design Spec

**Date:** 2026-09-02
**Status:** Approved (pending user review)
**Stack:** Electron + SQLite (self-contained) / PostgreSQL (client mode)

## 1. Tujuan

Membuat Zee-Index (Next.js web app) menjadi desktop application Windows berupa single `.exe` installer. Mendukung dua mode:

1. **Self-contained (default)** — semua backend di-bundle, berjalan offline di laptop/PC user.
2. **Client mode** — connect ke server Zee-Index yang sudah di-deploy (remote PostgreSQL + Redis + Google Drive).

Full feature parity dengan web version, ditambah native enhancements.

## 2. Target Platform

- Windows only (single .exe installer via NSIS + portable version).

## 3. Architecture

```
┌─────────────────────────────────────────────┐
│              Electron Main Process           │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │ Next.js     │  │ SQLite (Prisma)      │  │
│  │ Server      │  │ or PostgreSQL (mode)  │  │
│  │ :3000       │  │                       │  │
│  └──────┬──────┘  └──────────────────────┘  │
│         │                                    │
│  ┌──────┴──────────────────────────────┐    │
│  │         Electron BrowserWindow      │    │
│  │         (loads localhost:3000)       │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │  Native: System Tray, Auto-Update,  │    │
│  │  File associations, IPC handlers    │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### Detail

- Next.js server dijalankan sebagai proses di dalam Electron main process.
- Renderer = `BrowserWindow` yang load `http://localhost:3000` (standalone output).
- SQLite via Prisma untuk self-contained mode; PostgreSQL untuk client mode.
- IPC bridge (preload script) untuk native features.
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.

## 4. Database & Storage

### Self-contained mode (default)

- **DB**: SQLite via Prisma, file `.db` di `%APPDATA%/zee-index/`.
- **Cache**: In-memory (bukan Redis) — cukup untuk single user.
- **Storage**: local filesystem di folder pilihan user.

### Client mode

- **DB**: connect ke PostgreSQL remote (connection string dari user).
- **Cache**: connect ke Redis remote.
- **Storage**: Google Drive API (sama seperti web).

### Mode switching

- Dipilih saat first-run setup atau di Settings > General.
- Ganti mode = restart app + re-init database.

## 5. Features & Native Enhancements

- **Full feature parity** — semua fitur web: file browser, streaming, admin dashboard, share links, upload, bulk ops, dll.
- **System tray** — minimize to tray, quick access menu.
- **Native file drag-drop** — drag file dari Windows Explorer ke folder Zee-Index.
- **File association** — open file dengan Zee-Index dari Explorer (right-click → Open with).
- **Auto-update** — electron-updater, push update dari GitHub releases.
- **Auto-start** — opsi start saat Windows login.
- **Toast notifications** — native OS notification untuk event (download selesai, dll).

## 6. Packaging & Distribution

- **Installer**: NSIS via electron-builder → `.exe` + portable version.
- **Build**: `electron-builder` bundle Next.js standalone output + Electron.
- **Auto-update**: electron-updater dengan GitHub Releases (private repo).
- **Signing**: opsional, tanpa code signing Windows warning SmartScreen.

## 7. Keamanan

- **CSP**: pakai yang sudah ada, tidak diubah.
- **Electron best practices**: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, IPC hanya via preload, tidak ada remote content loading.
- **SQLite**: hak akses terbatas ke user.
- **Setup Google Drive** tetap via `/setup` (OAuth).
- **Secrets**: tidak di-embed saat build; di-set via settings/UI.

## 8. First-run Experience

Wizard (window khusus):

1. Pilih mode — **Local (SQLite)** vs **Remote (PostgreSQL + Redis)**.
2. Jika Local: pilih storage folder.
3. Jika Remote: isi connection strings.
4. Setup Google Drive (OAuth `/setup`).
5. Admin credentials.
6. Selesai → buka app utama.

## 9. Repo & Project Structure

### Repo (monorepo terpisah)

Desktop app berada di **repo terpisah** bernama `Zee-Index-Desktop`, terpisah dari repo `zee-index` (web). Alasan: isolasi build desktop dari build web, versioning sendiri, tidak membebani node_modules web.

- Repo baru `Zee-Index-Desktop` berisi hanya desktop app.
- `zee-index` (web/Next.js) dijadikan dependency — di-build sebagai standalone output lalu di-bundle ke dalam Electron.
- Konsumsi via git submodule atau dependency npm dari source, atau build artifact.

### Struktur repo `Zee-Index-Desktop`

```
electron/            # Electron main process & preload
  main.ts            # main entry
  preload.ts         # contextBridge IPC
  tray.ts            # system tray
  updater.ts         # auto-update
  storage.ts         # local storage / folder picker
src/                 # Next.js web source (dari zee-index) atau build artifact
desktop/             # build & config
  electron-builder.yml
  icons/             # .ico, .png
```

`next.config.mjs` — pastikan `output: 'standalone'` + `serverExternalPackages` untuk Prisma/grammar.

## 10. Keberhasilan

- `.exe` installer berjalan di Windows tanpa dependency eksternal.
- Self-contained mode: SQLite + Google Drive + local storage bekerja offline.
- Client mode: connect ke server remote berjalan normal.
- Semua fitur web berfungsi di dalam BrowserWindow.
- Native enhancements (tray, drag-drop, auto-update) bekerja.
