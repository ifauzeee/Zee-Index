# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-05-21

### Added

- **Multi-Drive & Storage Support**:
  - Implemented dynamic subfolder upload capability for File Requests allowing senders to specify custom directories.
  - Added support for Google Drive uploads under specific parent folders in file requests.
  - Added local storage target capability for file explorer and file request targets.
- **Dynamic Share Links**:
  - Added dynamic parameters editing (`loginRequired`, `maxUses`, `preventDownload`, `hasWatermark`, `watermarkText`, `expiresAt`) for active share links.
  - Implemented instantaneous synchronization to Redis cache (`share:link:${jti}`) to ensure Edge Middleware enforces new settings immediately.
  - Added shared collections allowing multiple files/folders to be grouped in a single share link.
  - Built a Framer Motion-powered share editing modal in the Admin dashboard.
- **File Versioning / Revisions**:
  - Added Google Drive File Version History UI modal for administrators.
  - Exposed revision tracking context menu action seamlessly integrated with the explorer state lifecycle.
- **Security & Session Enhancements**:
  - Implemented secure 2FA (Two-Factor Authentication) using standard TOTP algorithms (verify, generate, status, disable, and verification at login).
  - Improved Local Storage security by introducing password-protected folder access and session token controls.
- **Infrastructure & Monitoring**:
  - Added incident monitor evaluations (`/api/cron/incident-monitor`).
  - Added real-time operational status metrics, error-trend tracking, and database/cache latency stats in Admin panel.
  - Set up standard healthcheck endpoints `/api/health` and `/api/admin/system-health`.

### Changed

- Increased Docker healthcheck startup period to `180s` to accommodate longer startup times on slower hosts (Prisma database migrations and Next.js initialization).
- Improved caching using lazy-initialized Redis singleton connections.

### Fixed

- Fixed API route endpoints mapping errors and HTTP methods for `/api/files/delete`, `/api/files/rename`, `/api/files/move`, and `/api/files/update` from `DELETE`/`PATCH` to `POST` in the codebase.
- Standardized file request upload pipeline to prevent duplicate storage writes.
- Fixed context menu click lifecycle state issue by storing details persistently in `actionState`.

---

## [1.0.0] - 2026-01-15

### Added

- Initial release of Zee-Index.
- Basic Google Drive indexing and explorer interface.
- timed share link generation.
- Admin dashboard for standard configurations.
