// Offline acceptance against fixed, private retained artifacts; never fetch or relabel them.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {adaptStudies} from '../../../public/js/app/research-brief-model.js';

const capture = '/private/tmp/ducky-evidence-hub-fixtures/_kol_research.json';
const baseline = '/private/tmp/ducky-backfill-acceptance-20260908/baseline.sqlite3';
const expectedHashes = {
  capture: 'e63a7bbdce8c5ab287ebc2977f01c81ca88ea6436ec889d669234eb903a7703f',
  baseline: 'fcd41c974021cec68b4aefbb9af00af44769c95c1ca9ae7b123d78562b5a545d',
};
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
assert.equal(hash(capture), expectedHashes.capture, 'Retained response changed; do not silently accept a new sample');
assert.equal(hash(baseline), expectedHashes.baseline, 'Fixed database differs from the documented backup');
const response = JSON.parse(readFileSync(capture, 'utf8'));
assert.equal(response.schema, 'creator-research/1');
assert.equal(response.as_of, '2026-09-08T07:39:59+00:00');
assert.equal(response.items.length, 500);
const studies = response.items.filter(item => Array.isArray(item.calls) && item.calls.length);
assert.deepEqual(studies.map(p => [p.id, p.revision_id, p.kol_id, p.platform_post_id, p.calls.length]), [
  [481, 925, 'touzi-talk', 'S0v1OUSmSQc', 3],
  [96, 714, 'meet-kevin', 'FETbh8YjxjY', 1],
]);
const frozen = JSON.stringify(studies);
const expectedCalls = studies.flatMap(post => post.calls.map(call => ({post, call})));
const languages = {};
for (const lang of ['en', 'zh']) {
  const rows = adaptStudies(studies, lang);
  assert.equal(rows.length, 4);
  assert.equal(JSON.stringify(studies), frozen, 'Adapter mutated retained input');
  for (const [index, row] of rows.entries()) {
    const {post, call} = expectedCalls[index];
    assert.deepEqual(row.post, post);
    assert.deepEqual(row.call, call); // Includes intent, action, original fields and loss-inclusive windows.
    assert.equal(row.postId, String(post.id));
    assert.equal(row.revision, String(post.revision_id));
    assert.equal(row.ticker, call.sym);
    assert.equal(row.stance, call.stance);
    assert.equal(row.condition, typeof call.condition_text === 'string' ? call.condition_text : '');
    assert.equal(row.original, call.evidence);
    assert.equal(call.excerpt_status, 'source_link');
    assert.equal(row.original, ''); // This dated API capture withheld every excerpt.
    assert.equal(row.condition, ''); // It has no nonempty stated condition; do not invent one.
    assert.ok(row.source, 'Retained source still has a usable outbound URL');
    assert.equal(new URL(row.source).searchParams.get('v'), post.platform_post_id);
    const seconds = call.action_start_seconds ?? call.start_seconds;
    if (Number.isFinite(seconds)) assert.equal(new URL(row.source).searchParams.get('t'), String(Math.floor(seconds)));
  }
  assert.deepEqual(rows.map(row => row.stance), ['neutral', 'bear', 'bear', 'bull']);
  languages[lang] = {studies: studies.length, calls: rows.length, unchangedInput: true,
    emptyConditionsPreserved: 4, emptyExcerptsPreserved: 4, validOriginalLinks: 4};
}

// Stdlib only. No application imports, schema initialization, user tables or source acquisition.
const proof = JSON.parse(execFileSync(process.env.RETAINED_PYTHON || 'python3', ['-B', '-c', String.raw`
import json, pathlib, sqlite3, sys
capture, baseline = map(pathlib.Path, sys.argv[1:])
items = [p for p in json.loads(capture.read_text())['items'] if p.get('calls')]
post_fields = ['id', 'revision_id', 'kol_id', 'platform_post_id', 'published_at', 'first_seen_at', 'recorded_at', 'url', 'title', 'content_hash']
call_fields = ['sym', 'stance', 'note', 'condition_text', 'intent', 'action']
c = sqlite3.connect(baseline.resolve().as_uri() + '?mode=ro', uri=True)
try:
    c.execute('PRAGMA query_only=ON')
    for item in items:
        found = c.execute('SELECT payload FROM kol_studies WHERE revision_id=?', (item['revision_id'],)).fetchone()
        assert found is not None, 'Saved revision missing'
        saved = json.loads(found[0])
        assert all(item.get(k) == saved.get(k) for k in post_fields), 'Post provenance mismatch'
        assert len(item['calls']) == len(saved['calls']), 'Call count mismatch'
        for actual, original in zip(item['calls'], saved['calls']):
            assert all(actual.get(k) == original.get(k) for k in call_fields), 'Saved call semantics mismatch'
    assert c.total_changes == 0
    print(json.dumps({'matchedStudies': len(items), 'matchedCalls': sum(len(p['calls']) for p in items),
                      'postFields': post_fields, 'callFields': call_fields, 'sqliteTotalChanges': c.total_changes}))
finally:
    c.close()
`, capture, baseline], {encoding: 'utf8', maxBuffer: 1024 * 1024}));
assert.equal(hash(capture), expectedHashes.capture);
assert.equal(hash(baseline), expectedHashes.baseline);
console.log(JSON.stringify({schema: 'retained-research-adapter-check/1', checkedAt: new Date().toISOString(),
  status: 'pass', sourceSchema: response.schema, sourceAsOf: response.as_of, sourceHashes: expectedHashes,
  historicalSampleOnly: true, currentSourceValidityVerified: false, liveApiVerified: false, languages, provenance: proof}, null, 2));
