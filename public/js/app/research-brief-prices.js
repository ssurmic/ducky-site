// Pure adapter for kol_claim_prices.build/preserve, delivered in /kol/research calls.
// Prices are stored unadjusted closes. Never fetch, infer a fill, reverse bearish
// returns, or substitute windows.published (which has a different reference date).
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const text = value => typeof value === 'string' && value ? value : null;
const finite = value => typeof value === 'number' && Number.isFinite(value);

function session(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value ? value : null;
}

function observation(raw) {
  const value = object(raw), sourceStatus = text(value.status), date = session(value.d);
  const price = finite(value.price) && value.price >= 0 ? value.price : null;
  // Keep a dated zero. Missing or blocked observations cannot become ready merely
  // because a leftover numeric value is present in the response.
  const status = sourceStatus === 'ready'
    ? price === null ? 'missing_price' : !date ? 'time_unknown' : 'ready'
    : sourceStatus || 'missing_price';
  return {status, sourceStatus, price: status === 'ready' ? price : null,
    session: date, marketTime: text(value.market_time)};
}

/** Use the existing call, not a ticker or a fresh quote. All timestamps are source-owned. */
export function researchBriefPrices(call) {
  const context = object(call?.price_context), saved = object(context.since_publication);
  const reference = observation(context.publication_reference), latest = observation(context.latest_close);
  const version = text(context.version), priceBasis = text(context.price_basis);
  const reviewReasons = Array.isArray(context.provider_revision_review)
    ? context.provider_revision_review.filter(value => typeof value === 'string' && value).slice()
    : [];
  const sourceStatus = text(saved.status);
  let status = sourceStatus || 'missing_price';
  if (!call?.price_context) status = 'missing_context';
  else if (version !== 'creator-price-context-v1') status = 'unsupported_context';
  else if (reviewReasons.length) status = 'provider_revision_review';
  else if (sourceStatus === 'corporate_action_review') status = 'corporate_action_review';
  else if (priceBasis !== 'unadjusted_ohlc' || saved.price_basis !== 'unadjusted_close') status = 'unknown_basis';
  else if (sourceStatus === 'ready') {
    if (reference.status !== 'ready') status = reference.status;
    else if (latest.status !== 'ready') status = latest.status;
    else if (latest.session < reference.session) status = 'pending';
    else if (reference.price === 0) status = 'invalid_reference';
    else if (!finite(saved.ret)) status = 'missing_price';
  }
  const percent = status === 'ready' ? saved.ret : null;
  return {
    version, priceBasis, currency: text(context.currency), timeZone: text(context.timezone),
    asOf: text(context.as_of), reference, latest,
    change: {status, sourceStatus, percent,
      direction: percent === null ? 'unknown' : percent > 0 ? 'up' : percent < 0 ? 'down' : 'flat',
      priceBasis: text(saved.price_basis)},
    reviewReasons,
  };
}

const locale = lang => lang === 'zh' ? 'zh-CN' : 'en-US';

/** A null/unknown currency is not silently labelled USD. */
export function formatBriefPrice(value, currency = 'USD', lang = 'en') {
  if (!finite(value) || value < 0) return '—';
  const code = typeof currency === 'string' && /^[A-Z]{3}$/.test(currency) ? currency : null;
  const small = value > 0 && value < 0.01;
  const options = {minimumFractionDigits: 2, maximumFractionDigits: small ? 6 : 2,
    ...(value > 0 && value < 0.000001 ? {notation: 'scientific'} : {}),
    ...(code ? {style: 'currency', currency: code, currencyDisplay: code === 'USD' ? 'narrowSymbol' : 'code'} : {})};
  return new Intl.NumberFormat(locale(lang), options).format(value === 0 ? 0 : value);
}

/** Input is already a percentage (ret=-10 means -10%, not -1000%). */
export function formatBriefChange(percent, lang = 'en') {
  if (!finite(percent)) return '—';
  const value = percent === 0 ? 0 : percent, magnitude = Math.abs(value);
  const digits = magnitude && magnitude < 0.01 ? Math.min(10, Math.ceil(-Math.log10(magnitude)) + 1) : 2;
  return new Intl.NumberFormat(locale(lang), {minimumFractionDigits: 2, maximumFractionDigits: digits,
    signDisplay: 'exceptZero', ...(magnitude && magnitude < 1e-9 ? {notation: 'scientific'} : {})}).format(value) + '%';
}
