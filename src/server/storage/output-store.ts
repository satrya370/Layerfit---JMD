import { createHash } from 'node:crypto';
import { link, mkdir, open, readFile, readdir, realpath, rename, rm, stat, unlink } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { FORMATS, ENCODINGS, type Encoding, type Format } from '../../shared/render-contract.js';
import { RenderError } from '../render/errors.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const FINGERPRINT = /^[0-9a-f]{16}$/;
const KEY = new RegExp(`^campaigns/${UUID.source.slice(1, -1)}/creatives/${UUID.source.slice(1, -1)}/r[1-9][0-9]{0,8}/[0-9a-f]{16}/(${FORMATS.join('|')})\\.(${ENCODINGS.join('|')})$`);

export interface OutputKeyParts { campaignId: string; creativeId: string; revision: number; fingerprint: string; format: Format }
export interface PublishItem { key: string; bytes: Buffer; sha256: string }
/** What is actually on disk for a key after publish. `kept` means an existing referenced file was preserved. */
export interface PublishedRecord { key: string; sha256: string; bytes: number; kept: boolean }

/**
 * Server-generated, revisioned storage keys under one trusted root. Files are staged per attempt, fsynced, then
 * published with link() (fails if the target exists) so a published file is never overwritten in place.
 * A file that exists but is not referenced by the database (left by a crashed attempt) may be replaced.
 */
export class OutputStore {
  readonly root: string;
  constructor(root: string) {
    if (!isAbsolute(root)) throw new TypeError('Output root must be an absolute, operator-configured path');
    this.root = resolve(root);
  }

  key(parts: OutputKeyParts, encoding: Encoding): string {
    const { campaignId, creativeId, revision, fingerprint, format } = parts;
    if (!UUID.test(campaignId) || !UUID.test(creativeId) || !Number.isInteger(revision) || revision < 1 || !FINGERPRINT.test(fingerprint)
      || !FORMATS.includes(format) || !ENCODINGS.includes(encoding)) {
      throw new RenderError('STORAGE_FAILED', 'storage', 'Invalid output key parts', { retryable: false });
    }
    return `campaigns/${campaignId}/creatives/${creativeId}/r${revision}/${fingerprint}/${format}.${encoding}`;
  }

  pathFor(key: string): string {
    if (!KEY.test(key)) throw new RenderError('STORAGE_FAILED', 'storage', 'Invalid storage key', { retryable: false });
    const path = resolve(this.root, ...key.split('/'));
    if (!path.startsWith(this.root + sep)) throw new RenderError('STORAGE_FAILED', 'storage', 'Storage key escapes root', { retryable: false });
    return path;
  }

  async #assertContained(dir: string): Promise<void> {
    const [real, root] = await Promise.all([realpath(dir), realpath(this.root)]);
    if (real !== root && !real.startsWith(root + sep)) throw new RenderError('STORAGE_FAILED', 'storage', 'Storage directory escapes root (symlink?)', { retryable: false });
  }

  /**
   * Publishes staged files for one attempt. The key includes the render fingerprint, so an existing key means the same
   * inputs. Pixels can still differ by ±1 level between runs, so an existing *referenced* file is kept as the source of
   * truth (`kept: true`) and its real hash is reported. An existing *unreferenced* file (leftover of an interrupted
   * attempt) is replaced. Nothing referenced is ever overwritten.
   */
  async publish(attemptId: string, items: readonly PublishItem[], isReferenced: (key: string) => boolean | Promise<boolean>): Promise<PublishedRecord[]> {
    if (!UUID.test(attemptId)) throw new RenderError('STORAGE_FAILED', 'storage', 'Invalid attempt id', { retryable: false });
    const staging = join(this.root, '.staging', attemptId);
    const created: string[] = [];
    const records: PublishedRecord[] = [];
    try {
      await mkdir(staging, { recursive: true });
      const staged = await Promise.all(items.map(async (item, i) => {
        const finalPath = this.pathFor(item.key);
        if (createHash('sha256').update(item.bytes).digest('hex') !== item.sha256) throw new RenderError('OUTPUT_INVALID', 'storage', 'Hash mismatch before publish');
        const temp = join(staging, `${i}.part`);
        const handle = await open(temp, 'wx');
        try { await handle.writeFile(item.bytes); await handle.sync(); } finally { await handle.close(); }
        return { item, temp, finalPath };
      }));
      for (const { item, temp, finalPath } of staged) {
        await mkdir(dirname(finalPath), { recursive: true });
        await this.#assertContained(dirname(finalPath));
        try {
          await link(temp, finalPath);
          created.push(finalPath);
          records.push({ key: item.key, sha256: item.sha256, bytes: item.bytes.length, kept: false });
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
          const existingBytes = await readFile(finalPath);
          const existing = createHash('sha256').update(existingBytes).digest('hex');
          if (existing === item.sha256) { records.push({ key: item.key, sha256: existing, bytes: existingBytes.length, kept: false }); continue; }
          if (await isReferenced(item.key)) { records.push({ key: item.key, sha256: existing, bytes: existingBytes.length, kept: true }); continue; }
          await rename(temp, finalPath); // unreferenced leftover from an interrupted attempt
          records.push({ key: item.key, sha256: item.sha256, bytes: item.bytes.length, kept: false });
        }
      }
      return records;
    } catch (error) {
      await Promise.all(created.map((path) => unlink(path).catch(() => undefined)));
      if (error instanceof RenderError) throw error;
      throw new RenderError('STORAGE_FAILED', 'storage', 'Could not publish output to storage', { cause: error });
    } finally {
      await rm(staging, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  async read(key: string): Promise<Buffer> { return readFile(this.pathFor(key)); }

  async exists(key: string): Promise<boolean> {
    try { return (await stat(this.pathFor(key))).isFile(); } catch { return false; }
  }

  /** Removes staging folders of attempts that died before cleanup. Never touches published revisions. */
  async removeStaleStaging(olderThanMs: number, now = Date.now()): Promise<number> {
    const base = join(this.root, '.staging');
    let removed = 0;
    for (const name of await readdir(base).catch(() => [] as string[])) {
      if (!UUID.test(name)) continue;
      const dir = join(base, name);
      if (now - (await stat(dir)).mtimeMs >= olderThanMs) { await rm(dir, { recursive: true, force: true }); removed += 1; }
    }
    return removed;
  }
}
