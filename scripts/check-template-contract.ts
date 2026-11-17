/**
 * Runs the contract conformance kit against a template module. Trusted, operator-run CLI: the paths are local files
 * chosen by whoever runs it. It never takes input from HTTP and never opens a browser.
 *
 *   npm.cmd run check:template -- --module <path/to/module.ts> --cases <path/to/cases.ts> [--commit <hash>] [--out report.json] [--strict]
 *
 * The module file must export `templateModule` (or a default export) of type TemplateModule.
 * The cases file must export `contractCases`: an array of ContractCase, or a (possibly async) function returning one.
 * Exit code: 0 pass, 1 contract failure, 2 usage or load error.
 */
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkTemplateContract, formatViolationReport, type ContractCase } from '../src/server/render/contract-kit.js';
import type { TemplateModule } from '../src/shared/render-contract.js';

function parseArgs(argv: string[]): { module?: string; cases?: string; commit?: string; out?: string; strict: boolean } {
  const result: { module?: string; cases?: string; commit?: string; out?: string; strict: boolean } = { strict: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--strict') result.strict = true;
    else if (arg === '--module' || arg === '--cases' || arg === '--commit' || arg === '--out') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(`${arg} needs a value`);
      result[arg.slice(2) as 'module' | 'cases' | 'commit' | 'out'] = value;
      i += 1;
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return result;
}

async function load(path: string): Promise<Record<string, unknown>> {
  try { return (await import(pathToFileURL(resolve(path)).href)) as Record<string, unknown>; }
  catch (error) { throw new Error(`Could not load ${path}: ${(error as Error).message}`); }
}

async function main(): Promise<number> {
  let args;
  try { args = parseArgs(process.argv.slice(2)); }
  catch (error) { console.error(`${(error as Error).message}\nUsage: --module <path> --cases <path> [--commit <hash>] [--out <file>] [--strict]`); return 2; }
  if (!args.module || !args.cases) { console.error('Usage: --module <path> --cases <path> [--commit <hash>] [--out <file>] [--strict]'); return 2; }

  let module: TemplateModule; let cases: ContractCase[];
  try {
    const moduleExports = await load(args.module);
    const candidate = moduleExports.templateModule ?? moduleExports.default;
    if (typeof candidate !== 'object' || candidate === null) throw new Error('module file must export `templateModule` (or a default export)');
    module = candidate as TemplateModule;
    const caseExports = await load(args.cases);
    const provided = caseExports.contractCases;
    const resolved = typeof provided === 'function' ? await (provided as () => unknown)() : provided;
    if (!Array.isArray(resolved)) throw new Error('cases file must export `contractCases` as an array or a function returning one');
    cases = resolved as ContractCase[];
  } catch (error) { console.error((error as Error).message); return 2; }

  const report = await checkTemplateContract(module, cases, { strict: args.strict });
  const reproduce = `npm.cmd run check:template -- --module ${args.module} --cases ${args.cases}${args.strict ? ' --strict' : ''}`;
  console.log(formatViolationReport(report, { ...(args.commit ? { commit: args.commit } : {}), reproduce }));
  if (args.out) await writeFile(resolve(args.out), JSON.stringify({ ...report, commit: args.commit ?? null, cases: cases.map((c) => c.name) }, null, 2));
  return report.passed ? 0 : 1;
}

process.exitCode = await main();
