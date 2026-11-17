import { createFixtureTemplate } from './fixture-hero.js';

/** Deliberately non-conforming (external image). Used to prove the CLI exits non-zero on a contract failure. */
export const templateModule = createFixtureTemplate({ version: '0.1.0', hostileExternal: true });
