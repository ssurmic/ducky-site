// One stock uses the same overview metrics as Watchlist, plus the saved chart snapshot.
// Display clocks remain separate; reading this module never calculates or writes research.
import {el,px,num} from './ui.js';
import {s} from './strings.js';
import {metricKeys,metricCell,metricHelpButton,metricMethods} from './watchlist-metrics.js';
import {optionScope,optionHelp,finite,expiryTable} from './chart-context.js';
import {localTime} from './stock-reading.js';

export function alertReference(ticker,value,direction){
  const query=new URLSearchParams({ticker});
  if(finite(value)&&value>0&&['above','below'].includes(direction)){
    query.set('price',String(value));query.set('direction',direction);
  }
  return '#/alerts?'+query;
}
export function priceReferencePlan(ticker,from='watchlist'){
  return el('section.stock-reference-plan',{'data-reading-key':ticker+':plan',id:'stock-plan','data-metric-focus':'plan',tabindex:'-1'},
    el('h2',s('stockux.plan')),el('p',s('stockux.plan_note')),
    el('div.stock-plan-actions',el('a.btn.btn-primary',{href:'#/stock/'+ticker+'?from='+encodeURIComponent(from)+'&tab=metrics&focus=support'},s('stockux.check_references')),
      el('a.btn.btn-ghost',{href:'#/alerts?ticker='+ticker},s('focus.alert_short'))));
}
export function stockMetrics(ticker,price,snapshot,{pending=false,queued=false,error=false,onRetry}={}){
  const root=el('section.stock-metrics',el('h2',s('stockux.metrics')),el('p.small.muted',s('stockux.metrics_intro')));
  const cards=el('div.stock-metric-grid');
  for(const key of metricKeys)cards.append(el('section.stock-metric-card',{'data-metric':key},
    el('h3',s('watch.metric_'+key),metricHelpButton(key)),metricCell(key,price?.metrics?.[key]||{})));
  root.append(cards,metricMethods([{...price,ticker}]));
  if(price?.price_session)root.append(el('p.small.muted',s('stockux.close_basis',{date:price.price_session})));
  if(pending)root.append(el('p',{role:'status'},s(queued?'stockux.snapshot_pending':'stockux.snapshot_loading')));
  if(error)root.append(el('p.data-notice',{role:'status'},s('stockux.snapshot_error')));
  if((pending||error)&&onRetry)root.append(el('button.btn.btn-ghost',{type:'button',onclick:onRetry},s('common.retry')));
  const snap=snapshot?.ok?snapshot:null;
  const section=(key)=>el('section.stock-metric-section',{'data-reading-key':ticker+':'+key,'data-metric-focus':key,tabindex:'-1'},el('h2',s('stockux.'+key)));
  const value=(label,v,format=px)=>el('div.stock-level',el('span',label),el('strong',finite(v)?format(v):'—'));
  const walls=section('walls'),g=snap?.gamma||{};
  walls.append(el('p.small.muted',optionScope(snap)),value(s('chart.legend_put'),g.put_wall),value(s('chart.legend_call'),g.call_wall),
    el('button.btn.btn-ghost',{type:'button',onclick:()=>optionHelp(snap||{})},s('chart.guide')));
  if(snap)walls.append(expiryTable(snap,()=>{location.hash='#/chart/'+ticker;}));
  const support=section('support'),range=snap?.retrace?.d20||{};
  support.append(el('p.small.muted',s('stockux.support_note')),value(s('stockux.range_low'),range.lo),value(s('stockux.range_high'),range.hi));
  // A reference starts an editable draft only. Its direction is chosen explicitly by the reader.
  for(const [label,v]of [[s('chart.legend_put'),g.put_wall],[s('stockux.range_low'),range.lo]])if(finite(v)&&v>0)
    support.append(el('div.stock-level-alert',el('span',label+' '+px(v)),
      el('a',{href:alertReference(ticker,v,'below')},s('stockux.alert_below')),
      el('a',{href:alertReference(ticker,v,'above')},s('stockux.alert_above'))));
  const volatility=section('volatility'),vol=snap?.vol||{};
  volatility.append(el('p.small.muted',s('stockux.volatility_note')),
    value('IV',vol.iv,v=>num(v,1)+'%'),value('HV',vol.hv,v=>num(v,1)+'%'),value('IV/HV',vol.ratio,v=>num(v,2)));
  if(!pending&&!snap)root.append(el('p.data-notice',s('stockux.snapshot_missing')));
  root.append(el('div.stock-reference-grid',walls,support,volatility));
  if(snap)root.append(el('p.small.muted.stock-snapshot-clock',s('stockux.snapshot_basis',{date:localTime(snap.built_at)})));
  if(snap?.gamma?.scope?.retrieved_at)root.append(el('p.small.muted',s('stockux.options_basis',{date:localTime(snap.gamma.scope.retrieved_at)})));
  root.append(el('a.btn.btn-ghost',{href:'#/chart/'+ticker},s('stockux.chart_more')),el('p.small.muted',s('stockux.market_context'),el('a',{href:'#/today'},s('nav.today'))));
  return root;
}
