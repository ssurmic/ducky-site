import {evidenceLink} from '../evidence-link.js';
import {el, clear, spinner, num, pct, px, dateTime} from '../ui.js';
import {s, has, LANG} from '../strings.js';
import * as api from '../api.js';
import * as store from '../store.js';
import {priceTrend} from './opportunity-chart.js';

const finite = value => typeof value === 'number' && Number.isFinite(value);
const number = (value, digits=1) => finite(value) ? num(value, digits) : '—';
const percent = value => finite(value) ? pct(value, 1) : '—';
const money = value => finite(value) ? new Intl.NumberFormat(LANG === 'en' ? 'en-US' : 'zh-CN',
  {style:'currency', currency:'USD', notation:'compact', maximumFractionDigits:1}).format(value) : '—';
const localized = value => typeof value?.[LANG] === 'string' ? value[LANG].trim() : '';
const label = key => s('opportunities.' + key);
const link = (href, key) => el('a.btn.btn-ghost.btn-sm', {href}, s(key));
const factors = ['price_dislocation', 'stabilization', 'peer_lag', 'valuation_support', 'business_support'];
const financialReady = fund => ['ready', 'provider_snapshot'].includes(fund?.status);
const caps = {all:[], small:[0, 2e9], mid:[2e9, 10e9], large:[10e9, 200e9], mega:[200e9]};
const defaults = () => ({sector:'', cap:'all', scope:'all', query:'', iv_hv_max:'', sort:'priority'});
const sectorName = value => has('radar.sector_' + value) ? s('radar.sector_' + value) : value;
const comparisonReady = row => row.relative?.status === 'ready' &&
  (!row.relative.as_of || row.relative.as_of === row.as_of) &&
  (!row.relative.windows?.['20'] || (row.relative.windows['20'].status === 'ok' &&
    row.relative.windows['20'].end === row.as_of));

// Retained for callers of the original local preview; discovery filters now run on the server.
export function selectCandidates(items, scope, watches, query='') {
  const watched = new Set(watches.map(x => String(x.ticker || x).toUpperCase()));
  const q = query.trim().toLowerCase();
  return items.filter(row => (scope === 'all' || (scope === 'watchlist') === watched.has(row.ticker)) &&
    (!q || [row.ticker, row.company].join(' ').toLowerCase().includes(q)));
}

export function discoveryQuery(filters, cursor=null) {
  const q = new URLSearchParams({limit:'30', scope:['all','outside','watchlist'].includes(filters.scope) ? filters.scope : 'all',
    sort:['priority','drawdown','cap'].includes(filters.sort) ? filters.sort : 'priority'});
  if (filters.sector) q.set('sector', String(filters.sector));
  if (filters.query?.trim()) q.set('query', filters.query.trim().slice(0, 80));
  const cap = caps[filters.cap] || [];
  if (cap[0] !== undefined) q.set('cap_min', cap[0]);
  if (cap[1] !== undefined) q.set('cap_max', cap[1]);
  if (String(filters.iv_hv_max) === '1') q.set('iv_hv_max', '1');
  if (cursor !== null && cursor !== undefined && cursor !== '') q.set('cursor', String(cursor));
  return q.toString();
}

