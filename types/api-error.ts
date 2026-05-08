export type ApiErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'USER_INACTIVE'
  | 'SESSION_EXPIRED'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status?: number,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export function toApiError(error: unknown, fallbackMessage: string): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    return new ApiError('UNKNOWN', error.message || fallbackMessage);
  }

  return new ApiError('UNKNOWN', fallbackMessage);
}
