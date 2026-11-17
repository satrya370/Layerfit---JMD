import { FORMATS, idSchema, type TemplateConfig, type TemplateModule } from '../../shared/render-contract.js';
import { RenderError } from './errors.js';

/**
 * Allowlist of template modules keyed by id@version. Replaces the reference renderer's
 * `templates/${name}-${type}.html` path construction: no file path is ever derived from request data.
 */
export class TemplateRegistry {
  readonly #modules = new Map<string, TemplateModule<TemplateConfig>>();

  register<C extends TemplateConfig>(module: TemplateModule<C>): this {
    if (!idSchema.safeParse(module.id).success) throw new TypeError(`Invalid template id: ${module.id}`);
    if (!/^\d+\.\d+\.\d+$/.test(module.version)) throw new TypeError(`Invalid template version: ${module.version}`);
    if (!module.formats.length || module.formats.some((f) => !FORMATS.includes(f))) throw new TypeError(`Invalid formats for ${module.id}`);
    if (!/^[a-z][a-z0-9-]{0,63}$/.test(module.rootClass)) throw new TypeError(`Invalid rootClass for ${module.id}`);
    if (!module.slots.some((slot) => slot.required)) throw new TypeError(`Template ${module.id} must declare at least one required slot`);
    const names = module.slots.map((slot) => slot.name);
    if (names.some((name) => !/^[a-z][a-z0-9-]{0,63}$/.test(name))) throw new TypeError(`Template ${module.id} has an invalid slot name`);
    if (new Set(names).size !== names.length) throw new TypeError(`Template ${module.id} declares a slot name twice`);
    const key = `${module.id}@${module.version}`;
    if (this.#modules.has(key)) throw new TypeError(`Template already registered: ${key}`);
    this.#modules.set(key, module as unknown as TemplateModule<TemplateConfig>);
    return this;
  }

  get(id: string, version: string): TemplateModule<TemplateConfig> {
    const module = this.#modules.get(`${id}@${version}`);
    if (!module) throw new RenderError('TEMPLATE_UNKNOWN', 'validate', 'Unknown template id/version');
    return module;
  }

  list(): Array<{ id: string; version: string; formats: readonly string[] }> {
    return [...this.#modules.values()].map(({ id, version, formats }) => ({ id, version, formats }));
  }
}