/** Stars are a server-owned research rating. Missing evidence never becomes zero or a new score. */
export function ratingValue(priority) {
  if (priority?.status !== 'ready' || priority.basis !== 'research_attention_not_expected_return' ||
      !Number.isInteger(priority.stars) || priority.stars < 0 || priority.stars > 5 ||
      typeof priority.version !== 'string' || !priority.version || !Array.isArray(priority.components) ||
      priority.components.length !== factors.length) return null;
  const keys = new Set();
  if (priority.components.some(part => {
    if (!part || !factors.includes(part.key) || keys.has(part.key) || part.max !== 1 ||
        ![null, 0, 1].includes(part.value)) return true;
    keys.add(part.key); return false;
  })) return null;
  return priority.stars;
}
function sources(explanation) {
  return (Array.isArray(explanation?.sources) ? explanation.sources : []).slice(0, 12).filter(source => {
    try { const url = new URL(source.url); return url.protocol === 'https:' && !url.username && !url.password; }
    catch { return false; }
  });
}
function rating(priority) {
  const stars = ratingValue(priority);
  return el('div.opportunity-priority', el('span.small.muted', label('priority')),
    stars === null ? el('span.small', label('priority_missing')) :
      el('span.opportunity-stars', {role:'img', 'aria-label':s('opportunities.star_count', {n:stars})},
        el('span', {'aria-hidden':'true'}, '★'.repeat(stars)),
        el('span.opportunity-stars-empty', {'aria-hidden':'true'}, '☆'.repeat(5 - stars))));
}
function evidenceDetails(row) {
  const fund = row.fundamentals || {}, rel = row.relative || {}, explanation = row.explanation || {};
  const ready = financialReady(fund);
  const table = el('dl.opportunity-fundamentals');
  for (const key of ['forward_pe','trailing_pe','price_to_sales','fcf_yield','revenue_growth','earnings_growth','profit_margin','net_debt']) {
    const value = ready ? fund[key] : null;
    const text = key === 'net_debt' ? money(value) : ['forward_pe','trailing_pe','price_to_sales'].includes(key) ?
      (finite(value) ? number(value) + '×' : '—') : percent(value);
    table.append(el('div', el('dt', label(key)), el('dd.mono', text)));
  }
  const fundamentals = el('section', el('h3', label('valuation')), table,
    el('p.small.muted', ready ? s('opportunities.fundamentals_at', {date:dateTime(fund.as_of)}) : label('fundamentals_missing')),
    el('p.small.muted', label('valuation_limit')));
  const financialSource = sources({sources:[{url:fund.source_url}]})[0];
  if (financialSource) fundamentals.append(el('a.small', {href:financialSource.url, target:'_blank',
    rel:'noopener noreferrer'}, label('financial_source')));
  const valuation = row.priority?.valuation;
  if (valuation?.status === 'ready' && ['pe_ttm','ev_ebitda_ttm','price_to_fcf_ttm'].includes(valuation.metric) &&
      finite(valuation.target) && finite(valuation.median) && Number.isInteger(valuation.sample) &&
      valuation.sample >= 3 && valuation.as_of === row.as_of && typeof valuation.period_end === 'string') {
    fundamentals.append(el('p', s('opportunities.comparable_valuation', {
      metric:label('valuation_' + valuation.metric), target:number(valuation.target), median:number(valuation.median),
      n:valuation.sample, period:valuation.period_end})),
      el('p.small.muted', s('opportunities.peer_symbols', {symbols:(valuation.symbols || []).join(', ')})));
  } else fundamentals.append(el('p.small.muted', label('comparable_missing')));
  const priority = el('section', el('h3', label('priority_basis')), el('p.small.muted', label('priority_note')));
  if (ratingValue(row.priority) !== null) {
    const parts = el('dl.opportunity-factors');
    for (const part of row.priority.components) {
      if (!factors.includes(part.key)) continue;
      parts.append(el('div', el('dt', label('factor_' + part.key)),
        el('dd.mono', part.value === null ? '—' : number(part.value, 0) + ' / ' + number(part.max, 0))));
    }
    priority.append(parts);
  } else priority.append(el('p.data-notice', label('priority_missing')));
  const kinds = ['business_peers','industry_etf','sector_etf','market_etf'];
  const comparison = el('section', el('h3', label('comparison')));
  if (comparisonReady(row) && kinds.includes(rel.kind) && typeof rel.benchmark === 'string') {
    comparison.append(el('p', rel.benchmark + ' · ' + label('reference_' + rel.kind)));
    if (Array.isArray(rel.symbols) && rel.symbols.length) comparison.append(el('p.small.muted',
      s('opportunities.peer_symbols', {symbols:rel.symbols.join(', ')})));
    const window = rel.windows?.['20'];
    if (window?.start && window.end) comparison.append(el('p.small.muted',
      s('opportunities.comparison_dates', {start:window.start, end:window.end})));
  } else comparison.append(el('p.data-notice', label('peer_missing')));
  const sourceSection = el('section', el('h3', label('sources')));
  const sourceList = sources(explanation);
  for (const source of sourceList) sourceSection.append(el('p.opportunity-source',
    el('a', {href:source.url, target:'_blank', rel:'noopener noreferrer'}, source.title || new URL(source.url).hostname),
    el('span.small.muted', dateTime(source.published_at))));
  if (!sourceList.length) sourceSection.append(el('p.small.muted', label('sources_missing')));
  if (explanation.as_of) sourceSection.append(el('p.small.muted',
    s('opportunities.explanation_at', {date:dateTime(explanation.as_of)})));
  return el('details.opportunity-evidence', el('summary', label('evidence')),
    el('div.opportunity-evidence-grid', fundamentals, priority, comparison, sourceSection));
}

