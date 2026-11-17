import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CLI = 'scripts/check-template-contract.ts';
const CASES = 'fixtures/engine/contract-cases.ts';

function cli(args: string[]) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', CLI, ...args], { encoding: 'utf8', timeout: 60_000 });
  return { code: result.status, out: `${result.stdout}${result.stderr}` };
}

test('CLI: a conforming module exits 0 and writes a JSON report with the commit', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lf-kit-'));
  const out = join(dir, 'report.json');
  const run = cli(['--module', 'fixtures/engine/templates/fixture-module.ts', '--cases', CASES, '--commit', 'abc1234', '--out', out]);
  assert.equal(run.code, 0, run.out);
  assert.match(run.out, /Result: PASS/);
  assert.match(run.out, /commit abc1234/);
  const report = JSON.parse(await readFile(out, 'utf8')) as { passed: boolean; commit: string; cases: string[]; template: { id: string } };
  assert.equal(report.passed, true);
  assert.equal(report.commit, 'abc1234');
  assert.deepEqual(report.cases, ['shirt', 'bottle']);
  assert.equal(report.template.id, 'fixture-hero');
});

test('CLI: a non-conforming module exits 1 and prints a reproducible violation report', () => {
  const run = cli(['--module', 'fixtures/engine/templates/fixture-module-hostile.ts', '--cases', CASES, '--commit', 'deadbee']);
  assert.equal(run.code, 1, run.out);
  assert.match(run.out, /Result: FAIL/);
  assert.match(run.out, /FAIL markup\.assets \| case=shirt \| format=square/);
  assert.match(run.out, /Reproduce: npm\.cmd run check:template -- --module fixtures\/engine\/templates\/fixture-module-hostile\.ts/);
});

test('CLI: usage and load errors exit 2 with a message, not a stack trace', () => {
  const missing = cli([]);
  assert.equal(missing.code, 2);
  assert.match(missing.out, /Usage/);
  const unknown = cli(['--nope']);
  assert.equal(unknown.code, 2);
  const noFile = cli(['--module', 'does/not/exist.ts', '--cases', CASES]);
  assert.equal(noFile.code, 2);
  assert.match(noFile.out, /Could not load/);
  const noExport = cli(['--module', CASES, '--cases', CASES]);
  assert.equal(noExport.code, 2);
  assert.match(noExport.out, /templateModule/);
});

test('CLI: --strict is accepted and a warning-free module still passes', () => {
  // Strict-mode failure on warnings is covered at kit level (contract-kit.test.ts). This only guards flag parsing.
  const run = cli(['--module', 'fixtures/engine/templates/fixture-module.ts', '--cases', CASES, '--strict']);
  assert.equal(run.code, 0, run.out);
});
