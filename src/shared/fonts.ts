/**
 * Bundled font registry (proposal v0). Files come from local npm packages (OFL-1.1, @fontsource); never a CDN.
 * Brand fonts replace these once LayerFit guidelines and licences are confirmed.
 */
import type { FontId } from './render-contract.js';

export type FontWeight = 400 | 500 | 600 | 700 | 800 | 900;
export interface FontFaceFile { weight: FontWeight; style: 'normal'; module: string }
export interface FontDefinition { family: string; fallback: 'sans-serif' | 'serif'; licence: string; faces: readonly FontFaceFile[] }

const faces = (pkg: string, name: string, weights: readonly FontWeight[]): FontFaceFile[] =>
  weights.map((weight) => ({ weight, style: 'normal', module: `@fontsource/${pkg}/files/${name}-latin-${weight}-normal.woff2` }));

export const FONT_REGISTRY: Readonly<Record<FontId, FontDefinition>> = {
  inter: { family: 'LF Inter', fallback: 'sans-serif', licence: 'OFL-1.1', faces: faces('inter', 'inter', [400, 700, 800, 900]) },
  fraunces: { family: 'LF Fraunces', fallback: 'serif', licence: 'OFL-1.1', faces: faces('fraunces', 'fraunces', [400, 700]) },
  // Added for the T03 dark-offer-stack design (headline Montserrat 900/800, text Poppins 400–700).
  montserrat: { family: 'LF Montserrat', fallback: 'sans-serif', licence: 'OFL-1.1', faces: faces('montserrat', 'montserrat', [700, 800, 900]) },
  poppins: { family: 'LF Poppins', fallback: 'sans-serif', licence: 'OFL-1.1', faces: faces('poppins', 'poppins', [400, 500, 600, 700]) },
};