export function candidateCard(row, watches=[]) {
  const tech = row.technical || {}, rel = row.relative || {}, fund = row.fundamentals || {};
  const watched = typeof row.in_watchlist === 'boolean' ? row.in_watchlist :
    Array.isArray(watches) ? watches.some(x => (x.ticker || x) === row.ticker) : null;
  const tk = encodeURIComponent(row.ticker);
  const identity = el('div.opportunity-identity', el('a.ticker', {href:'#/research/' + tk}, '$' + row.ticker),
    el('p', row.company || ''), el('p.small.muted',
      (row.sector ? sectorName(row.sector) : label('sector_unknown')) + ' · ' + money(row.market_cap)));
  const badges = el('div.opportunity-badges');
  if (watched !== null) badges.append(el('span.chip', label(watched ? 'watched' : 'discovered')));
  if (row.qualification?.recovery === true) badges.append(el('span.opportunity-recovery', label('recovery')));
  identity.append(badges);
  const card = el('article.card.opportunity-card', {'data-ticker':row.ticker},
    el('div.opportunity-heading', identity, rating(row.priority)));
  card.append(el('div.opportunity-price', el('strong.mono', finite(row.current_price) && row.current_price > 0 ? px(row.current_price) : '—'),
    el('span.small.muted', s('opportunities.close_at', {date:row.as_of || '—'}))),
    priceTrend(row.price_series, {reference:{value:row.ma252, date:row.as_of, label:label('ma252_reference')}}));
  const gap = comparisonReady(row) && finite(rel.excess20) ? rel.excess20 : null;
  const metric = (key, value) => el('div', el('dt', label(key)), el('dd.mono', value));
  card.append(el('dl.opportunity-metrics', metric('drawdown', percent(tech.dd_pct)), metric('rsi', number(tech.rsi_d)),
    metric('ma252', percent(tech.ma252_pct)), metric('iv_hv', number(tech.iv_hv, 2)),
    metric(rel.kind === 'business_peers' ? 'relative' : 'reference_gap', gap === null ? '—' :
      s(gap < 0 ? 'opportunities.behind' : 'opportunities.ahead', {n:Math.abs(gap).toFixed(1)})),
    metric('forward_pe', financialReady(fund) && finite(fund.forward_pe) ? number(fund.forward_pe) + '×' : '—')));
  const explanation = row.explanation || {}, why = localized(explanation.why_fell), risks = localized(explanation.risks);
  const explained = explanation.status === 'ready' && sources(explanation).length > 0;
  card.append(el('section.opportunity-context', el('h3', label('why_fell')),
    el('p', explained && why ? why : label('explanation_missing'))));
  if (explained && risks) card.append(el('p.opportunity-risk', el('strong', label('risks') + ' · '), risks));
  const gaps = [];
  if (!finite(tech.iv_hv)) gaps.push(label('iv_missing'));
  if (gap === null) gaps.push(label('peer_missing'));
  if (gaps.length) card.append(el('p.small.muted.opportunity-gaps', gaps.join(' · ')));
  card.append(evidenceDetails(row), el('div.opportunity-actions', link('#/research/' + tk, 'opportunities.research'),
    evidenceLink(row.ticker), link('#/chart/' + tk, 'nav.chart'), link('#/alerts?ticker=' + tk, 'boards.set_alert')));
  return card;
}

