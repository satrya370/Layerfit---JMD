import type { RenderErrorCode, RenderStage } from '../../shared/render-contract.js';

/** Transient failures that may succeed on a fresh page/browser. Input, asset, font and layout errors are deterministic. */
const RETRYABLE: ReadonlySet<RenderErrorCode> = new Set([
  'BROWSER_DISCONNECTED', 'PAGE_CREATE_FAILED', 'PAGE_CRASH', 'CONTENT_TIMEOUT', 'READINESS_TIMEOUT', 'SCREENSHOT_TIMEOUT', 'TASK_DEADLINE', 'STORAGE_FAILED', 'INTERRUPTED',
]);

/**
 * `message` is safe to return to callers and show in a UI. Raw exception text from Chromium, Sharp or the filesystem
 * can contain local paths or provider detail, so it is kept only in `internal` (for operator logs) and `cause`.
 */
export class RenderError extends Error {
  readonly retryable: boolean;
  /** Raw detail for operator logs only. Never copied into RenderResult. */
  readonly internal: string | undefined;
  constructor(readonly code: RenderErrorCode, readonly stage: RenderStage, message: string, options?: { cause?: unknown; retryable?: boolean; internal?: string }) {
    super(message, { cause: options?.cause });
    this.name = 'RenderError';
    this.retryable = options?.retryable ?? RETRYABLE.has(code);
    this.internal = options?.internal ?? (options?.cause instanceof Error ? options.cause.message.slice(0, 500) : undefined);
  }
}

export const isRetryable = (code: RenderErrorCode) => RETRYABLE.has(code);

const TIMEOUT_CODE: Partial<Record<RenderStage, RenderErrorCode>> = { content: 'CONTENT_TIMEOUT', readiness: 'READINESS_TIMEOUT', layout: 'READINESS_TIMEOUT', screenshot: 'SCREENSHOT_TIMEOUT', page: 'PAGE_CREATE_FAILED' };

/** Map unknown errors (Puppeteer/CDP/Sharp/fs) to a stable code without leaking raw provider detail. */
export function toRenderError(error: unknown, stage: RenderStage): RenderError {
  if (error instanceof RenderError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : '';
  if (/Target crashed|Page crashed/i.test(message)) return new RenderError('PAGE_CRASH', stage, 'Page crashed during rendering', { cause: error });
  if (/Connection closed|disconnected|Browser has been closed|Target closed|Session closed|detached Frame/i.test(message)) {
    return new RenderError('BROWSER_DISCONNECTED', stage, 'Browser connection lost during rendering', { cause: error });
  }
  if (name === 'TimeoutError' || /timed? ?out/i.test(message)) return new RenderError(TIMEOUT_CODE[stage] ?? 'TASK_DEADLINE', stage, `Timed out during ${stage}`, { cause: error });
  const fallback: Partial<Record<RenderStage, RenderErrorCode>> = { encode: 'ENCODE_FAILED', storage: 'STORAGE_FAILED', commit: 'DB_COMMIT_FAILED', page: 'PAGE_CREATE_FAILED' };
  return new RenderError(fallback[stage] ?? 'INTERNAL', stage, `Unexpected failure during ${stage}`, { cause: error, internal: message.slice(0, 500) });
}

/** Promise deadline. Does not cancel native work; callers must also discard the page/browser on timeout. */
export async function withTimeout<T>(work: Promise<T>, ms: number, code: RenderErrorCode, stage: RenderStage): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new RenderError(code, stage, `Timed out after ${ms}ms during ${stage}`)), ms);
  });
  try { return await Promise.race([work, deadline]); } finally { clearTimeout(timer); }
}
