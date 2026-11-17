/**
 * Browser lifecycle adapted from IG-Content-Builder (commit 9ce00976664d1ac036bc38b75a8cf21621eac719,
 * ig-templates-demo/scripts/build-and-render-demo.mjs lines 43–52, 115): connect to CHROMIUM_WS_ENDPOINT or launch.
 * Changes: sandbox kept (no --no-sandbox), ownership-aware close (remote browsers are only disconnected),
 * one isolated context per task, page creation inside the error boundary, bounded restart, cleanup timeouts.
 */
import puppeteer, { type Browser, type BrowserContext, type Page } from 'puppeteer';
import { RenderError, toRenderError, withTimeout } from './errors.js';

export interface BrowserHooks {
  /** Test-only fault injection seams. */
  beforeNewPage?(): void | Promise<void>;
  beforeCleanup?(): void | Promise<void>;
}

export interface BrowserManagerOptions {
  mode: 'launch' | 'connect';
  executablePath?: string;
  wsEndpoint?: string;
  launchTimeoutMs?: number;
  protocolTimeoutMs?: number;
  pageTimeoutMs?: number;
  closeTimeoutMs?: number;
  /** Restarts allowed in a row without a successful render. Default 2. */
  maxConsecutiveRestarts?: number;
  /** After the budget is exhausted, tasks fail fast for this long, then the budget is renewed. Default 30 s. */
  restartCooldownMs?: number;
  hooks?: BrowserHooks;
  onWarning?: (message: string) => void;
}

/** Operator configuration only; never derived from request data. */
export function browserOptionsFromEnv(env: NodeJS.ProcessEnv = process.env): BrowserManagerOptions {
  const wsEndpoint = env.CHROMIUM_WS_ENDPOINT?.trim();
  if (wsEndpoint) return { mode: 'connect', wsEndpoint };
  const executablePath = env.CHROMIUM_EXECUTABLE_PATH?.trim();
  return { mode: 'launch', ...(executablePath ? { executablePath } : {}) };
}

export class BrowserManager {
  #browser?: Browser;
  #starting?: Promise<Browser>;
  #started = false;
  #unhealthy = false;
  #closed = false;
  #restarts = 0;
  #exhaustedAt?: number;
  #version?: string;
  #activePages = 0;
  /** Contexts whose cleanup failed. In remote mode the shared browser is never closed, so these must be closed explicitly. */
  readonly #orphans = new Set<BrowserContext>();

  constructor(readonly options: BrowserManagerOptions) {
    if (options.mode === 'connect' && !options.wsEndpoint) throw new TypeError('wsEndpoint required for connect mode');
  }

