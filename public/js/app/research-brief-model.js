// Pure projection of the existing creator-research/3 read contract. No I/O or shared mutations.
export const PAGE_LIMIT = 100;
export const MAX_PAGES = 5;
const tickerPattern = /^[A-Z][A-Z0-9.-]{0,9}$/;
const creatorPattern = /^[A-Za-z0-9_-]{1,100}$/;
const text = value => typeof value === 'string' ? value : '';
const id = value => (typeof value === 'string' && value) || (Number.isSafeInteger(value) ? String(value) : null);
export const pickText = (value, lang = 'en') => typeof value === 'string' ? value :
  text(value?.[lang]) || text(value?.en) || text(value?.zh);
function summaryData(value) {
  if (typeof value !== 'string') return value && typeof value === 'object' ? value : {};
  try { const parsed=JSON.parse(value);return parsed && typeof parsed === 'object' ? parsed : {}; }
  catch { return {en:value,zh:value}; }
}

export function day(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) return null;
  const date = value.slice(0, 10), parsed = Date.parse(date);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === date ? date : null;
}

export function clock(value) {
  if (!day(value)) return null;
  if (value.length === 10) return { value, day: value, precision: 'day' };
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) return null;
  return { value, day: new Date(value).toISOString().slice(0, 10), precision: 'time' };
}

export function briefFilters(query = new URLSearchParams()) {
  const ticker = (query.get('ticker') || '').toUpperCase(), creator = query.get('creator') || '';
  return {
    ticker: tickerPattern.test(ticker) ? ticker : '',
    creator: creatorPattern.test(creator) ? creator : '',
    days: ['7', '30', 'all'].includes(query.get('days')) ? query.get('days') : '7',
    scope: query.get('scope') === 'all' ? 'all' : 'watchlist',
    search: '',
  };
}

// Only explicit, public filter choices in the hash. Never serialize watchlists or search text.
export function briefTarget(filters, existing = new URLSearchParams()) {
  const q = new URLSearchParams(existing);
  for (const key of ['ticker', 'creator', 'days', 'scope']) q.delete(key);
  if (tickerPattern.test(filters.ticker)) q.set('ticker', filters.ticker);
  if (creatorPattern.test(filters.creator)) q.set('creator', filters.creator);
  if (['30', 'all'].includes(filters.days)) q.set('days', filters.days);
  if (filters.scope === 'all') q.set('scope', 'all');
  // Drop unsupported input, including pasted tokens, instead of echoing it on navigation.
  for (const key of [...q.keys()]) if (!['ticker', 'creator', 'days', 'scope'].includes(key)) q.delete(key);
  return '#/research-brief' + (q.size ? '?' + q : '');
}

export function requestPath(filters, cursor = null) {
  const q = new URLSearchParams({ limit: String(PAGE_LIMIT) });
  if (tickerPattern.test(filters.ticker)) q.set('ticker', filters.ticker);
  if (creatorPattern.test(filters.creator)) q.set('kol_id', filters.creator);
  if (typeof cursor === 'string' && cursor.length <= 1000) q.set('before', cursor);
  return '/kol/research?' + q;
}

export function originalLink(url, seconds) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.username || u.password || u.port ||
        !['youtube.com', 'www.youtube.com', 'youtu.be'].includes(u.hostname)) return null;
    if (Number.isFinite(seconds) && seconds >= 0) u.searchParams.set('t', String(Math.floor(seconds)));
    return u.href;
  } catch { return null; }
}

function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  return JSON.stringify(value);
}

