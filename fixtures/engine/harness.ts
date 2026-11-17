import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TemplateModule } from '../../src/shared/render-contract.js';
import type { BrowserHooks } from '../../src/server/render/browser-manager.js';
import { browserOptionsFromEnv } from '../../src/server/render/browser-manager.js';
import { createRenderEngine } from '../../src/server/render/engine.js';
import type { RenderHooks, RenderTimeouts } from '../../src/server/render/render-output.js';
import { MemoryAssetSource, type AssetRecord } from '../../src/server/assets/resolve-render-assets.js';
import type { FontDefinition } from '../../src/shared/fonts.js';

export interface HarnessOptions {
  templates: TemplateModule[];
  assets: AssetRecord[];
  outputRoot?: string;
  fontRegistry?: Record<string, FontDefinition>;
  fontResolve?: (specifier: string) => string;
  renderHooks?: RenderHooks;
  browserHooks?: BrowserHooks;
  /** Connect to an already running browser instead of launching one (remote-mode tests). */
  wsEndpoint?: string;
  /** Override the launch executable, e.g. to prove a launch failure is reported without a browser. */
  executablePath?: string;
  maxConsecutiveRestarts?: number;
  restartCooldownMs?: number;
  timeouts?: Partial<RenderTimeouts>;
}

/**
 * Test/smoke wiring only: real BrowserManager (env-configured executable, sandbox on), real font files,
 * real Sharp. Each harness gets its own output directory unless one is given.
 */
export async function createHarness(options: HarnessOptions) {
  const outputRoot = options.outputRoot ?? await mkdtemp(join(tmpdir(), 'lf-engine-'));
  const assetSource = new MemoryAssetSource();
  for (const record of options.assets) assetSource.put(record);
  const warnings: string[] = [];
  const base = options.wsEndpoint
    ? { mode: 'connect' as const, wsEndpoint: options.wsEndpoint }
    : { ...browserOptionsFromEnv(), ...(options.executablePath ? { executablePath: options.executablePath } : {}) };
  const { engine, browsers, close } = createRenderEngine({
    templates: options.templates,
    assets: assetSource,
    outputRoot,
    browser: {
      ...base,
      ...(options.browserHooks ? { hooks: options.browserHooks } : {}),
      ...(options.maxConsecutiveRestarts !== undefined ? { maxConsecutiveRestarts: options.maxConsecutiveRestarts } : {}),
      ...(options.restartCooldownMs !== undefined ? { restartCooldownMs: options.restartCooldownMs } : {}),
      onWarning: (message) => { warnings.push(message); if (process.env.LF_ENGINE_VERBOSE) console.warn(`[browser] ${message}`); },
    },
    ...(options.fontRegistry ? { fontRegistry: options.fontRegistry } : {}),
    ...(options.fontResolve ? { fontResolve: options.fontResolve } : {}),
    ...(options.renderHooks ? { hooks: options.renderHooks } : {}),
    timeouts: { contentMs: 10_000, readinessMs: 10_000, layoutMs: 10_000, screenshotMs: 15_000, taskDeadlineMs: 60_000, ...options.timeouts },
  });
  return { engine, outputRoot, warnings, browsers, close };
}
