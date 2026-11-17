import { isAbsolute } from 'node:path';
import type { TemplateModule } from '../../shared/render-contract.js';
import { FONT_REGISTRY, type FontDefinition } from '../../shared/fonts.js';
import { RenderAssetResolver, type AssetSource } from '../assets/resolve-render-assets.js';
import { OutputStore } from '../storage/output-store.js';
import { BrowserManager, browserOptionsFromEnv, type BrowserManagerOptions } from './browser-manager.js';
import { FontLoader } from './fonts.js';
import type { RenderEngine, RenderHooks, RenderTimeouts } from './render-output.js';
import { TemplateRegistry } from './registry.js';

export interface CreateEngineOptions {
  templates: readonly TemplateModule[];
  assets: AssetSource;
  /** Absolute, operator-configured storage root. Never taken from request data. */
  outputRoot: string;
  /** Defaults to browserOptionsFromEnv(): CHROMIUM_WS_ENDPOINT if set, otherwise a local launch with CHROMIUM_EXECUTABLE_PATH. */
  browser?: BrowserManagerOptions;
  fontRegistry?: Readonly<Record<string, FontDefinition>>;
  fontResolve?: (specifier: string) => string;
  timeouts?: Partial<RenderTimeouts>;
  maxFitSteps?: number;
  hooks?: RenderHooks;
  isReferenced?: RenderEngine['isReferenced'];
  onFailure?: RenderEngine['onFailure'];
}

/**
 * Single place that wires the engine: registry, asset resolver, fonts, storage and one browser manager.
 * Used by the render CLI and by test harnesses so they cannot drift apart.
 */
export function createRenderEngine(options: CreateEngineOptions): { engine: RenderEngine; browsers: BrowserManager; close: () => Promise<void> } {
  if (!isAbsolute(options.outputRoot)) throw new TypeError('outputRoot must be an absolute path');
  const registry = new TemplateRegistry();
  for (const template of options.templates) registry.register(template);
  const browsers = new BrowserManager(options.browser ?? browserOptionsFromEnv());
  const engine: RenderEngine = {
    browsers,
    templates: registry,
    assets: new RenderAssetResolver(options.assets),
    fonts: new FontLoader(options.fontRegistry ?? FONT_REGISTRY, options.fontResolve),
    store: new OutputStore(options.outputRoot),
    ...(options.timeouts ? { timeouts: options.timeouts } : {}),
    ...(options.maxFitSteps !== undefined ? { maxFitSteps: options.maxFitSteps } : {}),
    ...(options.hooks ? { hooks: options.hooks } : {}),
    ...(options.isReferenced ? { isReferenced: options.isReferenced } : {}),
    ...(options.onFailure ? { onFailure: options.onFailure } : {}),
  };
  return { engine, browsers, close: () => browsers.close() };
}
