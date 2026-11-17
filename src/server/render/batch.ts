import { z } from 'zod';
import type { RenderResult } from '../../shared/render-contract.js';
import { RenderError } from './errors.js';
import { renderOutput, type RenderEngine } from './render-output.js';

const MAX_TASKS = 90; // admission ceiling: up to 30 concepts × 3 formats per batch (rendering_engine_plan.md CP07); encodings are not tasks
const envelopeSchema = z.object({ tasks: z.array(z.unknown()).min(1).max(MAX_TASKS) }).strict();

/**
 * Validates the envelope first (rejects the whole batch before any browser work), then renders each task in order.
 * A failed task yields a failed RenderResult; it never stops the remaining tasks.
 */
export async function renderBatch(input: unknown, engine: RenderEngine): Promise<RenderResult[]> {
  const envelope = envelopeSchema.safeParse(input);
  if (!envelope.success) throw new RenderError('REQUEST_INVALID', 'validate', `Batch envelope invalid (1–${MAX_TASKS} tasks)`, { retryable: false });
  // A repeated task id makes the batch ambiguous (double publish), so it rejects the envelope.
  // Tasks without a usable id are not duplicates of each other: they fail individually in renderOutput.
  const seen = new Set<string>();
  for (const task of envelope.data.tasks) {
    const taskId = (task as { taskId?: unknown } | null)?.taskId;
    if (typeof taskId !== 'string' || taskId === '') continue;
    if (seen.has(taskId)) throw new RenderError('REQUEST_INVALID', 'validate', 'Duplicate taskId in batch', { retryable: false });
    seen.add(taskId);
  }
  const results: RenderResult[] = [];
  for (const task of envelope.data.tasks) results.push(await renderOutput(task, engine));
  return results;
}
