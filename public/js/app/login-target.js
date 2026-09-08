// Preserve the page requested before sign-in, including a round trip to Google.
// Only canonical routes and allowlisted public navigation choices are stored.
// Never store arbitrary queries, credentials or private draft data.
import { creatorRoute, creatorTarget } from './creator-route.js';
import { evidenceHref } from './evidence-route.js';
const KEY = "ducky.login-target";
const MAX_AGE = 20 * 60 * 1000;
const SIMPLE = new Set(["watchlist", "alerts", "billing", "profile", "creators", "calendar", "boards", "reports", "opportunities", "degen", "vibe", "ducky", "market", "macro", "screens"]);

export function safeTarget(hash) {
  if (typeof hash !== "string" || hash.length > 2048) return null;
  const path = hash.split("?")[0];
  if(path==='#/evidence'){
    const example=new URLSearchParams(hash.split('?')[1]||'').get('example');
    if(['NOK','GLW','HOOD'].includes(example))return '#/evidence?example='+example;
  }
  if(path==="#/ducky")return "#/evidence";
  if (path === '#/billing') {
    const q = new URLSearchParams(hash.split('?')[1] || ''), target = new URLSearchParams();
    if (['USD', 'CNY'].includes(q.get('currency'))) target.set('currency', q.get('currency'));
    if (['1', '12'].includes(q.get('months'))) target.set('months', q.get('months'));
    if (target.get('currency') === 'CNY') target.set('months', '12');
    return path + (target.size ? '?' + target : '');
  }
  if (path === '#/updates') {
    const q = new URLSearchParams(hash.split('?')[1] || ''), target = new URLSearchParams();
    const ticker = (q.get('ticker') || '').toUpperCase(), item = q.get('item') || '';
    if (/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker)) target.set('ticker', ticker);
    if (/^[1-9][0-9]{0,15}$/.test(item)) target.set('item', item);
    return '#/updates' + (target.size ? '?' + target : '');
  }
  if (path === '#/creators') return creatorTarget(creatorRoute(new URLSearchParams(hash.split('?')[1] || '')));
  if(path.startsWith('#/record/')){try{const id=decodeURIComponent(path.slice(9));return /^[a-zA-Z0-9][a-zA-Z0-9:._-]{0,149}$/.test(id)?'#/record/'+encodeURIComponent(id):null;}catch{return null;}}
  if (path === '#/boards' || path === '#/reports') {
    const q = new URLSearchParams(hash.split('?')[1] || ''), screen = q.get('screen');
    if (q.get('board') === 'social') {
      const target = new URLSearchParams({board:'social'}), ticker = (q.get('ticker') || '').toUpperCase();
      if (/^[A-Z][A-Z0-9.-]{0,11}$/.test(ticker)) target.set('ticker', ticker);
      return '#/boards?' + target;
    }
    if (['oversold','insider-oversold','institution-oversold'].includes(screen)) return '#/boards?screen=' + screen;
    const ticker=(q.get('ticker')||'').toUpperCase();
    const target=new URLSearchParams();
    const board=q.get('board');
    if(['all','insider','partner','political','earnings','index','news','liquidity','volscan','hiring','industry','digest','social'].includes(board))target.set('board',board);
    if (/^[A-Z][A-Z0-9.-]{0,11}$/.test(ticker)){target.set('mode','archive');target.set('ticker',ticker);}
    for (const key of ['start','end']) { const date=q.get(key)||''; if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0,10)===date) target.set(key,date); }
    return path+(target.size?'?'+target:'');
  }
  if (path === '#/briefing') {
    const query=new URLSearchParams(hash.split('?')[1] || ''),period=query.get('period');
    if(['daily','weekly'].includes(period))return '#/briefing?period='+period;
    const ticker=(query.get('ticker')||'').toUpperCase();
    return '#/briefing'+(/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker)?'?ticker='+encodeURIComponent(ticker):'');
  }
  if(path==='#/vibe'||path==='#/degen'){
    const query=new URLSearchParams(hash.split('?')[1]||''),target=new URLSearchParams();
    const ticker=(query.get('ticker')||'').toUpperCase();
    if(/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker))target.set('ticker',ticker);
    if(['hot','watchlist','all'].includes(query.get('scope')))target.set('scope',query.get('scope'));
    return path+(target.size?'?'+target:'');
  }
  if (path === '#/alerts' || path === '#/calendar') {
    const query=new URLSearchParams(hash.split('?')[1] || ''),target=new URLSearchParams();
    const ticker=(query.get('ticker')||'').toUpperCase(),date=query.get('date')||'';
    if(/^[A-Z][A-Z0-9.-]{0,11}$/.test(ticker))target.set('ticker',ticker);
    if(path==='#/calendar'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date)target.set('date',date);
    return path+(target.size?'?'+target:'');
  }
  if (SIMPLE.has(path.slice(2)) && path.startsWith("#/")) return path;
  const match = /^#\/(chart|research|evidence)(?:\/([A-Za-z0-9][A-Za-z0-9.-]{0,14}))?$/.exec(path);
  if(match?.[1]==='evidence'&&match[2])return evidenceHref(match[2],new URLSearchParams(hash.split('?')[1]||'').get('source'));
  return match ? `#/${match[1]}${match[2] ? "/" + match[2].toUpperCase() : ""}` : null;
}

export function rememberTarget(hash) {
  const target = safeTarget(hash);
  if (!target) return;
  try { window.sessionStorage.setItem(KEY, JSON.stringify({ target, at: Date.now() })); }
  catch (_) { /* Sign-in still works when browser storage is unavailable. */ }
}

export function takeTarget(fallback = "#/watchlist") {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    const saved = JSON.parse(raw);
    const age = Date.now() - saved?.at;
    if (typeof saved?.at === "number" && Number.isFinite(age) && age >= 0 && age <= MAX_AGE) {
      const target = safeTarget(saved.target);
      if (target) return target;
    }
  } catch (_) { /* A stale or malformed entry must never prevent sign-in. */ }
  return fallback;
}

export function verificationTarget() {
  const next = takeTarget(null);
  return next && next !== "#/profile" ? "#/profile?next=" + encodeURIComponent(next.slice(2)) : "#/profile";
}

export function needsEmailSetup(me) {
  return !!me && (me.profile_complete === false || me.email_verified === false);
}

// Only explicit sign-ins enter setup. An existing session may keep its deep link.
export function signedInTarget(me, next = takeTarget()) {
  const destination = safeTarget(next) || '#/watchlist';
  if (!needsEmailSetup(me)) return destination;
  return '#/profile?setup=email&next=' + encodeURIComponent(
    destination === '#/profile' ? 'watchlist' : destination.slice(2));
}