function methodCard() {
  return el('details.card.opportunity-method', el('summary', label('method')),
    el('p', label('discovery_rule')), el('p', label('priority_note')),
    el('p.small.muted', label('discovery_not_strategy')),
    el('a', {href:(LANG === 'en' ? '/en' : '') + '/research-records/'}, label('backtest')));
}
function paywall() {
  return el('section.card', el('h2', label('lock_title')), el('p', label('lock_note')), link('#/billing', 'nav.billing'));
}

export async function mount(root, route={}) {
  const epoch = store.epoch(), token = store.get('token');
  let alive = true, controller, generation = 0, pending = null, debounce;
  let filters = defaults(), doc = null, items = [];
  const valid = () => alive && !route.signal?.aborted && epoch === store.epoch() && token === store.get('token');
  const cleanup = () => {
    alive = false; controller?.abort(); clearTimeout(debounce);
    root.classList.remove('opportunities-view'); route.signal?.removeEventListener('abort', cleanup);
  };
  route.signal?.addEventListener('abort', cleanup, {once:true});
  root.classList.add('opportunities-view');
  const dated = el('p.small.muted');
  root.append(el('div.view-head', el('div', el('h1', s('nav.opportunities')), el('p.muted', label('description')), dated)));
  if (!store.isPro()) { root.append(paywall(), methodCard()); return cleanup; }
  const controls = {}, form = el('form.card.opportunity-filter-panel'), moreFilters = el('details.opportunity-more-filters',
    el('summary', label('more_filters'))), core = el('div.opportunity-filters'), extra = el('div.opportunity-filters');
  function control(key, options) {
    const node = options ? el('select.input', {name:key}, ...options.map(([value, text]) => el('option', {value}, text))) :
      el('input.input', {name:key, type:'search', maxlength:80, placeholder:label('search')});
    node.value = filters[key]; controls[key] = node;
    node.addEventListener(key === 'query' ? 'input' : 'change', () => {
      if (!valid()) return;
      filters[key] = node.value; controller?.abort(); pending = null; generation++; clearTimeout(debounce);
      doc = null; items = []; clear(results); clear(coverage); clear(feedback); clear(paging);
      if (key === 'query') debounce = setTimeout(() => load(), 250); else load();
    });
    return el('label', el('span', label('filter_' + key)), node);
  }
  core.append(control('sector', [['', label('all_sectors')]]), control('cap',
    Object.keys(caps).map(value => [value, label('filter_cap_' + value)])));
  extra.append(control('scope', ['all','outside','watchlist'].map(value => [value, label('filter_scope_' + value)])),
    control('query'), control('iv_hv_max', [['', label('volatility_all')], ['1', label('iv_below_hv')]]),
    control('sort', ['priority','drawdown','cap'].map(value => [value, label('filter_sort_' + value)])));
  moreFilters.append(extra);
  const reset = el('button.btn.btn-ghost.btn-sm', {type:'button', onclick:() => {
    filters = defaults(); for (const [key, node] of Object.entries(controls)) node.value = filters[key];
    clearTimeout(debounce); load();
  }}, label('reset'));
  form.append(core, el('div.opportunity-filter-footer', moreFilters, reset));
  form.addEventListener('submit', event => { event.preventDefault(); clearTimeout(debounce); load(); });
  const feedback = el('div.opportunity-feedback', {role:'status', 'aria-live':'polite'});
  const results = el('div.opportunity-grid'), paging = el('div.opportunity-paging'), coverage = el('div.opportunity-coverage');
  root.append(form, feedback, results, paging, coverage, methodCard(),
    el('p.opportunity-customize', link('#/screens', 'opportunities.customize')));
  function render() {
    clear(feedback); clear(results); clear(paging); clear(coverage);
    dated.textContent = doc.as_of ? s('opportunities.close_at', {date:doc.as_of}) : '';
    if (doc.status === 'warming' || doc.status === 'stale') {
      feedback.append(el('p.data-notice', label('status_' + doc.status)),
        el('button.btn.btn-ghost', {type:'button', onclick:() => load()}, s('common.retry')));
    } else {
      feedback.append(el('p', s('opportunities.loaded_results', {n:items.length, total:doc.total})));
      if (doc.status === 'partial') feedback.append(el('p.small.muted', label('status_partial')));
      for (const row of items) results.append(candidateCard(row, null));
      if (!items.length) results.append(el('div.card', el('h2', label('empty')), el('p.muted', label('empty_note'))));
      if (doc.next_cursor !== null && doc.next_cursor !== undefined && doc.next_cursor !== '') paging.append(
        el('button.btn.btn-ghost', {type:'button', onclick:() => load({append:true})}, label('load_more')));
    }
    const c = doc.coverage || {};
    coverage.append(el('details.card', el('summary', label('coverage_title')),
      el('p', s('opportunities.discovery_coverage', {name:c.universe_name || '—',
        checked:number(c.checked, 0), total:number(c.universe_count, 0), qualified:number(c.qualified, 0), unknown:number(c.unknown, 0)})),
      el('p.small.muted', s('opportunities.coverage_details', {enriched:number(c.enriched, 0), explained:number(c.explained, 0), date:dateTime(doc.built_at)})),
      el('p.small.muted', label(c.scope_complete === true ? 'scope_complete' : 'scope_incomplete'))));
    const known = new Set([...controls.sector.options].map(option => option.value));
    for (const sector of doc.filters?.sectors || []) if (typeof sector === 'string' && !known.has(sector)) {
      controls.sector.append(el('option', {value:sector}, sectorName(sector))); known.add(sector);
    }
  }
  async function load({append=false} = {}) {
    if (!valid()) return;
    const key = discoveryQuery(filters, append ? doc?.next_cursor : null);
    if (pending?.key === key) return pending.promise;
    controller?.abort(); controller = new AbortController(); const id = ++generation;
    const current = () => valid() && id === generation;
    const previous = doc, oldCount = items.length;
    if (!append) { items = []; doc = null; clear(results); clear(paging); clear(coverage); dated.textContent = ''; }
    clear(feedback).append(spinner());
    for (const button of paging.querySelectorAll('button')) button.disabled = true;
    const promise = (async () => {
      try {
        const next = await api.get('/opportunities?' + key, {signal:controller.signal});
        if (!current()) return;
        if (next?.version !== 'oversold-discovery-v1' || !['warming','partial','ready','stale'].includes(next.status) ||
          !Array.isArray(next.items) || next.items.some(row => !row || typeof row.ticker !== 'string' ||
          !/^[A-Z0-9][A-Z0-9.^-]{0,14}$/.test(row.ticker))) throw Error('invalid_response');
        // A rebuilt daily snapshot requires a new first page; never stitch different observations together.
        if (append && previous && (previous.as_of !== next.as_of || previous.built_at !== next.built_at)) {
          pending = null; return load();
        }
        doc = next;
        const seen = new Set(append ? items.map(row => row.ticker) : []);
        items = [...(append ? items : []), ...next.items.filter(row => {
          if (seen.has(row.ticker)) return false; seen.add(row.ticker); return true;
        })];
        render();
        if (append && items.length > oldCount) {
          const firstNew = results.children[oldCount]?.querySelector('.ticker'); firstNew?.focus();
        }
      } catch (error) {
        if (!current()) return;
        clear(feedback);
        if (error.status === 402) { clear(results); clear(paging); clear(coverage); feedback.append(paywall()); }
        else feedback.append(el('p.data-notice', label('load_failed')),
          el('button.btn.btn-ghost', {type:'button', onclick:() => load({append})}, s('common.retry')));
      } finally {
        if (current()) { pending = null; for (const button of paging.querySelectorAll('button')) button.disabled = false; }
      }
    })();
    pending = {key, promise}; return promise;
  }
  if (valid()) await load();
  return cleanup;
}
