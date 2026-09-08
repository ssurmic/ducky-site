import {s} from './strings.js';
import {el,modal,num,px} from './ui.js';

export const finite=n=>typeof n==='number'&&Number.isFinite(n);
export const dateLabel=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)?d:'—';
export function aggregateBars(bars,interval='day'){
  if(interval==='day')return bars;
  const groups=new Map();
  for(const bar of bars){
    const d=new Date(typeof bar.time==='number'?bar.time*1000:bar.time+'T00:00:00Z');
    if(!Number.isFinite(d.getTime()))continue;
    if(interval==='week')d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);else d.setUTCDate(1);
    const key=d.toISOString().slice(0,10),old=groups.get(key);
    if(old){old.high=Math.max(old.high,bar.high);old.low=Math.min(old.low,bar.low);old.close=bar.close;old.volume+=bar.volume||0;}
    else groups.set(key,{...bar,time:key});
  }
  return [...groups.values()];
}
export function selectedSnapshot(snapshot,expiry='combined',extras=false){
  const selected=snapshot?.gamma?.by_expiry?.find(r=>r.expiry===expiry);
  return {...snapshot,gamma:selected?{...selected,scope:{...snapshot.gamma.scope,expiries:[selected.expiry]}}:snapshot?.gamma,
    expected:extras?snapshot?.expected:null,retrace:extras?snapshot?.retrace:null};
}
export function optionScope(snap){
  const dates=snap?.gamma?.scope?.expiries?.filter(d=>dateLabel(d)!=='—')||[];
  return dates.length?s('chart.wall_scope',{n:dates.length,dates:dates.join(' / ')}):s('chart.wall_scope_unknown');
}
export function wallPosition(spot,gamma){
  const call=gamma?.call_wall,put=gamma?.put_wall;
  if(!finite(spot)||spot<=0||!finite(call)||!finite(put))return s('chart.position_unknown');
  if(spot>call)return s('chart.above_call',{price:px(spot),call:px(call)});
  if(spot<put)return s('chart.below_put',{price:px(spot),put:px(put)});
  return s('chart.between_walls',{call:num((call/spot-1)*100,1),put:num((1-put/spot)*100,1)});
}
export function optionHelp(snap){
  modal(s('chart.help_title'),el('div.chart-help',
    el('h3',s('chart.legend_call')),el('p',s('chart.help_call')),
    el('h3',s('chart.legend_put')),el('p',s('chart.help_put')),
    el('h3',s('chart.help_break_title')),el('p',s('chart.help_break')),
    el('h3',s('chart.help_scope_title')),el('p',optionScope(snap)),el('p',s('chart.help_scope')),
    el('p.small.muted',s('chart.help_oi')),
    el('h3',s('chart.help_other_title')),el('p',s('chart.help_other',{expiry:dateLabel(snap?.expected?.expiry)})),
    el('a',{href:'https://www.optionseducation.org/referencelibrary/faq/general-information',target:'_blank',rel:'noopener noreferrer'},s('chart.help_source')+' ↗')));
}
export function expiryTable(snap,onSelect){
  const rows=snap?.gamma?.by_expiry||[];
  if(!rows.length)return el('p.small.muted',s('chart.expiries_unavailable'));
  return el('details.chart-expiries',el('summary',s('chart.all_expiries',{n:rows.length})),
    el('p.small.muted',s('chart.expiry_coverage',{days:snap?.gamma?.scope?.dte_max??'—'})),
    el('div.chart-expiry-rows',rows.map(row=>el('button.chart-expiry-row',{type:'button',onclick:()=>onSelect(row.expiry)},
      el('span',el('strong',dateLabel(row.expiry)),el('small',s('chart.expiry_dte',{n:row.dte}))),
      el('span',el('small',s('chart.legend_call')),el('strong',finite(row.call_wall)?px(row.call_wall):'—')),
      el('span',el('small',s('chart.legend_put')),el('strong',finite(row.put_wall)?px(row.put_wall):'—')),
      el('span',el('small',s('chart.legend_flip')),el('strong',finite(row.flip)?px(row.flip):'—'))))));
}
