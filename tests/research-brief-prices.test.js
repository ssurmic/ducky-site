import {test} from 'node:test';
import assert from 'node:assert/strict';
import {researchBriefPrices, formatBriefPrice, formatBriefChange} from '../public/js/app/research-brief-prices.js';

// Field names and meanings mirror bin/kol_claim_prices.py build/preserve.
const sample = () => ({stance: 'bear', intent: 'conditional', condition_text: 'Only after orders arrive',
  price_context: {version: 'creator-price-context-v1', price_basis: 'unadjusted_ohlc', currency: 'USD',
    timezone: 'America/New_York', as_of: '2026-09-09T13:00:00+00:00',
    publication_reference: {status: 'ready', d: '2026-09-03', price: 100, field: 'close',
      purpose: 'last_completed_close_at_publication', market_time: '2026-09-03T16:00:00-04:00'},
    latest_close: {status: 'ready', d: '2026-09-08', price: 90, field: 'close',
      purpose: 'latest_recorded_close', market_time: '2026-09-08T16:00:00-04:00'},
    since_publication: {status: 'ready', ret: -10, price_basis: 'unadjusted_close'}}});

test('stored closes keep their dates and losses; a bearish conditional opinion never flips price movement', () => {
  const call = sample(), before = structuredClone(call), result = researchBriefPrices(call);
  assert.deepEqual(call, before);
  assert.equal(result.reference.price, 100);assert.equal(result.reference.session, '2026-09-03');
  assert.equal(result.latest.price, 90);assert.equal(result.latest.session, '2026-09-08');
  assert.equal(result.change.percent, -10);assert.equal(result.change.direction, 'down');
  assert.equal(result.priceBasis, 'unadjusted_ohlc');assert.equal(result.change.priceBasis, 'unadjusted_close');
  assert.equal(result.currency, 'USD');assert.equal(result.timeZone, 'America/New_York');
  assert.equal(result.asOf, '2026-09-09T13:00:00+00:00');
  assert.equal(result.reference.marketTime, '2026-09-03T16:00:00-04:00');
});

test('uses the stored percent without recalculation, stance transformation or old study-window fallback', () => {
  const call = sample();call.price_context.since_publication.ret = -9.9999;
  call.windows = {published: {status: 'ready', base_px: 900, base_d: '2026-09-04', horizons: {'20': {ret: 99}}}};
  assert.equal(researchBriefPrices(call).change.percent, -9.9999);
  delete call.price_context.publication_reference;
  const result = researchBriefPrices(call);
  assert.equal(result.reference.price, null);assert.equal(result.change.percent, null);
  assert.equal(researchBriefPrices({windows: call.windows}).change.status, 'missing_context');
});

test('actual zero movement remains zero; latest zero is retained, a zero denominator is not divided', () => {
  const call = sample();call.price_context.latest_close.price = 100;call.price_context.since_publication.ret = 0;
  assert.equal(researchBriefPrices(call).change.percent, 0);assert.equal(researchBriefPrices(call).change.direction, 'flat');
  call.price_context.latest_close.price = 0;call.price_context.since_publication.ret = -100;
  assert.equal(researchBriefPrices(call).latest.price, 0);assert.equal(researchBriefPrices(call).change.percent, -100);
  call.price_context.publication_reference.price = 0;
  assert.equal(researchBriefPrices(call).reference.price, 0);
  assert.equal(researchBriefPrices(call).change.status, 'invalid_reference');assert.equal(researchBriefPrices(call).change.percent, null);
});

test('missing, pending, unknown and corporate-action states cannot become a calculated success', () => {
  for (const status of ['missing_price', 'pending', 'time_unknown', 'corporate_action_review', 'future_status']) {
    const call = sample();call.price_context.since_publication.status = status;
    const result = researchBriefPrices(call);
    assert.equal(result.change.status, status);assert.equal(result.change.sourceStatus, status);
    assert.equal(result.change.percent, null);assert.equal(result.change.direction, 'unknown');
  }
  for (const value of [null, '0', false, NaN, Infinity]) {
    const call = sample();call.price_context.latest_close.price = value;
    assert.equal(researchBriefPrices(call).latest.price, null);assert.equal(researchBriefPrices(call).change.percent, null);
  }
});

test('provider revisions retain visible dated anchors but require review instead of bypassing the stored gate', () => {
  const call = sample();call.price_context.provider_revision_review = ['publication_reference'];
  const before = structuredClone(call), result = researchBriefPrices(call);
  assert.deepEqual(call, before);assert.equal(result.reference.price, 100);assert.equal(result.latest.price, 90);
  assert.deepEqual(result.reviewReasons, ['publication_reference']);assert.equal(result.change.status, 'provider_revision_review');
  assert.equal(result.change.percent, null);
  result.reviewReasons.push('local-only');assert.deepEqual(call.price_context.provider_revision_review, ['publication_reference']);
});

test('invalid or reversed sessions, unsupported context and missing basis stay explicit', () => {
  const call = sample();call.price_context.latest_close.d = '2026-02-30';
  assert.equal(researchBriefPrices(call).latest.session, null);assert.equal(researchBriefPrices(call).change.status, 'time_unknown');
  call.price_context.latest_close.d = '2026-09-02';
  assert.equal(researchBriefPrices(call).change.status, 'pending');
  call.price_context.version = 'unknown';assert.equal(researchBriefPrices(call).change.status, 'unsupported_context');
  call.price_context.version = 'creator-price-context-v1';delete call.price_context.since_publication.price_basis;
  assert.equal(researchBriefPrices(call).change.status, 'unknown_basis');
});

test('a blocked anchor cannot publish a leftover numeric price and fail-safe absence is not zero', () => {
  const call = sample();call.price_context.latest_close.status = 'missing_price';
  const result = researchBriefPrices(call);
  assert.equal(result.latest.price, null);assert.equal(result.latest.session, '2026-09-08');
  assert.equal(result.change.percent, null);assert.equal(result.change.status, 'missing_price');
  assert.equal(researchBriefPrices(null).change.status, 'missing_context');
});

test('display formatting preserves zero, losses and tiny movements without a misleading signed zero', () => {
  assert.equal(formatBriefPrice(0), '$0.00');assert.equal(formatBriefPrice(null), '—');
  assert.equal(formatBriefPrice(false), '—');assert.equal(formatBriefPrice(90), '$90.00');
  assert.equal(formatBriefPrice(90, null), '90.00');
  assert.equal(formatBriefChange(0), '0.00%');assert.equal(formatBriefChange(-0), '0.00%');
  assert.equal(formatBriefChange(-10), '-10.00%');assert.equal(formatBriefChange(10), '+10.00%');
  assert.equal(formatBriefChange(null), '—');assert.match(formatBriefChange(-0.004), /^-0\.004/);
  assert.notEqual(formatBriefPrice(0.0000001), '$0.00');assert.match(formatBriefChange(1e-12), /E-12%$/);
});
