import {h,t,button,link,badge,icon,money,percent,showDialog} from '../ui.js';
import {metricsFor} from '../metric-fixtures.js';
const finite=Number.isFinite;
const num=v=>finite(v)?v.toFixed(1):'—';
export const metricSortValue=(stock,key)=>key==='price'?stock.price:metricsFor(stock.ticker)?.[key];
const stamp=m=>t('metrics.recorded',{date:m.asOf});
const readRatio=m=>finite(m.ratio)?m.ratio.toFixed(2)+'×':'—';
export const referenceCondition=(stock,value)=>finite(value)&&finite(stock.price)&&value!==stock.price?(value>stock.price?'above':'below'):null;
export const referenceAction=(stock,value)=>{const condition=referenceCondition(stock,value);return condition?t('metrics.plan_'+condition,{price:money(value)}):t('metrics.choose_direction');};
const metricHref=(stock,key='')=>'#/stock/'+encodeURIComponent(stock.ticker)+'?tab=metrics'+(key?'&focus='+key:'');
function ratioNote(m){return t(!finite(m.ratio)?'metrics.missing':m.ratio<1?'metrics.iv_lower':m.ratio>1?'metrics.iv_higher':'metrics.iv_equal');}
function lensText(stock,side){return t('metrics.'+stock.ticker.toLowerCase()+'.'+side);}
export function lensPair(stock){return h('div',{class:'mx-lenses'},...['left','right'].map(side=>h('div',{},h('span',{class:'mx-lens-label'},t('metrics.'+side)),h('p',{},lensText(stock,side)),h('time',{dateTime:stock.updated},stock.updated+' · '+t('metrics.example')))));}
function help(stock,key,inMetricPage=false){
 const m=metricsFor(stock.ticker),[route,query='']=window.location.hash.split('?');
 const alreadyHere=inMetricPage||(route==='#/stock/'+encodeURIComponent(stock.ticker)&&new URLSearchParams(query).get('tab')==='metrics');
 const content=h('div',{class:'stack'},badge(t('metrics.example'),'accent'),h('p',{},t('metrics.help_'+key)),h('p',{class:'muted'},t('metrics.limit_'+key)),h('p',{class:'small muted'},stamp(m)),key==='walls'||key==='volatility'?h('p',{class:'small muted'},t('metrics.expiry',{date:m.expiry||'—'})):null);
 const dialog=showDialog({title:stock.ticker+' · '+t('metrics.'+key),content});
 if(alreadyHere)content.append(button(t('common.close'),()=>dialog.close(),'btn btn-quiet'));
 else{const target=link(t('metrics.open_named',{ticker:stock.ticker,metric:t('metrics.'+key)}),metricHref(stock,key),'btn btn-primary');target.addEventListener('click',()=>dialog.close());content.append(target);}
}
function metricButton(stock,key,main,note){return button([h('strong',{class:'mono'},main),h('span',{class:'small muted'},note)],()=>help(stock,key),'mx-cell-button');}
export function metricLinks(stock){const m=metricsFor(stock.ticker);return h('div',{class:'mx-quick'},
 link([h('span',{},t('metrics.walls')),h('strong',{class:'mono'},money(m.put)+' / '+money(m.call))],metricHref(stock,'walls'),'mx-quick-item'),
 link([h('span',{},'IV/HV20'),h('strong',{class:'mono'},readRatio(m))],metricHref(stock,'volatility'),'mx-quick-item'),
 link([h('span',{},t('metrics.degen')),h('strong',{class:'mono'},finite(m.degen)?m.degen+'/100':'—')],metricHref(stock,'degen'),'mx-quick-item'),
 link(t('metrics.all_short')+' →',metricHref(stock),'text-link'));
}
export function metricsTable(stocks,{sort,direction,onSort}){
 const columns=[['ticker','stock'],['price','quote'],[null,'lenses'],['put','walls'],['low20','support'],['ratio','volatility'],['degen','degen']];
 const table=h('table',{class:'mx-table'},h('thead',{},h('tr',{},...columns.map(([key,label])=>h('th',{scope:'col','aria-sort':key&&sort===key?(direction==='asc'?'ascending':'descending'):key?'none':null},key?h('button',{type:'button',class:'mx-sort','data-watch-sort':key,onClick:()=>onSort(key)},t('metrics.'+label),h('span',{'aria-hidden':'true'},sort===key?(direction==='asc'?' ↑':' ↓'):' ↕')):t('metrics.'+label))))));
 const body=h('tbody');table.append(body);
 for(const stock of stocks){const m=metricsFor(stock.ticker);body.append(h('tr',{},
  h('th',{scope:'row'},link(stock.ticker,'#/stock/'+stock.ticker,'mx-stock'),h('span',{class:'small muted mx-company'},stock.name),link(t('metrics.open_map'),'#/stock/'+stock.ticker+'?tab=evidence','text-link')),
  h('td',{},h('strong',{class:'mono'},money(stock.price)),h('span',{class:'small muted mx-line'},stock.updated)),
  h('td',{class:'mx-lens-cell'},lensPair(stock)),
  h('td',{},metricButton(stock,'walls',money(m.put)+' / '+money(m.call),t('metrics.put_call')),h('span',{class:'small muted'},t('metrics.expiry',{date:m.expiry||'—'}))),
  h('td',{},metricButton(stock,'support',money(m.low20),t('metrics.low20')),h('span',{class:'small muted'},t('metrics.put_reference',{price:money(m.put)}))),
  h('td',{},metricButton(stock,'volatility',readRatio(m),ratioNote(m)),h('span',{class:'small muted'},'IV '+(finite(m.iv)?num(m.iv)+'%':'—')+' · HV20 '+(finite(m.hv)?num(m.hv)+'%':'—'))),
  h('td',{},metricButton(stock,'degen',finite(m.degen)?m.degen+'/100':'—',t('metrics.attention_not_value')))));
 }
 return h('section',{class:'mx-comparison'},h('div',{class:'mx-intro'},h('p',{},t('metrics.intro')),badge(t('metrics.example'),'accent')),h('p',{class:'small muted mx-scroll-note'},t('metrics.scroll')),h('div',{class:'mx-table-scroll',tabindex:0,'aria-label':t('metrics.table_label')},table),h('p',{class:'small muted mx-foot'},t('metrics.example_notice')));
}
export function stockMetrics(stock,ctx){const m=metricsFor(stock.ticker);
 const headingId=key=>'metric-heading-'+stock.ticker+'-'+key;
 const card=(key,...children)=>h('article',{class:'panel mx-metric-card',id:'metric-'+key,'data-metric':key,tabIndex:-1,'aria-labelledby':headingId(key)},...children);
 const heading=(key)=>h('div',{class:'section-head'},h('h3',{id:headingId(key)},t('metrics.'+key)),h('button',{class:'icon-btn',type:'button','aria-label':t('metrics.help_label',{metric:t('metrics.'+key)}),onClick:()=>help(stock,key,true)},icon('info',16)));
 const fact=(label,value)=>h('div',{class:'mx-fact'},h('span',{class:'muted'},label),h('strong',{class:'mono'},value));
 const plan=(value)=>{if(!finite(value))return null;const condition=referenceCondition(stock,value);const directions=condition?[condition]:['below','above'];return h('div',{class:'mx-price-actions'},!condition?h('span',{class:'small muted'},t('metrics.choose_direction')):null,...directions.map(side=>button(t('metrics.plan_'+side,{price:money(value)}),()=>ctx.openAlert(stock.ticker,value,side),'btn btn-quiet')));};
 const panel=h('section',{class:'mx-stock-panel'},h('div',{class:'section-head'},h('h2',{},t('metrics.title')),badge(t('metrics.example'),'accent')),h('p',{class:'small muted'},t('metrics.example_notice')),lensPair(stock),h('div',{class:'mx-detail-grid'},
  card('walls',heading('walls'),fact(t('metrics.put'),money(m.put)),fact(t('metrics.call'),money(m.call)),h('p',{class:'small muted'},t('metrics.expiry',{date:m.expiry||'—'})),h('p',{},t('metrics.wall_reading')),h('div',{class:'row mx-wall-actions'},plan(m.put),plan(m.call))),
  card('support',heading('support'),fact(t('metrics.low20'),money(m.low20)),fact(t('metrics.put'),money(m.put)),fact(t('metrics.ma50'),money(m.ma50)),fact(t('metrics.ma200'),money(m.ma200)),h('p',{class:'small muted'},t('metrics.support_separate')),plan(m.low20)),
  card('volatility',heading('volatility'),h('strong',{class:'mx-big mono'},readRatio(m)),h('p',{},ratioNote(m)),fact('IV',finite(m.iv)?num(m.iv)+'%':'—'),fact('HV20',finite(m.hv)?num(m.hv)+'%':'—'),h('p',{class:'small muted'},t('metrics.expiry',{date:m.expiry||'—'})),h('p',{class:'small muted'},t('metrics.limit_volatility'))),
  card('degen',heading('degen'),h('strong',{class:'mx-big mono'},finite(m.degen)?m.degen+'/100':'—'),h('p',{},t('metrics.attention_not_value')),h('p',{class:'small muted'},t('metrics.help_degen')))),h('p',{class:'small muted mx-foot'},stamp(m)));
 const target=new URLSearchParams(window.location.hash.split('?')[1]||'').get('focus');
 if(['walls','support','volatility','degen'].includes(target)&&history.state?.duckyMetricFocus!==target){history.replaceState({...history.state,duckyMetricFocus:target},'',window.location.hash);window.requestAnimationFrame(()=>{if(!panel.isConnected)return;const section=panel.querySelector('[data-metric="'+target+'"]');section?.scrollIntoView({block:'start'});section?.focus({preventScroll:true});});}
 return panel;
}
