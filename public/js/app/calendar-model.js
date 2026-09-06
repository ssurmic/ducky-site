export function eventKind(e) {
  const hay=(e.title_en||'')+' '+(e.title||'');
  if(e.type==='earnings') return 'earnings';
  if(e.type==='opex'||e.type==='witching') return e.type;
  if(e.type==='rebal') return /month.end|月末/i.test(hay)?'month_end':'index';
  if(e.type!=='macro') return 'other';
  if(/productivity|生产率|continuing|续请|minutes|纪要|speech|讲话|speaks|testimony/i.test(hay)) return 'other';
  for(const [kind,re] of [
    ['adp',/\bADP\b|小非农/i],['cpi',/\bCPI\b/i],['ppi',/\bPPI\b/i],['pce',/\bPCE\b/i],
    ['nfp',/非农|\bNFP\b|nonfarm|payroll|employment situation/i],['claims',/初请|jobless|claims/i],
    ['retail',/零售|retail/i],['gdp',/\bGDP\b/i],
    ['fomc',/FOMC|利率决议|议息|rate decision|federal funds/i],['pmi',/\bPMI\b|\bISM\b/i]]) if(re.test(hay)) return kind;
  return 'other';
}
export function calendarEventKey(e) {
  const kind=eventKind(e), hay=(e.title_en||e.title||'').trim().toLowerCase();
  const precise=['other','pmi','index'].includes(kind)?hay:kind;
  const issuers=kind==='earnings'?(e.tickers||[]).slice().sort().join(','):'';
  return [e.date,e.type,precise,issuers].join('|');
}
