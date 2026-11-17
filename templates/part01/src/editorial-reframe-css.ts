/** T04 CSS ported VERBATIM from the user-supplied Template-example/styles.css (17 Nov 2026).
 * Changes from the source, kept minimal and recorded in template_part01_log.md:
 * - `.creative` renamed to the engine root class `.lf-editorial-reframe` (engine owns the canvas shell).
 * - `--accent`/`--bg` come from engine brand tokens; review-green and banner colors are the source values.
 * - Body font is the engine's bundled body-font token. For this fidelity study the fixture harness maps the
 *   'inter' token to Arimo (OFL), which is metrically compatible with the source's Arial; brand fonts TBD.
 * - `padding-bottom: 0.25em` on .headline is an invisible box change: with the source's line-height 0.96 the
 *   engine's scroll overflow check counts glyph ink (j/g descenders); the padding absorbs it without moving anything visible.
 * - Font sizes multiply engine fit vars (identity 1 by default) so the engine can shrink long copy.
 * - Source geometry (top 47 / left-right 45 / bottom 28) is intentionally NOT snapped to the engine
 *   prototype safe box; those slots therefore carry no data-safe attribute. Open contract item.
 */
export const editorialCss = `
.lf-editorial-reframe { --accent: var(--lf-brand-accent); --review-green: #58b38d; background: var(--lf-brand-secondary); color: #333132; font-family: var(--lf-font-body); }
.lf-editorial-reframe .reviews { position: absolute; top: 47px; left: 0; width: 100%; text-align: center; }
.lf-editorial-reframe .stars { display: flex; justify-content: center; gap: 2px; margin-bottom: 9px; }
.lf-editorial-reframe .star { color: white; background: var(--review-green); font-size: 31px; line-height: 32px; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; }
.lf-editorial-reframe .reviews-copy { font-size: 23px; letter-spacing: -.45px; }
.lf-editorial-reframe .reviews-copy strong { font-weight: 800; }
.lf-editorial-reframe .headline { position: absolute; top: 138px; left: 45px; right: 45px; font-size: calc(86px * var(--lf-fit-editorial-headline, 1)); line-height: 0.96; letter-spacing: -3.6px; font-weight: 850; text-align: center; margin: 0; padding-bottom: 0.25em; text-wrap: balance; -webkit-text-stroke: 3px currentColor; }
.lf-editorial-reframe .headline .accent { color: var(--accent); white-space: nowrap; }
.lf-editorial-reframe .subheadline { position: absolute; top: 349px; left: 50px; right: 50px; text-align: center; font-style: italic; font-size: calc(35px * var(--lf-fit-editorial-subheadline, 1)); letter-spacing: -.8px; margin: 0; white-space: nowrap; }
.lf-editorial-reframe .photo-frame { position: absolute; left: 158px; top: 442px; width: 766px; height: 494px; overflow: hidden; }
.lf-editorial-reframe .photo-frame img { display: block; width: 100%; height: 100%; }
.lf-editorial-reframe .photo-frame img[data-image-fit="cover"] { object-fit: cover; }
.lf-editorial-reframe .photo-frame img[data-image-fit="contain"] { object-fit: contain; }
.lf-editorial-reframe .bottom-strip { position: absolute; bottom: 28px; left: 45px; right: 45px; display: flex; align-items: end; justify-content: space-between; }
.lf-editorial-reframe .price-banner { display: flex; align-items: baseline; gap: 12px; background: #252525; color: #fff; padding: 4px 18px 6px; font-size: 40px; line-height: 1.1; letter-spacing: -.85px; }
.lf-editorial-reframe .price-banner .price { color: var(--accent); font-size: 36px; }
.lf-editorial-reframe .brand-logo { width: 78px; height: 78px; object-fit: contain; }
`;
