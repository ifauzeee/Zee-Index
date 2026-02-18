
export const GOOGLE_DRIVE_API_BASE_URL = "https://www.googleapis.com/drive/v3";
export const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

export const MIME_TYPES = {
    FOLDER: "application/vnd.google-apps.folder",
    SHORTCUT: "application/vnd.google-apps.shortcut",
    GOOGLE_DOC: "application/vnd.google-apps.document",
    GOOGLE_SHEET: "application/vnd.google-apps.spreadsheet",
    GOOGLE_SLIDES: "application/vnd.google-apps.presentation",
    GOOGLE_DRAWING: "application/vnd.google-apps.drawing",
    GOOGLE_SCRIPT: "application/vnd.google-apps.script",
} as const;

export const EXPORT_TYPE_MAP = {
    [MIME_TYPES.GOOGLE_DOC]: {
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ext: ".docx",
    },
    [MIME_TYPES.GOOGLE_SHEET]: {
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ext: ".xlsx",
    },
    [MIME_TYPES.GOOGLE_SLIDES]: {
        mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ext: ".pptx",
    },
    [MIME_TYPES.GOOGLE_DRAWING]: {
        mime: "image/png",
        ext: ".png",
    },
    [MIME_TYPES.GOOGLE_SCRIPT]: {
        mime: "application/vnd.google-apps.script+json",
        ext: ".json",
    },
} as const;

export const REDIS_KEYS = {
    ACCESS_TOKEN: "google:access-token",
    CREDENTIALS: "zee-index:credentials",
    SHARE_BLOCKED: "zee-index:blocked:",
    MANUAL_DRIVES: "zee-index:manual-drives",
    FOLDER_TREE: "zee-index:folder-tree-v2:",
    FOLDER_CONTENT: "zee-index:folder-content-v3:",
    FILE_DETAILS: "gdrive:file-details-v2:",
    FOLDER_PATH: "zee-index:folder-path-v7:",
} as const;

export const REDIS_TTL = {
    ACCESS_TOKEN: 3500,
    FOLDER_TREE: 3600,
    FOLDER_CONTENT: 3600,
    FOLDER_CONTENT_EMPTY: 5,
    FILE_DETAILS: 600,
    FOLDER_PATH: 3600,
} as const;

export const MEMORY_CACHE_KEYS = {
    FOLDER_CONTENT: "drive:folder:",
    FILE_DETAILS: "drive:file:",
} as const;

export const ERROR_MESSAGES = {
    INVALID_GRANT: "invalid_grant",
    SESSION_EXPIRED: "Sesi Google Drive kadaluarsa. Silakan lakukan Setup ulang di /setup",
    APP_NOT_CONFIGURED: "Aplikasi belum dikonfigurasi. Silakan jalankan Setup Wizard.",
    AUTH_FAILED: "Otentikasi Gagal",
    FILE_NOT_FOUND: "File tidak ditemukan di Google Drive.",
    FOLDER_DOWNLOAD_NOT_SUPPORTED: "Tidak dapat mengunduh folder secara langsung.",
    INVALID_FILE_ID: "Format fileId tidak valid.",
    MISSING_FILE_ID: "Parameter fileId tidak ditemukan.",
    ACCESS_DENIED: "Access Denied: File is protected.",
    DOWNLOAD_LIMIT_EXCEEDED: "Terlalu banyak permintaan unduhan. Silakan tunggu sebentar.",
    RATE_LIMIT_EXCEEDED: "Terlalu banyak permintaan. Silakan coba lagi nanti.",
    INVALID_SHARE_TOKEN: "Invalid share token or authentication required.",
    SHARE_LINK_REVOKED: "Tautan ini telah dibatalkan.",
    INTERNAL_SERVER_ERROR: "Internal Server Error.",
} as const;

export const RATE_LIMITS = {
    API: {
        LIMIT: 100,
        WINDOW: 60,
    },
    DOWNLOAD: {
        LIMIT: 10,
        WINDOW: 60 * 60,
    },
    AUTH: {
        LIMIT: 5,
        WINDOW: 60 * 15,
    },
    ADMIN: {
        LIMIT: 50,
        WINDOW: 60,
    },
} as const;
