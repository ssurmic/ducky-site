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

test('SVG PNG bytes are excluded while visible text, metadata and other attributes stay checked', () => {
  const result = JSON.parse(execFileSync(process.env.DUCKY_TEST_PYTHON || 'python3', ['-c', `
import base64, json
from pathlib import Path
from scripts.lint_copy import BANNED, BANNED_IMPL, PRIVATE, svg_copy_text
payload = base64.b64encode(Path('public/duck-head-cutout-v1.png').read_bytes()).decode()
uri = 'data:image/png;base64,' + payload
image = '<image href="' + uri + '"/>'
svg = lambda body: '<svg xmlns="http://www.w3.org/2000/svg">' + body + '</svg>'
blocked = lambda text: bool(BANNED.search(text) or BANNED_IMPL.search(text) or PRIVATE.search(text))
cases = {
 'canonical': svg('<title>Ducky Bot</title>' + image),
 'title': svg('<title>Qwen</title>' + image),
 'desc': svg('<desc>Qwen</desc>' + image),
 'text': svg(image + '<text>Qwen</text>'),
 'attribute': svg('<g aria-label="Qwen">' + image + '</g>'),
 'attribute_uri': svg(f'''<image href="{uri}" aria-label='{uri}'/>'''),
 'nested_attribute': svg(f'''<image href="{uri}" aria-label='href="{uri}"'/>'''),
 'cdata': svg('<text><![CDATA[' + image + ']]></text>'),
 'comment': svg('<!-- Qwen -->' + image),
 'trading': svg(image + '<text>buy now</text>'),
 'private': svg(image + '<text>someone@gmail.com</text>'),
}
result = {name: blocked(svg_copy_text(doc)) for name, doc in cases.items()}
result['raw_binary_false_positive'] = blocked(cases['canonical'])
result['preserves_offsets'] = len(svg_copy_text(cases['canonical'])) == len(cases['canonical'])
doc = svg(image + '\\n<text>Qwen</text>')
masked = svg_copy_text(doc)
result['visible_line'] = masked.count('\\n', 0, BANNED_IMPL.search(masked).start()) + 1
print(json.dumps(result))
`], {encoding: 'utf8', maxBuffer: 1024 * 1024}));
  assert.equal(result.canonical, false);
  assert.equal(result.raw_binary_false_positive, true);
  assert.equal(result.preserves_offsets, true);
  assert.equal(result.visible_line, 2);
  for (const key of ['title','desc','text','attribute','attribute_uri','nested_attribute','cdata','comment','trading','private']) {
    assert.equal(result[key], true, key);
  }
});

test('malformed SVG/base64, non-PNG data and other URI kinds receive no copy exemption', () => {
  const result = JSON.parse(execFileSync(process.env.DUCKY_TEST_PYTHON || 'python3', ['-c', `
import json
from scripts.lint_copy import BANNED_IMPL, svg_copy_text
cases = [
 '<svg><image href="data:image/png;base64,Qwen!"/></svg>',
 '<svg><image href="data:image/png;base64,Qwen"/></svg>',
 '<svg><image href="data:image/jpeg;base64,Qwen"/></svg>',
 '<svg><image href="data:text/plain;base64,Qwen"/></svg>',
 '<svg><image href="https://example.test/Qwen.png"/></svg>',
 '<svg><text>data:image/png;base64,Qwen</text></svg>',
 '<svg><image href="data:image/png;base64,Qwen"/>',
 '<svg><image xmlns="https://example.test/other" href="data:image/png;base64,Qwen"/></svg>',
]
print(json.dumps([svg_copy_text(doc) == doc and bool(BANNED_IMPL.search(svg_copy_text(doc))) for doc in cases]))
`], {encoding: 'utf8'}));
  assert.deepEqual(result, Array(8).fill(true));
});
