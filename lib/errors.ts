export interface ErrorResponsePayload {
  error?: string;
  protected?: boolean;
  folderId?: string;
}

export interface RequestErrorOptions {
  status?: number;
  isProtected?: boolean;
  folderId?: string;
  cause?: unknown;
}

export class RequestError extends Error {
  status?: number;
  isProtected: boolean;
  folderId?: string;

  constructor(message: string, options: RequestErrorOptions = {}) {
    super(message);
    this.name = "RequestError";
    this.status = options.status;
    this.isProtected = options.isProtected ?? false;
    this.folderId = options.folderId;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export function getErrorMessage(
  error: unknown,
  fallback: string = "Unknown error",
): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.length > 0) {
    return error;
  }

  return fallback;
}
