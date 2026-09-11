import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

test('approved product descriptor does not permit trading calls or hide another banned phrase', () => {
  const allowed = ['Ducky Bot | All-in-One Daily Stock Analysis Tool'];
  const blocked = [
    'Go ALL-IN on NVDA', 'all-in today', 'All-in-One trade',
    'All-in-One Daily Stock Analysis Toolkit',
    'All-in-One Daily Stock Analysis Tool — buy now',
    'All-in-One Daily Stock Analysis Tool — ALL-IN',
    '买这只', '目标价', '满仓', '现在买', '建议买入',
  ];
  const result = JSON.parse(execFileSync(process.env.DUCKY_TEST_PYTHON || 'python3', ['-c',
    'import json, sys; from scripts.lint_copy import BANNED; print(json.dumps([bool(BANNED.search(s)) for s in json.load(sys.stdin)]))',
  ], {input: JSON.stringify([...allowed, ...blocked]), encoding: 'utf8'}));
  assert.deepEqual(result, [...allowed.map(() => false), ...blocked.map(() => true)]);
});
