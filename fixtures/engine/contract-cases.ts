import type { ContractCase } from '../../src/server/render/contract-kit.js';
import { simulatedBriefs } from './briefs.js';

/**
 * Example contract cases for the engine fixture template. A template owner supplies the same shape for their own module:
 * a valid stored config, the verified facts it references, the owned asset bytes, and optionally extra configs to reject.
 */
export async function contractCases(): Promise<ContractCase[]> {
  const { shirt, bottle } = await simulatedBriefs();
  return [
    { name: 'shirt', brief: shirt },
    { name: 'bottle', brief: bottle },
  ].map(({ name, brief }) => ({
    name,
    campaignId: brief.snapshot.campaignId,
    config: brief.snapshot.config,
    facts: brief.snapshot.facts,
    assets: brief.assets,
  }));
}
