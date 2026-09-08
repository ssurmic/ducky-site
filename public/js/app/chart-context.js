import {s} from './strings.js';
import {el,modal,num,px} from './ui.js';

export const finite=n=>typeof n==='number'&&Number.isFinite(n);
export const dateLabel=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)?d:'—';
export function expiryKind(row){
  const date=new Date(row.expiry+'T00:00:00Z');
  if(date.getUTCDay()===5&&date.getUTCDate()>=15&&date.getUTCDate()<=21)return s('chart.expiry_monthly');
  if(finite(row.dte)&&row.dte>=8&&row.dte<=14)return s('chart.expiry_fortnight');
  if(finite(row.dte)&&row.dte>=0&&row.dte<=7)return s('chart.expiry_week');
  return s('chart.expiry_later');
}
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
  return dates.length?s(dates.length===1?'chart.wall_scope_single':'chart.wall_scope',{n:dates.length,dates:dates.join(' / ')}):s('chart.wall_scope_unknown');
}
export function wallPosition(spot,gamma){
  const call=gamma?.call_wall,put=gamma?.put_wall;
  if(!finite(spot)||spot<=0||!finite(call)||!finite(put))return s('chart.position_unknown');
  if(spot>call)return s('chart.above_call',{price:px(spot),call:px(call)});
  if(spot<put)return s('chart.below_put',{price:px(spot),put:px(put)});
  return s('chart.between_walls',{call:num((call/spot-1)*100,1),put:num((1-put/spot)*100,1)});
}
export function optionHelp(snap){
  const topic=(title,...content)=>el('details.chart-help-topic',el('summary',s(title)),content);
  const source=(key,url)=>el('a',{href:url,target:'_blank',rel:'noopener noreferrer'},s(key)+' ↗');
  modal(s('chart.help_title'),el('div.chart-help',
    el('p.chart-help-fact.small.muted',optionScope(snap)),
    el('div.chart-help-pair',
      el('section.chart-help-card',el('h3',s('chart.legend_call')),el('p',s('chart.help_call'))),
      el('section.chart-help-card',el('h3',s('chart.legend_put')),el('p',s('chart.help_put')))),
    el('section.chart-help-section.chart-help-flip',el('h3',s('chart.help_flip_title')),el('p',s('chart.help_flip'))),
    topic('chart.help_break_title',el('p',s('chart.help_break'))),
    topic('chart.help_pinning_title',el('p',s('chart.help_pinning'))),
    topic('chart.help_scope_title',el('p',s('chart.help_scope')),el('p.small.muted',s('chart.help_oi'))),
    topic('chart.help_other_title',el('p',s('chart.help_other',{expiry:dateLabel(snap?.expected?.expiry)}))),
    topic('chart.help_sources',el('div.chart-help-sources',
      source('chart.help_source','https://www.optionseducation.org/referencelibrary/faq/general-information'),
      source('chart.help_gamma_source','https://www.optionseducation.org/advancedconcepts/gamma'),
      source('chart.help_break_source','https://www.cmegroup.com/education/courses/technical-analysis/support-and-resistance'),
      source('chart.help_pinning_source','https://support.spotgamma.com/hc/en-us/articles/15249421888787-Pin-Pinning-Effect-from-Gamma')))));
}
export function candleHelp(){
  const example=direction=>el('section.chart-help-card.chart-candle-example',
    el('div.chart-candle-art.'+direction,{'aria-hidden':'true'},el('i')),
    el('div',el('h3',s('chart.candle_'+direction)),el('p',s('chart.candle_'+direction+'_note'))));
  modal(s('chart.range_help'),el('div.chart-help',
    el('p.chart-help-intro',s('chart.candle_intro')),
    el('div.chart-help-pair',example('up'),example('down')),
    el('dl.chart-candle-key',['wick','body'].map(key=>el('div',el('dt',s('chart.candle_'+key)),el('dd',s('chart.candle_'+key+'_note'))))),
    el('section.chart-help-section',el('h3',s('chart.period')),el('p',s('chart.range_note'))),
    el('section.chart-help-section',el('h3',s('chart.indicator_help')),el('p',s('chart.indicator_note'))),
    el('p.small.muted',s('chart.axes'))));
}
export function expiryTable(snap,onSelect){
  const rows=snap?.gamma?.by_expiry||[];
  const attempts=snap?.gamma?.scope?.attempts||[];
  const missing=attempts.filter(a=>a.status!=='ready');
  const available=snap?.gamma?.scope?.available_expiries||[];
  const uncollected=available.filter(date=>!attempts.some(a=>a.expiry===date));
  if(!rows.length)return el('p.small.muted',s('chart.expiries_unavailable'));
  return el('details.chart-expiries',el('summary',s('chart.all_expiries',{n:available.length||rows.length})),
    el('p.small.muted',s('chart.expiry_coverage',{days:snap?.gamma?.scope?.dte_max??'—',n:snap?.gamma?.scope?.detail_max_expiries??snap?.gamma?.scope?.max_expiries??'—'})),
    el('div.chart-expiry-rows',rows.map(row=>el('button.chart-expiry-row',{type:'button',onclick:()=>onSelect(row.expiry)},
      el('span',el('strong',dateLabel(row.expiry)),el('small',expiryKind(row)),el('small',s('chart.expiry_dte',{n:row.dte}))),
      el('span',el('small',s('chart.legend_call')),el('strong',finite(row.call_wall)?px(row.call_wall):'—')),
      el('span',el('small',s('chart.legend_put')),el('strong',finite(row.put_wall)?px(row.put_wall):'—')),
      el('span',el('small',s('chart.legend_flip')),el('strong',finite(row.flip)?px(row.flip):'—'))))),
    missing.map(row=>el('p.small.muted',s('chart.expiry_missing',{date:dateLabel(row.expiry)+' · '+expiryKind(row)}))),
    uncollected.length?el('p.small.muted',s('chart.expiry_not_collected',{dates:uncollected.join(' / ')})):null,
    el('p.small.muted',s('chart.expiry_monthly_note')));
}
