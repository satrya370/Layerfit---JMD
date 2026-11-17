import type { Page } from 'puppeteer';
import type { FormatProfile, LayoutViolation, RenderErrorCode } from '../../shared/render-contract.js';

export interface InspectArgs { width: number; height: number; safe: FormatProfile['safe']; fontFamilies: string[] }
export interface InspectResult { violations: LayoutViolation[]; warnings: string[]; groupMins: Record<string, number>; slotCount: number; visibleSlots: string[] }

/**
 * Runs inside the page (trusted Puppeteer evaluation; page scripts stay disabled). Checks canvas geometry,
 * required slots, self overflow, text spill, ancestor clipping, canvas/safe bounds, unapproved collisions,
 * applied font family and image fit/crop. Replaces the prototype's three-element bounds check.
 */
export function inspectLayout(args: InspectArgs): InspectResult {
  const violations: LayoutViolation[] = [];
  const warnings: string[] = [];
  const groupMins: Record<string, number> = {};
  const tol = 0.5;
  type Box = { left: number; top: number; right: number; bottom: number };
  const inside = (r: Box, b: Box) => r.left >= b.left - tol && r.top >= b.top - tol && r.right <= b.right + tol && r.bottom <= b.bottom + tol;
  const add = (code: RenderErrorCode, slot: string, detail: string, fitGroups: string[] = []) => violations.push({ code, slot, detail, fitGroups });
  const canvas = document.querySelector<HTMLElement>('[data-canvas]');
  if (!canvas) { add('CANVAS_INVALID', '-', 'canvas root missing'); return { violations, warnings, groupMins, slotCount: 0, visibleSlots: [] }; }
  const c = canvas.getBoundingClientRect();
  if (Math.abs(c.left) > tol || Math.abs(c.top) > tol || Math.abs(c.width - args.width) > tol || Math.abs(c.height - args.height) > tol) {
    add('CANVAS_INVALID', '-', `canvas ${c.width}x${c.height}@${c.left},${c.top}, expected ${args.width}x${args.height}@0,0`);
  }
  const safe: Box = { left: args.safe.left, top: args.safe.top, right: args.width - args.safe.right, bottom: args.height - args.safe.bottom };

  for (const el of Array.from(canvas.querySelectorAll<HTMLElement>('[data-fit-group]'))) {
    const group = el.getAttribute('data-fit-group')!;
    const min = Number(el.getAttribute('data-fit-min') ?? '0.8');
    groupMins[group] = Math.max(groupMins[group] ?? 0, Number.isFinite(min) ? Math.min(Math.max(min, 0.5), 1) : 0.8);
  }
  const groupsOf = (el: Element): string[] => {
    const set = new Set<string>();
    for (let a: Element | null = el; a && a !== canvas.parentElement; a = a.parentElement) { const g = a.getAttribute('data-fit-group'); if (g) set.add(g); }
    el.querySelectorAll('[data-fit-group]').forEach((d) => set.add(d.getAttribute('data-fit-group')!));
    return [...set];
  };
  const clipAncestors = (el: Element): Array<{ el: Element; rect: DOMRect }> => {
    const list: Array<{ el: Element; rect: DOMRect }> = [];
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.overflowX !== 'visible' || s.overflowY !== 'visible' || s.clipPath !== 'none') list.push({ el: a, rect: a.getBoundingClientRect() });
    }
    return list;
  };
  const label = (el: Element) => el.getAttribute('data-slot') ?? (el.hasAttribute('data-canvas') ? 'canvas' : el.tagName.toLowerCase());

  const slots = Array.from(canvas.querySelectorAll<HTMLElement>('[data-slot]'));
  const seen = new Set<string>();
  const visible: Array<{ el: HTMLElement; name: string; rect: DOMRect }> = [];
  for (const el of slots) {
    const name = el.getAttribute('data-slot')!;
    if (seen.has(name)) add('CANVAS_INVALID', name, 'duplicate slot name');
    seen.add(name);
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const shown = r.width >= 1 && r.height >= 1 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0;
    const required = el.getAttribute('data-required') === 'true';
    if (!shown) { if (required) add('SLOT_MISSING', name, 'required slot not visible'); continue; }
    visible.push({ el, name, rect: r });
    const groups = groupsOf(el);
    // A font's content area (ascent + descent) can be taller than a tight line box (display type with line-height ~1.0),
    // so the last line's box hangs a few pixels below the element without any glyph being outside it. That hang is
    // proportional to the font size, so the vertical check allows 0.2em. A real spill is at least a whole line (~1em).
    const verticalSlack = Math.max(1, (Number.parseFloat(s.fontSize) || 0) * 0.2);
    if (s.display !== 'inline' && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + verticalSlack)) {
      add('LAYOUT_OVERFLOW', name, `content ${el.scrollWidth}x${el.scrollHeight} exceeds box ${el.clientWidth}x${el.clientHeight}`, groups);
    }
    if (el.textContent?.trim()) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const t = range.getBoundingClientRect();
      // Glyph content areas (ascent + descent) can exceed a tight line box by a fraction of the font size without any clipping.
      // The tolerance is proportional to font size; real overflow is caught by scrollWidth/scrollHeight and LAYOUT_CLIPPED.
      const slack = Math.max(2, Number.parseFloat(s.fontSize) * 0.25);
      const loose: Box = { left: r.left - slack, top: r.top - slack, right: r.right + slack, bottom: r.bottom + slack };
      if (t.width > 0 && !inside(t, loose)) add('LAYOUT_OVERFLOW', name, 'text extends outside slot box', groups);
    }
    for (const clip of clipAncestors(el)) {
      if (clip.el === canvas) break;
      if (!inside(r, clip.rect)) { add('LAYOUT_CLIPPED', name, `clipped by ${label(clip.el)}`, groups); break; }
    }
    if (!inside(r, c)) add('OUT_OF_CANVAS', name, 'slot extends outside canvas', groups);
    if (el.getAttribute('data-safe') === 'true' && !inside(r, safe)) {
      add('SAFE_AREA_VIOLATION', name, `slot ${Math.round(r.left)},${Math.round(r.top)}–${Math.round(r.right)},${Math.round(r.bottom)} outside safe box`, groups);
    }
  }

  // Font check runs on the element that owns the text, not on slot wrappers (a wrapper div may legitimately inherit a default font).
  for (const node of Array.from(canvas.querySelectorAll<HTMLElement>('*'))) {
    const ownsText = Array.from(node.childNodes).some((child) => child.nodeType === Node.TEXT_NODE && (child.textContent ?? '').trim() !== '');
    if (!ownsText) continue;
    const family = getComputedStyle(node).fontFamily.split(',')[0]!.trim().replace(/^["']|["']$/g, '');
    if (!args.fontFamilies.includes(family)) {
      add('FONT_MISSING', node.closest('[data-slot]')?.getAttribute('data-slot') ?? node.tagName.toLowerCase(), `computed font "${family}" is not a bundled font`);
    }
  }

  for (let i = 0; i < visible.length; i += 1) {
    for (let j = i + 1; j < visible.length; j += 1) {
      const a = visible[i]!; const b = visible[j]!;
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const w = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
      const h = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
      if (w <= 1 || h <= 1) continue;
      const allowA = (a.el.getAttribute('data-allow-overlap') ?? '').split(/\s+/);
      const allowB = (b.el.getAttribute('data-allow-overlap') ?? '').split(/\s+/);
      if (allowA.includes('*') || allowA.includes(b.name) || allowB.includes('*') || allowB.includes(a.name)) continue;
      add('SLOT_COLLISION', a.name, `overlaps ${b.name} by ${Math.round(w)}x${Math.round(h)}px`, [...new Set([...groupsOf(a.el), ...groupsOf(b.el)])]);
    }
  }

  const position = (value: string, free: number) => {
    if (value === 'left' || value === 'top') return 0;
    if (value === 'right' || value === 'bottom') return free;
    if (value === 'center') return free / 2;
    if (value.endsWith('%')) return (free * Number.parseFloat(value)) / 100;
    return Number.parseFloat(value) || 0;
  };
  for (const img of Array.from(canvas.querySelectorAll('img'))) {
    const slot = img.closest('[data-slot]')?.getAttribute('data-slot') ?? 'image';
    const fit = img.getAttribute('data-image-fit');
    const s = getComputedStyle(img);
    if (fit !== 'contain' && fit !== 'cover') { add('IMAGE_CROP_INVALID', slot, 'img missing data-image-fit="contain|cover"'); continue; }
    if (s.objectFit !== fit) add('IMAGE_CROP_INVALID', slot, `declared ${fit} but computed object-fit is ${s.objectFit}`);
    if (fit === 'cover' && !img.hasAttribute('data-allow-crop')) add('IMAGE_CROP_INVALID', slot, 'cover crop used without allowCrop');
    const r = img.getBoundingClientRect();
    const padX = [s.paddingLeft, s.paddingRight, s.borderLeftWidth, s.borderRightWidth].reduce((n, v) => n + Number.parseFloat(v), 0);
    const padY = [s.paddingTop, s.paddingBottom, s.borderTopWidth, s.borderBottomWidth].reduce((n, v) => n + Number.parseFloat(v), 0);
    const bw = r.width - padX; const bh = r.height - padY;
    if (!img.naturalWidth || !img.naturalHeight || bw < 1 || bh < 1) continue;
    const scale = fit === 'contain' ? Math.min(bw / img.naturalWidth, bh / img.naturalHeight) : Math.max(bw / img.naturalWidth, bh / img.naturalHeight);
    if (scale > 1.05) warnings.push(`${slot}: image upscaled ${scale.toFixed(2)}x (source ${img.naturalWidth}x${img.naturalHeight})`);
    if (fit === 'contain') {
      const cw = img.naturalWidth * scale; const ch = img.naturalHeight * scale;
      const [px = '50%', py = '50%'] = s.objectPosition.split(/\s+/);
      const left = r.left + Number.parseFloat(s.paddingLeft) + Number.parseFloat(s.borderLeftWidth) + position(px, bw - cw);
      const top = r.top + Number.parseFloat(s.paddingTop) + Number.parseFloat(s.borderTopWidth) + position(py, bh - ch);
      const content = { left, top, right: left + cw, bottom: top + ch };
      for (const clip of [...clipAncestors(img), { el: canvas, rect: c }]) {
        if (!inside(content, clip.rect)) { add('IMAGE_CROP_INVALID', slot, `contained image cropped by ${label(clip.el)}`); break; }
      }
    }
  }
  return { violations, warnings, groupMins, slotCount: slots.length, visibleSlots: visible.map((v) => v.name) };
}

const FITTABLE: ReadonlySet<RenderErrorCode> = new Set(['LAYOUT_OVERFLOW', 'LAYOUT_CLIPPED', 'SLOT_COLLISION', 'SAFE_AREA_VIOLATION', 'OUT_OF_CANVAS']);
const GROUP_NAME = /^[a-z][a-z0-9-]{0,31}$/;

export interface FitOutcome { violations: LayoutViolation[]; warnings: string[]; steps: number; scales: Record<string, number>; slotCount: number; visibleSlots: string[] }

/**
 * Bounded typography fitting: when every violation is fittable and belongs to a fit group, reduce that group's
 * `--lf-fit-<group>` scale by 0.05 (never below its data-fit-min) and re-measure. Never truncates or hides text;
 * remaining violations are returned for a LAYOUT_* failure.
 */
export async function fitAndValidate(page: Page, args: InspectArgs, maxSteps = 8): Promise<FitOutcome> {
  const scales: Record<string, number> = {};
  for (let steps = 0; ; steps += 1) {
    const result = await page.evaluate(inspectLayout, args);
    const done = { violations: result.violations, warnings: result.warnings, steps, scales, slotCount: result.slotCount, visibleSlots: result.visibleSlots };
    if (!result.violations.length || steps >= maxSteps) return done;
    // Only violations that name a fit group can be helped by scaling; any other violation stays and fails the render.
    const fittable = result.violations.filter((v) => FITTABLE.has(v.code) && v.fitGroups.length > 0);
    if (!fittable.length) return done;
    const targets = [...new Set(fittable.flatMap((v) => v.fitGroups))].filter((g) => GROUP_NAME.test(g));
    const next: Record<string, number> = {};
    for (const group of targets) {
      const current = scales[group] ?? 1;
      const reduced = Math.round((current - 0.05) * 100) / 100;
      if (reduced >= (result.groupMins[group] ?? 0.8) - 1e-9) next[group] = reduced;
    }
    if (!Object.keys(next).length) return done;
    Object.assign(scales, next);
    await page.evaluate((values: Record<string, number>) => {
      const canvas = document.querySelector<HTMLElement>('[data-canvas]')!;
      for (const [group, value] of Object.entries(values)) canvas.style.setProperty(`--lf-fit-${group}`, String(value));
    }, next);
  }
}
