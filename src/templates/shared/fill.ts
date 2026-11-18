/**
 * Helpers every template uses to fill its slots, so the same config gives the same markup rule in every template
 * (slot_normalization_plan.md §3). Templates migrate to these in Phase 3; until then they keep their private copies.
 */
import { html, type SafeHtml } from '../../shared/html.js';
import type { ResolvedAsset, TemplateConfig, TemplateRenderInput } from '../../shared/render-contract.js';

/** Verified fact text by id. Fails closed: a fact that is not in the verified snapshot is never replaced by invented text. */
export function factText(facts: TemplateRenderInput['facts'], id: string, what: string): string {
  const fact = facts.get(id);
  if (!fact) throw new Error(`${what} fact ${id} is not in the verified snapshot`);
  return fact.text;
}

/** Text for the offer position: the verified offer, else the hero fact, else nothing. The offer always wins. */
export function offerOrHeroText(config: TemplateConfig, facts: TemplateRenderInput['facts']): { text: string; source: 'offer' | 'hero' } | undefined {
  if (config.offerFactId) return { text: factText(facts, config.offerFactId, 'offer'), source: 'offer' };
  if (config.heroFactId) return { text: factText(facts, config.heroFactId, 'hero'), source: 'hero' };
  return undefined;
}

/** Content of the `brand` slot: the logo when there is one, otherwise the brand name as text. */
export function brandMark(config: TemplateConfig, logo: ResolvedAsset | undefined, imgClass: string): SafeHtml {
  return logo
    ? html`<img class="${imgClass}" data-image-fit="contain" alt="" src="${logo.src}">`
    : html`${config.brand.name}`;
}

/** Headline with the accent phrase wrapped in a span. The shared schema guarantees the phrase is a substring of the headline. */
export function headlineWithAccent(text: string, accentPhrase: string | undefined, wrapClass: string): SafeHtml {
  if (!accentPhrase) return html`${text}`;
  const at = text.indexOf(accentPhrase);
  return html`${text.slice(0, at)}<span class="${wrapClass}">${accentPhrase}</span>${text.slice(at + accentPhrase.length)}`;
}
