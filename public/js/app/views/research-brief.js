import {s, CFG, LANG} from '../strings.js';
import {el, clear} from '../ui.js';
import * as api from '../api.js';
import * as store from '../store.js';
import {creatorTarget} from '../creator-route.js';
import {readingPreview} from '../reading-preview.js';
import {claimQualifications} from './creator-claim.js';
import {adaptStudies, briefFilters, briefTarget, clock, discussion, MAX_PAGES, requestPath, selectRows} from '../research-brief-model.js';
import {researchBriefPrices, formatBriefPrice, formatBriefChange} from '../research-brief-prices.js';

// Reading preferences only, never response data. Account transitions discard them immediately.
let remembered = null;
store.subscribe('me', me => { if (!me || me.user_id !== remembered?.user) remembered = null; });
const copy = (key, vars) => s('researchbrief.' + key, vars);
const button = (label, action) => el('button.rb-button', {type:'button', 'data-rb-focus':label, onclick:action}, label);
const link = (label, href, external = false) => el('a.rb-button', {href,
  ...(external ? {target:'_blank',rel:'noopener noreferrer'} : {})}, label);

export function formatClock(value) {
  if (!value) return copy('unknown_date');
  if (value.precision === 'day') return value.value;
  return new Intl.DateTimeFormat(LANG === 'zh' ? 'zh-CN' : 'en-US', {
    dateStyle:'medium',timeStyle:'short',timeZone:'UTC',
  }).format(new Date(value.value)) + ' UTC';
}

function evidenceCard(row, openKeys) {
  const article = el('article.rb-evidence', {'data-record-key':row.key,'data-stance':row.kind === 'opinion' ? row.stance : 'neutral'});
  const sourceDetail = creatorTarget({tab:'feed',mine:false,selected:row.creatorId,post:row.videoId,point:row.pointId});
  const meta = el('div.rb-meta', row.ticker ? el('a.rb-ticker', {href:'#/evidence/' + encodeURIComponent(row.ticker)}, row.ticker) : el('span',copy('unknown_ticker')),
    el('span',row.creator || copy('unknown_creator')),
    el('span.rb-tag',copy(row.kind === 'opinion' ? 'stance_' + row.stance : 'kind_' + row.kind)));
  const dates = el('p.rb-date',copy('published') + ' ',el('time',row.published ? {datetime:row.published.value} : {},formatClock(row.published)));
  article.append(meta,dates,el('h3',readingPreview(row.note || row.title || copy('no_summary'),LANG === 'zh')));
  if (row.kind === 'position') {
    const qualification = claimQualifications({...row.call,basis:row.call.direction_basis});
    if (qualification) article.append(qualification);
  }
  if (row.condition) article.append(el('p.rb-condition',el('strong',copy('condition') + ' '),row.condition));
  const prices = researchBriefPrices(row.call);
  if (row.ticker) {
    const priceCell = (label, value, caption, direction='unknown') => el('div',el('span.rb-price-label',copy(label)),
      el('strong.rb-price-value',{'data-direction':direction},value),el('span.rb-price-date',caption));
    article.append(el('div.rb-prices',{'aria-label':copy('price_comparison')},
      priceCell('price_then',formatBriefPrice(prices.reference.price,prices.currency,LANG),prices.reference.session || copy('price_date_unknown')),
      priceCell('price_now',formatBriefPrice(prices.latest.price,prices.currency,LANG),prices.latest.session || copy('price_date_unknown')),
      priceCell('price_change',formatBriefChange(prices.change.percent,LANG),copy('price_stock_change'),prices.change.direction)));
    if (prices.change.percent === null) article.append(el('p.rb-price-status',copy(['corporate_action_review','provider_revision_review'].includes(prices.change.status) ? 'price_review' : 'price_unavailable')));
  }
  const actions = el('div.rb-actions');
  if (row.source) actions.append(link(copy('original'),row.source,true));
  else actions.append(el('span.rb-muted',copy('no_source')));
  if (row.creatorId && row.videoId) actions.append(link(copy('source_detail'),sourceDetail));
  article.append(actions);
  const detail = el('details.rb-detail', {open:openKeys.has(row.key)},el('summary',copy('details')));
  detail.addEventListener('toggle',() => detail.open ? openKeys.add(row.key) : openKeys.delete(row.key));
  if (row.title) detail.append(el('p',row.title));
  if (row.note) detail.append(el('p',row.note));
  if (row.reason) detail.append(el('p',row.reason));
  if (row.horizon) detail.append(el('p',el('strong',copy('horizon') + ' '),row.horizon));
  if (row.ticker) {
    detail.append(el('h4',copy('price_method')),el('p',copy('price_method_detail')));
    if (prices.asOf) detail.append(el('p.rb-muted',copy('price_asof') + ' ' + formatClock(clock(prices.asOf))));
  }
  // Existing terminology correction is an alternate reading, never independent fact validation.
  const reading = row.call.evidence_reading;
  if (reading?.version === 'creator-terminology/2' && typeof reading.text === 'string' && reading.text && reading.terms?.length) {
    detail.append(el('p.rb-muted',copy('corrected_note')),el('blockquote',reading.text));
  }
  detail.append(el('p.rb-muted',copy('original_excerpt')),
    row.original ? el('blockquote',row.original) : el('p',copy('no_excerpt')));
  const clocks = el('dl.rb-clocks');
  for (const [label,value] of [['first_seen',row.firstSeen],['recorded',row.recorded],['processed',row.processed]]) {
    clocks.append(el('div',el('dt',copy(label)),el('dd',formatClock(value))));
  }
  detail.append(clocks);
  if (row.conflict) detail.append(el('p.rb-warning',copy('conflict')));
  if (row.duplicates) detail.append(el('p.rb-muted',copy('duplicates',{n:row.duplicates})));
  if (row.revision) detail.append(el('p.rb-id',copy('record_id') + ' ' + row.revision + (row.pointId ? ' · ' + row.pointId : '')));
  const history = creatorTarget({tab:'research',mine:false,selected:row.creatorId,ticker:row.ticker,point:row.pointId});
  detail.append(el('div.rb-actions',link(copy('history'),history),row.ticker ? link(copy('stock'),'#/evidence/' + encodeURIComponent(row.ticker)) : null));
  article.append(detail);
  return article;
}