  get owned(): boolean { return this.options.mode === 'launch'; }
  get version(): string | undefined { return this.#version; }
  get activePages(): number { return this.#activePages; }
  get restarts(): number { return this.#restarts; }
  /** Contexts that could not be cleaned up yet (closed when the browser is released). */
  get orphanedContexts(): number { return this.#orphans.size; }

  async browser(): Promise<Browser> {
    if (this.#closed) throw new RenderError('BROWSER_LAUNCH_FAILED', 'browser', 'Browser manager is closed', { retryable: false });
    if (this.#unhealthy) await this.#discard('recycling unhealthy browser');
    if (this.#browser?.connected) return this.#browser;
    if (!this.#starting) {
      if (this.#started) {
        if (this.#restarts >= (this.options.maxConsecutiveRestarts ?? 2)) {
          // Bounded restarts, but not a permanent dead state: fail fast during the cooldown, then renew the budget.
          // Marked retryable because the task is not at fault; the worker retries with backoff (at least the cooldown).
          this.#exhaustedAt ??= Date.now();
          if (Date.now() - this.#exhaustedAt < (this.options.restartCooldownMs ?? 30_000)) {
            throw new RenderError('BROWSER_LAUNCH_FAILED', 'browser', 'Browser restart budget exhausted; retry after the cooldown', { retryable: true });
          }
          this.#restarts = 0;
          this.#exhaustedAt = undefined;
        }
        this.#restarts += 1;
      }
      this.#starting = this.#start().finally(() => { this.#starting = undefined; });
    }
    return this.#starting;
  }

  async #start(): Promise<Browser> {
    const protocolTimeout = this.options.protocolTimeoutMs ?? 30_000;
    let browser: Browser;
    try {
      browser = this.options.mode === 'connect'
        ? await puppeteer.connect({ browserWSEndpoint: this.options.wsEndpoint!, protocolTimeout })
        : await puppeteer.launch({
          headless: true,
          timeout: this.options.launchTimeoutMs ?? 30_000,
          protocolTimeout,
          ...(this.options.executablePath ? { executablePath: this.options.executablePath } : {}),
        });
      this.#version = await browser.version();
    } catch (cause) {
      throw this.options.mode === 'connect'
        ? new RenderError('BROWSER_DISCONNECTED', 'browser', 'Could not connect to configured browser endpoint', { cause })
        : new RenderError('BROWSER_LAUNCH_FAILED', 'browser', 'Could not launch Chromium; check CHROMIUM_EXECUTABLE_PATH and sandbox dependencies', { cause, retryable: false });
    }
    browser.on('disconnected', () => { if (this.#browser === browser) this.#browser = undefined; });
    this.#browser = browser;
    this.#started = true;
    this.#unhealthy = false;
    return browser;
  }

  /**
   * Runs `work` on a fresh page inside its own browser context. Page creation is inside the error boundary;
   * cleanup is best-effort with a timeout and never replaces the primary error. A cleanup failure marks the
   * browser unhealthy so it is recycled before the next task instead of leaking pages.
   */
  async withPage<T>(work: (page: Page) => Promise<T>, options: { deadlineMs?: number } = {}): Promise<T> {
    const browser = await this.browser();
    let context: BrowserContext | undefined;
    let page: Page | undefined;
    let onDisconnect: (() => void) | undefined;
    let deadline: NodeJS.Timeout | undefined;
    try {
      try {
        await this.options.hooks?.beforeNewPage?.();
        const pageTimeout = this.options.pageTimeoutMs ?? 15_000;
        context = await withTimeout(browser.createBrowserContext(), pageTimeout, 'PAGE_CREATE_FAILED', 'page');
        page = await withTimeout(context.newPage(), pageTimeout, 'PAGE_CREATE_FAILED', 'page');
      } catch (error) {
        const mapped = toRenderError(error, 'page');
        throw mapped.code === 'BROWSER_DISCONNECTED' ? mapped : new RenderError('PAGE_CREATE_FAILED', 'page', 'Could not create an isolated page', { cause: error });
      }
      this.#activePages += 1;
      const activePage = page;
      const failures: Array<Promise<never>> = [
        new Promise<never>((_, reject) => activePage.once('error', (cause) => reject(new RenderError('PAGE_CRASH', 'page', 'Page crashed during rendering', { cause })))),
        new Promise<never>((_, reject) => {
          onDisconnect = () => reject(new RenderError('BROWSER_DISCONNECTED', 'browser', 'Browser disconnected during rendering'));
          browser.on('disconnected', onDisconnect);
        }),
      ];
      if (options.deadlineMs) {
        failures.push(new Promise<never>((_, reject) => {
          deadline = setTimeout(() => reject(new RenderError('TASK_DEADLINE', 'page', `Task exceeded ${options.deadlineMs}ms deadline`)), options.deadlineMs);
        }));
      }
      failures.forEach((failure) => failure.catch(() => undefined));
      const result = await Promise.race([work(activePage), ...failures]);
      this.#restarts = 0;
      return result;
    } catch (error) {
      const mapped = toRenderError(error, 'page');
      if (['PAGE_CRASH', 'BROWSER_DISCONNECTED', 'TASK_DEADLINE'].includes(mapped.code)) this.#unhealthy = this.owned || !this.#browser?.connected;
      throw mapped;
    } finally {
      clearTimeout(deadline);
      if (onDisconnect) browser.off('disconnected', onDisconnect);
      if (page) this.#activePages -= 1;
      await this.#cleanup(page, context);
    }
  }

  async #cleanup(page?: Page, context?: BrowserContext): Promise<void> {
    if (!page && !context) return;
    try {
      await this.options.hooks?.beforeCleanup?.();
      await withTimeout((async () => {
        if (page && !page.isClosed()) await page.close();
        if (context && this.#browser?.connected) await context.close();
      })(), this.options.closeTimeoutMs ?? 5_000, 'TASK_DEADLINE', 'page');
    } catch (error) {
      this.#unhealthy = true;
      if (context) this.#orphans.add(context);
      this.options.onWarning?.(`Page cleanup failed; browser will be recycled: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Best-effort close of contexts left behind by failed cleanups. Never throws. */
  async #closeOrphans(): Promise<void> {
    const orphans = [...this.#orphans];
    this.#orphans.clear();
    await Promise.all(orphans.map((context) =>
      withTimeout(context.close(), this.options.closeTimeoutMs ?? 5_000, 'TASK_DEADLINE', 'browser').catch(() => undefined)));
  }

  async #discard(reason: string): Promise<void> {
    const browser = this.#browser;
    this.#browser = undefined;
    this.#unhealthy = false;
    if (!browser) return;
    this.options.onWarning?.(reason);
    await this.#release(browser);
  }

  /** Owned browsers are closed (killed if close hangs); remote browsers are only disconnected. */
  async #release(browser: Browser): Promise<void> {
    if (!this.owned) {
      await this.#closeOrphans(); // our own leftovers only; the shared browser and others' contexts stay untouched
      await browser.disconnect().catch(() => undefined);
      return;
    }
    this.#orphans.clear(); // closing an owned browser closes all of its contexts
    try { await withTimeout(browser.close(), this.options.closeTimeoutMs ?? 5_000, 'TASK_DEADLINE', 'browser'); }
    catch { browser.process()?.kill('SIGKILL'); }
  }

  async close(): Promise<void> {
    this.#closed = true;
    const browser = this.#browser ?? await this.#starting?.catch(() => undefined);
    this.#browser = undefined;
    if (browser) await this.#release(browser);
  }
}
