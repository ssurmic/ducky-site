import {el, pct, modal} from './ui.js';
import {s, LANG} from './strings.js';

export const metricKeys=['ytd','drawdown','relative','iv_hv','attention','degen'];
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const copy={ytd:'watch.metric_ytd',drawdown:'watch.metric_drawdown',relative:'watch.metric_relative',iv_hv:'watch.metric_iv_hv',attention:'watch.metric_attention',degen:'watch.metric_degen'};
const stateCopy={missing:'watch.metric_missing',not_observed:'watch.metric_uncovered',insufficient:'watch.metric_insufficient',stale:'watch.metric_stale',outside_latest_sample:'watch.metric_previous_sample',expired:'watch.metric_expired',benchmark_changed:'watch.metric_benchmark_changed'};
const date=at=>at?.slice(0,10)||'—';
export const metricLabel=key=>s(copy[key]);
export const metricSortValue=(row,key)=>{
  const m=row.metrics?.[key];return (m?.status==='ready'||key==='ytd'&&m?.status==='retained')&&finite(m.value)?m.value:null;
};

// A "?" beside each metric header opens the plain-language explanation and the method text; the
// cells themselves carry the number, one short qualifier at most, and the exact state as a title.
export function metricHelpButton(key){
  return el('button.watch-signal-help',{type:'button','aria-label':s('watch.metric_help_label',{column:metricLabel(key)}),'data-reading-key':'metric-help:'+key,
    onclick:()=>modal(metricLabel(key),el('div.watch-signal-help-body',el('p',s('watch.metric_help_'+key)),
      el('p.small.muted',s(['attention','degen'].includes(key)?'watch.metric_method_social':key==='iv_hv'?'watch.metric_method_vol':'watch.metric_method_prices')),
      el('p.small.muted',s('watch.metric_help_states'))))},'?');
}

export function metricCell(key,m={}) {
  const valid=finite(m.value),ready=m.status==='ready';
  let value='—',note='',tone='';
  if(valid){
    if(['ytd','drawdown'].includes(key))value=pct(m.value,1);
    if(key==='relative')value=s('watch.metric_pp',{n:(m.value>0?'+':'')+m.value.toFixed(1)});
    if(key==='iv_hv')value=m.value.toFixed(2)+'×';
    if(key==='attention')value=new Intl.NumberFormat(LANG==='zh'?'zh-CN':'en-US').format(m.value);
    if(key==='degen')value=m.value.toFixed(0);
    if(ready&&['ytd','drawdown','relative'].includes(key))tone=m.value>0?'watch-up':m.value<0?'watch-down':'watch-flat';
    if(ready&&key==='degen'&&['elevated','overheated'].includes(m.level))tone='watch-attention-high';
  }
  // Only a qualifier that changes the reading stays in the cell: the comparison basket and the
  // IV-versus-HV direction. Basis notes ("year to date · adjusted", "closing high") live in the header help.
  if(key==='relative'){const refs=m.symbols||[];note=refs.slice(0,2).join(' / ')+(refs.length>2?' +'+(refs.length-2):'')||s('watch.metric_reference');}
  if(key==='iv_hv'&&valid)note=s(m.value<1?'watch.metric_iv_lower':m.value>1?'watch.metric_iv_higher':'watch.metric_iv_equal');
  const state=m.status||'missing';
  const reasonCopy={anchor_missing:'watch.ytd_anchor_missing',latest_session_missing:'watch.ytd_close_pending',adjustment_vintage_mismatch:'watch.ytd_adjustment_pending'};
  const status=ready?'':s(key==='ytd'&&state==='retained'?'watch.ytd_retained':key==='ytd'&&reasonCopy[m.reason]||stateCopy[state]||stateCopy.missing);
  // An unavailable or dated value keeps its exact state and date in the title (and in the method
  // disclosure below the table) rather than as a second and third line in every cell.
  const title=[ready?'':status+(m.as_of?' · '+date(m.as_of):''),key==='iv_hv'&&valid&&m.expiry?s('watch.metric_expiry',{date:m.expiry}):''].filter(Boolean).join(' · ');
  // A saved year-to-date return is the one value whose date changes the reading: it keeps its
  // "saved · date" line in the cell.
  const retained=key==='ytd'&&state==='retained'&&valid;
  return el('span.watch-metric',{'data-metric':key,'data-status':state,...(title&&!retained?{title}:{})},
    el('span.watch-metric-label',metricLabel(key)),
    el('strong.watch-metric-value',{class:tone,...(title&&!retained?{'aria-label':value+' · '+title}:{})},value),
    note?el('span.watch-metric-note',note):null,
    retained?el('span.watch-metric-status',status,el('time.watch-metric-date',{datetime:m.as_of},date(m.as_of))):null);
}

export function metricMethods(rows){
  return el('details.watch-metric-method',{'data-disclosure':'metrics'},el('summary',s('watch.metric_method')),
    el('p.small.muted',s('watch.metric_method_prices')),
    el('p.small.muted',s('watch.metric_method_vol')),
    el('p.small.muted',s('watch.metric_method_social')),
    ...rows.map(row=>el('details.watch-metric-source',{'data-disclosure':'metrics:'+row.ticker},el('summary',row.ticker),
      el('dl',...metricKeys.flatMap(key=>{const m=row.metrics?.[key]||{};return[
        el('dt',metricLabel(key)),el('dd',s('watch.metric_asof',{date:date(m.as_of)}),
          m.recorded_at?' · '+s('watch.metric_saved',{date:m.recorded_at.replace('T',' ').replace(/\..*|\+00:00|Z/g,'')+' UTC'}):'',
          key==='iv_hv'&&finite(m.iv)&&finite(m.hv)?` · IV ${m.iv}% / HV20 ${m.hv}% · ${s('watch.metric_expiry',{date:m.expiry||'—'})}`:'',
          key==='relative'&&m.symbols?.length?' · '+m.symbols.join(' / '):'',
          key==='ytd'&&m.start?' · '+m.start+' → '+date(m.as_of):'',
          key==='ytd'&&m.status==='retained'?' · '+s('watch.ytd_retained_detail'):'')];})),
      el('a',{href:'#/evidence/'+encodeURIComponent(row.ticker)},s('watch.open_map')))));
}
