/**
 * Context-escaping HTML builder shared by templates and the engine.
 * Interpolated strings/numbers are always escaped for text and quoted-attribute contexts.
 * Do not interpolate into <style>, style="", URL or event-handler attributes; use validated tokens instead.
 */
const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"'`]/g, (char) => ESCAPES[char]!);
}

export class SafeHtml {
  readonly #value: string;
  constructor(value: string, token: symbol) {
    if (token !== TRUSTED) throw new TypeError('SafeHtml can only be created by html``');
    this.#value = value;
  }
  toString(): string { return this.#value; }
}
const TRUSTED = Symbol('trusted-html');

type Interpolation = SafeHtml | string | number | boolean | null | undefined | readonly Interpolation[];

function renderValue(value: Interpolation): string {
  if (value instanceof SafeHtml) return value.toString();
  if (Array.isArray(value)) return value.map(renderValue).join('');
  if (value === null || value === undefined || value === false || value === true) return '';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Non-finite number in template');
    return String(value);
  }
  if (typeof value === 'string') return escapeHtml(value);
  throw new TypeError('Unsupported template interpolation');
}

export function html(strings: TemplateStringsArray, ...values: Interpolation[]): SafeHtml {
  let out = strings[0]!;
  values.forEach((value, i) => { out += renderValue(value) + strings[i + 1]!; });
  return new SafeHtml(out, TRUSTED);
}