export function adaptStudies(items = [], lang = 'en') {
  const groups = new Map(), rows = [];
  for (const [postIndex, post] of items.entries()) {
    if (!post || typeof post !== 'object') continue;
    const calls = Array.isArray(post.calls) ? post.calls : [];
    const summary = summaryData(post.summary), {calls: _siblings, ...postMetadata} = post;
    for (const [callIndex, call] of (calls.length ? calls : [null]).entries()) {
      const c = call && typeof call === 'object' ? call : {};
      const creatorId = creatorPattern.test(post.kol_id) ? post.kol_id : null;
      const pointId = id(c.point_id) || id(c.claim_id), postId = id(post.id);
      const revision = id(post.study_key) || id(post.revision_id);
      const identity = creatorId && postId && revision ? JSON.stringify([creatorId, postId, revision, pointId || callIndex]) : null;
      const signature = stable({ post:postMetadata, call:c });
      let group = identity ? groups.get(identity) : null;
      if (group?.some(r => r.signature === signature)) { group.find(r => r.signature === signature).duplicates++; continue; }
      const archived = c.canonical_replacement === true || ['superseded', 'retracted'].includes(c.attribution_status);
      const kind = archived ? 'archive' : !call && ['partial','processing','failed'].includes(summary.source?.status) ? 'unavailable' :
        c.direction_basis === 'self_reported_position_behavior' || c.intent === 'self_reported' ? 'position' :
        c.intent === 'mention' || c.direction_basis === 'verified_mention_no_direction' ? 'mention' :
        ['bull', 'bear'].includes(c.stance) ? 'opinion' : 'background';
      const row = {
        key: (identity || 'unidentified:' + postIndex + ':' + callIndex) + ':' + (group?.length || 0),
        identity, signature, duplicates: 0, conflict: !!group,
        post, call: c, creatorId, creator: text(post.kol_name), postId, pointId, revision,
        videoId: id(post.platform_post_id), ticker: tickerPattern.test(c.sym) ? c.sym : null,
        published: clock(post.published_at), firstSeen: clock(post.first_seen_at),
        recorded: clock(post.recorded_at), processed: clock(post.computed_at),
        title: text(post.title), note: pickText(c.note, lang) || pickText(summary, lang),
        reason: pickText(c.reason, lang), original: text(c.evidence),
        condition: text(c.condition_text), horizon: text(c.horizon_text), kind,
        stance: ['bull', 'bear', 'neutral'].includes(c.stance) ? c.stance : 'unknown',
        source: originalLink(c.source_url || post.url, c.action_start_seconds ?? c.start_seconds),
      };
      if (group) { group.forEach(r => { r.conflict = true; }); group.push(row); }
      else if (identity) groups.set(identity, [row]);
      rows.push(row);
    }
  }
  return rows;
}

export function selectRows(rows, filters, watched = [], now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const from = filters.days === 'all' ? null : new Date(Date.parse(today) - (Number(filters.days) - 1) * 86400000).toISOString().slice(0, 10);
  const needle = filters.search.trim().toLocaleLowerCase(), watches = new Set(watched);
  return rows.filter(r => (filters.scope !== 'watchlist' || watches.has(r.ticker)) &&
    (!filters.ticker || r.ticker === filters.ticker) && (!filters.creator || r.creatorId === filters.creator) &&
    (!from || (r.published && r.published.day >= from && r.published.day <= today)) &&
    (!needle || [r.creator, r.ticker, r.title, r.note, r.reason, r.original, r.condition, r.horizon].join(' ').toLocaleLowerCase().includes(needle)))
    .sort((a, b) => (a.kind === 'opinion' ? 0 : 1) - (b.kind === 'opinion' ? 0 : 1) ||
      (b.published?.day || '').localeCompare(a.published?.day || '') ||
      (Date.parse(b.published?.value) || 0) - (Date.parse(a.published?.value) || 0) || a.key.localeCompare(b.key));
}

export function discussion(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (!row.ticker) continue;
    if (!groups.has(row.ticker)) groups.set(row.ticker, []);
    groups.get(row.ticker).push(row);
  }
  return [...groups.entries()].map(([ticker, values]) => ({
    ticker, records: values.length,
    videos: values.every(r => r.videoId) ? new Set(values.map(r => r.videoId)).size : null,
    creators: values.every(r => r.creatorId) ? new Set(values.map(r => r.creatorId)).size : null,
    latest: values.map(r => r.published?.day).filter(Boolean).sort().at(-1) || null,
  })).sort((a, b) => b.records - a.records || a.ticker.localeCompare(b.ticker));
}
