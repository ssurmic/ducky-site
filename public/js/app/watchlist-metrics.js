import {el, pct} from './ui.js';
import {s, LANG} from './strings.js';

export const metricKeys=['ytd','drawdown','relative','iv_hv','attention','degen'];
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const copy={ytd:'watch.metric_ytd',drawdown:'watch.metric_drawdown',relative:'watch.metric_relative',iv_hv:'watch.metric_iv_hv',attention:'watch.metric_attention',degen:'watch.metric_degen'};
const stateCopy={missing:'watch.metric_missing',not_observed:'watch.metric_uncovered',insufficient:'watch.metric_insufficient',stale:'watch.metric_stale',outside_latest_sample:'watch.metric_previous_sample',expired:'watch.metric_expired',benchmark_changed:'watch.metric_benchmark_changed'};
const date=at=>at?.slice(0,10)||'—';
export const metricLabel=key=>s(copy[key]);
export const metricSortValue=(row,key)=>{
  const m=row.metrics?.[key];return m?.status==='ready'&&finite(m.value)?m.value:null;
};

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
  if(key==='ytd')note=s('watch.metric_ytd_basis');
  if(key==='drawdown')note=s('watch.metric_close_high');
  if(key==='relative')note=(m.symbols||[]).join(' / ')||s('watch.metric_reference');
  if(key==='iv_hv'&&valid)note=s(m.value<1?'watch.metric_iv_lower':m.value>1?'watch.metric_iv_higher':'watch.metric_iv_equal')+(m.expiry?' · '+m.expiry.slice(5).replace('-','/'):'');
  if(key==='attention')note=s('watch.metric_reddit');
  if(key==='degen')note=s('watch.metric_score');
  const state=m.status||'missing';
  const status=ready?'':s(stateCopy[state]||stateCopy.missing);
  return el('span.watch-metric',{'data-metric':key,'data-status':state},
    el('span.watch-metric-label',metricLabel(key)),
    el('strong.watch-metric-value',{class:tone},value),
    el('span.watch-metric-note',valid?note:status),
    valid&&!ready?el('span.watch-metric-status',status+' · '+date(m.as_of)):null);
}

export function metricMethods(rows){
  return el('details.watch-metric-method',el('summary',s('watch.metric_method')),
    el('p.small.muted',s('watch.metric_method_prices')),
    el('p.small.muted',s('watch.metric_method_vol')),
    el('p.small.muted',s('watch.metric_method_social')),
    ...rows.map(row=>el('details.watch-metric-source',el('summary',row.ticker),
      el('dl',...metricKeys.flatMap(key=>{const m=row.metrics?.[key]||{};return[
        el('dt',metricLabel(key)),el('dd',s('watch.metric_asof',{date:date(m.as_of)}),
          m.recorded_at?' · '+s('watch.metric_saved',{date:m.recorded_at.replace('T',' ').replace(/\..*|\+00:00|Z/g,'')+' UTC'}):'',
          key==='iv_hv'&&finite(m.iv)&&finite(m.hv)?` · IV ${m.iv}% / HV20 ${m.hv}% · ${s('watch.metric_expiry',{date:m.expiry||'—'})}`:'',
          key==='relative'&&m.symbols?.length?' · '+m.symbols.join(' / '):'',
          key==='ytd'&&m.start?' · '+m.start+' → '+date(m.as_of):'')];})),
      el('a',{href:'#/evidence/'+encodeURIComponent(row.ticker)},s('watch.open_map')))));
}