export function mount(root, {query = new URLSearchParams(),signal} = {}) {
  // Also guard direct imports: the route switch is not the only entry boundary.
  if (CFG.RESEARCH_BRIEF_ENABLED !== true || !store.get('me')) {
    root.append(el('p',copy('disabled')),link(copy('workspace'),'#/watchlist'));
    return () => {};
  }
  const user = store.get('me').user_id, epoch = store.epoch();
  const routeKey = briefTarget(briefFilters(query));
  const restore = remembered?.user === user && remembered.epoch === epoch && remembered.route === routeKey ? remembered : null;
  let filters = {...briefFilters(query),...(restore?.filters || {})};
  let serverFilters = {...(restore?.serverFilters || filters)}, otherOpen = restore?.otherOpen || false;
  let items = [], watched = [], watchLoading = true, watchFailed = false, loadFailed = false, status = '', cursor = null;
  let sequence = 0, pages = 0, visible = restore?.visible || 20, loading = false, disposed = false, controller;
  const openKeys = new Set(restore?.openKeys || []), creators = new Map();
  const scrollHost = root.closest('.app-main');
  const active = () => !disposed && !signal?.aborted && epoch === store.epoch() && store.get('me')?.user_id === user && root.isConnected;
  const css = el('link',{rel:'stylesheet',href:'/css/research-brief.css?v=' + encodeURIComponent(CFG.VERSION || 'preview')});
  document.head.append(css);
  const shell = el('section.research-brief', {'aria-label':copy('title')});
  root.append(shell);
  const heading = el('h1',copy('title'));
  const dateNotice = el('p');
  const coverage = el('details.rb-coverage',el('summary',copy('coverage')),
    el('p',copy('coverage_detail')),el('p',copy('check_unknown')),
    dateNotice,
    link(copy('all_sources'),creatorTarget({tab:'feed',mine:false})));
  shell.append(el('header.rb-heading',el('div',el('p.rb-eyebrow',copy('preview')),heading),link(copy('workspace'),'#/watchlist')));
  const scopes = el('div.rb-scopes', {role:'group','aria-label':copy('scope')});
  const scopeButtons = {};
  for (const scope of ['watchlist','all']) {
    scopeButtons[scope] = button(copy('scope_' + scope),() => { filters.scope = scope; visible = 20; syncURL(); render(); });
    scopes.append(scopeButtons[scope]);
  }
  shell.append(scopes);
  const search = el('input', {type:'search',value:filters.search,maxLength:200,placeholder:copy('search'),'aria-label':copy('search')});
  search.addEventListener('input',() => { filters.search = search.value; visible = 20; render(); });
  shell.append(el('div.rb-search',search));
  const filterDetails = el('details.rb-filters',el('summary',copy('filter_title')));
  const ticker = el('input',{type:'text',name:'ticker',value:filters.ticker,maxLength:10,autocapitalize:'characters',autocomplete:'off',placeholder:copy('ticker_placeholder')});
  const creator = el('select',{name:'creator'},el('option',{value:''},copy('any_creator')));
  const dates = el('select',{name:'days'},...['7','30','all'].map(days => el('option',{value:days,selected:filters.days === days},copy('days_' + days))));
  dates.addEventListener('change',() => { filters.days = dates.value; visible = 20; syncURL(); render(); });
  const form = el('form.rb-filter-fields',
    el('label',copy('ticker'),ticker),el('label',copy('creator'),creator),el('label',copy('date_range'),dates),
    el('button.rb-button',{type:'submit'},copy('apply')));
  form.addEventListener('submit',event => {
    event.preventDefault();
    const next = briefFilters(new URLSearchParams({ticker:ticker.value.trim(),creator:creator.value,days:filters.days,scope:filters.scope}));
    filters = {...next,search:filters.search}; ticker.value = filters.ticker; visible = 20; syncURL(); load(false);
  });
  filterDetails.append(form,el('p.rb-muted',copy('filter_scope')));
  shell.append(el('div.rb-options',filterDetails,coverage));
  const notice = el('div.rb-notice',{role:'status','aria-live':'polite'}), counts = el('p.rb-result-count',{role:'status','aria-live':'polite',tabindex:-1});
  const results = el('div.rb-results'), overview = el('aside.rb-overview');
  shell.append(notice,counts,el('div.rb-columns',results,overview));

  function syncURL() {
    const hash = briefTarget(filters);
    history.replaceState(history.state,'',location.pathname + location.search + hash);
  }
  function renderCreators() {
    for (const p of items) if (p.kol_id && p.kol_name) creators.set(p.kol_id,p.kol_name);
    if (filters.creator && !creators.has(filters.creator)) creators.set(filters.creator,filters.creator);
    creator.replaceChildren(el('option',{value:''},copy('any_creator')),
      ...[...creators].sort((a,b) => a[1].localeCompare(b[1])).map(([id,name]) => el('option',{value:id,selected:id === filters.creator},name)));
  }
  function render() {
    if (!active()) return;
    const focusKey = shell.contains(document.activeElement) ? document.activeElement?.dataset.rbFocus : null;
    const readingScroll = scrollHost?.scrollTop || 0;
    const rows = adaptStudies(items,LANG), selected = selectRows(rows,filters,watched);
    const now = new Date().toISOString().slice(0,10);
    heading.textContent = rows.some(r => r.published?.day === now) ? copy('title') : copy('recent_title');
    shell.setAttribute('aria-busy',String(loading));
    for (const scope of ['watchlist','all']) scopeButtons[scope].setAttribute('aria-pressed',String(filters.scope === scope));
    clear(notice);
    if (watchFailed) notice.append(el('p.rb-warning',copy('watch_failed')));
    else if (!watchLoading && !watched.length) notice.append(el('p.rb-muted',copy('no_watchlist')),link(copy('set_watchlist'),'#/watchlist'));
    if (loadFailed) notice.append(el('p.rb-warning',{role:'alert'},copy(items.length ? 'partial' : 'load_failed')),button(copy('retry'),() => load(items.length > 0)));
    else if (status === 'collecting') notice.append(el('p.rb-muted',copy('not_ready')));
    if (loading) notice.append(el('p.rb-muted',copy('loading')));
    counts.textContent = copy('results',{n:selected.length,loaded:rows.length}) + ' · ' + copy('days_' + filters.days);
    const undated = rows.filter(r => !r.published).length;
    dateNotice.textContent = undated ? copy('undated',{n:undated}) : '';
    if (results.querySelector('.rb-other')) otherOpen = results.querySelector('.rb-other').open;
    clear(results);clear(overview);
    if (!selected.length && !loading && !loadFailed) results.append(el('div.rb-empty',
      el('h2',copy('empty')),el('p',copy('empty_detail')),
      button(copy('clear'),() => { filters = {...filters,search:'',days:'all',scope:'all',ticker:'',creator:''}; search.value='';ticker.value='';creator.value='';dates.value='all';syncURL();load(false); })));
    const shown = selected.slice(0,visible);
    const lead = shown.filter(r => r.kind === 'opinion').slice(0,3), leadKeys = new Set(lead.map(r => r.key));
    if (lead.length) results.append(el('h2.rb-section-title',copy('first')), ...lead.map(r => evidenceCard(r,openKeys)));
    const rest = shown.filter(r => !leadKeys.has(r.key));
    if (rest.length) {
      const more = el('details.rb-other',{open:lead.length === 0 || otherOpen},el('summary',copy('other',{n:selected.length - lead.length})));
      more.append(...rest.map(r => evidenceCard(r,openKeys)));results.append(more);
    }
    if (selected.length > visible) results.append(button(copy('show_more'),() => { visible += 20; render(); }));
    if (cursor && pages < MAX_PAGES) results.append(button(copy('load_more'),() => { if (!loading) load(true); }));
    if (cursor && pages >= MAX_PAGES) results.append(el('p.rb-muted',copy('page_limit')),link(copy('history'),creatorTarget({tab:'research',mine:false,ticker:filters.ticker,selected:filters.creator})));
    if (loading) results.querySelectorAll('button').forEach(b => { b.disabled = true; });
    const totals = discussion(selected);
    if (totals.length) {
      overview.append(el('h2.rb-section-title',copy('overview')),el('p.rb-muted',copy('overview_scope')));
      const body = el('tbody');
      for (const row of totals.slice(0,20)) {
        const drill = button(row.ticker,() => { ticker.value=row.ticker;filters.ticker=row.ticker;visible=20;syncURL();render(); });
        body.append(el('tr',el('th',{scope:'row'},drill),el('td',String(row.records)),el('td',row.videos === null ? '—' : String(row.videos)),el('td',row.creators === null ? '—' : String(row.creators))));
      }
      overview.append(el('table',el('caption',copy('overview_caption')),el('thead',el('tr',...['ticker','records','videos','authors'].map(k => el('th',{scope:'col'},copy(k))))),body));
      if (totals.length > 20) overview.append(el('p.rb-muted',copy('overview_limit')));
      overview.append(el('p.rb-muted',copy('count_method')));
    }
    if (focusKey) {
      const target=[...shell.querySelectorAll('[data-rb-focus]')].find(node => node !== counts && !node.disabled && node.dataset.rbFocus === focusKey);
      if (target) delete counts.dataset.rbFocus;else counts.dataset.rbFocus=focusKey;
      (target || counts).focus({preventScroll:true});
    }
    if (scrollHost) scrollHost.scrollTop=readingScroll;
  }
  async function load(append, rebase = true) {
    if (!active() || (append && loading)) return;
    controller?.abort();controller = new AbortController();const request = ++sequence;
    if (!append) { items=[];cursor=null;pages=0;status='';if (rebase) serverFilters={...filters}; }
    loading=true;loadFailed=false;render();
    try {
      const response = await api.get(requestPath(serverFilters,append ? cursor : null),{signal:controller.signal,silent402:true});
      if (!active() || request !== sequence) return;
      if (response?.schema !== 'creator-research/3' || !Array.isArray(response.items)) throw Error('invalid_response');
      items = append ? [...items,...response.items] : response.items;
      cursor = typeof response.next_cursor === 'string' && response.next_cursor.length <= 1000 ? response.next_cursor : null;
      pages++;status=response.status || '';renderCreators();
    } catch { if (!active() || request !== sequence) return;loadFailed=true; }
    loading=false;render();
  }
  // The watchlist is fetched once; filters and every card reuse this bounded result.
  async function start() {
    await Promise.all([load(false,!restore),(async () => {
      try {
        const response = await api.get('/watchlist',{signal,silent402:true});
        if (!active()) return;
        if (!Array.isArray(response?.items)) throw Error('invalid_watchlist');
        watched=response.items.map(r => r.ticker).filter(t => typeof t === 'string');
        if (!watched.length && !query.has('scope') && !restore) { filters.scope='all';syncURL(); }
      } catch { if (!active()) return;watchFailed=true; }
      watchLoading=false;
      render();
    })()]);
    // A return visit revalidates only pages the reader had explicitly loaded before leaving.
    for (let page = 1; active() && !loadFailed && cursor && page < Math.min(restore?.pages || 1,MAX_PAGES); page++) await load(true);
    if (active() && restore?.scroll) requestAnimationFrame(() => { if (active() && scrollHost) scrollHost.scrollTop=restore.scroll; });
  }
  function cleanup() {
    if (disposed) return;
    if (store.get('me')?.user_id === user && store.epoch() === epoch) remembered={user,epoch,route:briefTarget(filters),filters:{...filters},serverFilters:{...serverFilters},pages,visible,
      openKeys:[...openKeys],otherOpen:!!results.querySelector('.rb-other')?.open,scroll:scrollHost?.scrollTop || 0};
    else remembered=null;
    disposed=true;controller?.abort();off();css.remove();items=[];watched=[];
  }
  const off = store.subscribe('me',() => { if (!active()) { remembered=null;cleanup();clear(root); } });
  signal?.addEventListener('abort',cleanup,{once:true});
  render();start();return cleanup;
}
