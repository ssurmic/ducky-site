import {h,t,button,link,badge,icon,money,percent,showDialog} from '../ui.js';
import {metricsFor} from '../metric-fixtures.js';
const finite=Number.isFinite;
const num=v=>finite(v)?v.toFixed(1):'—';
export const metricSortValue=(stock,key)=>key==='price'?stock.price:metricsFor(stock.ticker)?.[key];
const stamp=m=>t('metrics.recorded',{date:m.asOf});
const readRatio=m=>finite(m.ratio)?m.ratio.toFixed(2)+'×':'—';
function ratioNote(m){return t(!finite(m.ratio)?'metrics.missing':m.ratio<1?'metrics.iv_lower':m.ratio>1?'metrics.iv_higher':'metrics.iv_equal');}
function lensText(stock,side){return t('metrics.'+stock.ticker.toLowerCase()+'.'+side);}
export function lensPair(stock){return h('div',{class:'mx-lenses'},...['left','right'].map(side=>h('div',{},h('span',{class:'mx-lens-label'},t('metrics.'+side)),h('p',{},lensText(stock,side)),h('time',{dateTime:stock.updated},stock.updated+' · '+t('metrics.example')))));}
function help(stock,key){const m=metricsFor(stock.ticker);showDialog({title:stock.ticker+' · '+t('metrics.'+key),content:h('div',{class:'stack'},badge(t('metrics.example'),'accent'),h('p',{},t('metrics.help_'+key)),h('p',{class:'muted'},t('metrics.limit_'+key)),h('p',{class:'small muted'},stamp(m)),key==='walls'||key==='volatility'?h('p',{class:'small muted'},t('metrics.expiry',{date:m.expiry||'—'})):null,link(t('metrics.all_details'),'#/stock/'+stock.ticker+'?tab=metrics','btn btn-primary'))});}
function metricButton(stock,key,main,note){return button([h('strong',{class:'mono'},main),h('span',{class:'small muted'},note)],()=>help(stock,key),'mx-cell-button');}
export function metricLinks(stock){const m=metricsFor(stock.ticker);return h('div',{class:'mx-quick'},
 link([h('span',{},t('metrics.walls')),h('strong',{class:'mono'},money(m.put)+' / '+money(m.call))],'#/stock/'+stock.ticker+'?tab=metrics','mx-quick-item'),
 link([h('span',{},'IV/HV20'),h('strong',{class:'mono'},readRatio(m))],'#/stock/'+stock.ticker+'?tab=metrics','mx-quick-item'),
 link([h('span',{},t('metrics.degen')),h('strong',{class:'mono'},finite(m.degen)?m.degen+'/100':'—')],'#/stock/'+stock.ticker+'?tab=metrics','mx-quick-item'),
 link(t('metrics.all_short')+' →','#/stock/'+stock.ticker+'?tab=metrics','text-link'));
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
 const heading=(key)=>h('div',{class:'section-head'},h('h3',{},t('metrics.'+key)),h('button',{class:'icon-btn',type:'button','aria-label':t('metrics.help_label',{metric:t('metrics.'+key)}),onClick:()=>help(stock,key)},icon('info',16)));
 const fact=(label,value)=>h('div',{class:'mx-fact'},h('span',{class:'muted'},label),h('strong',{class:'mono'},value));
 const plan=(value)=>finite(value)?button(t('metrics.plan_at',{price:money(value)}),()=>ctx.openAlert(stock.ticker,value),'btn btn-quiet'):null;
 return h('section',{class:'mx-stock-panel'},h('div',{class:'section-head'},h('h2',{},t('metrics.title')),badge(t('metrics.example'),'accent')),h('p',{class:'small muted'},t('metrics.example_notice')),lensPair(stock),h('div',{class:'mx-detail-grid'},
  h('article',{class:'panel'},heading('walls'),fact(t('metrics.put'),money(m.put)),fact(t('metrics.call'),money(m.call)),h('p',{class:'small muted'},t('metrics.expiry',{date:m.expiry||'—'})),h('p',{},t('metrics.wall_reading')),h('div',{class:'row'},plan(m.put),plan(m.call))),
  h('article',{class:'panel'},heading('support'),fact(t('metrics.low20'),money(m.low20)),fact(t('metrics.put'),money(m.put)),fact(t('metrics.ma50'),money(m.ma50)),fact(t('metrics.ma200'),money(m.ma200)),h('p',{class:'small muted'},t('metrics.support_separate')),plan(m.low20)),
  h('article',{class:'panel'},heading('volatility'),h('strong',{class:'mx-big mono'},readRatio(m)),h('p',{},ratioNote(m)),fact('IV',finite(m.iv)?num(m.iv)+'%':'—'),fact('HV20',finite(m.hv)?num(m.hv)+'%':'—'),h('p',{class:'small muted'},t('metrics.expiry',{date:m.expiry||'—'})),h('p',{class:'small muted'},t('metrics.limit_volatility'))),
  h('article',{class:'panel'},heading('degen'),h('strong',{class:'mx-big mono'},finite(m.degen)?m.degen+'/100':'—'),h('p',{},t('metrics.attention_not_value')),h('p',{class:'small muted'},t('metrics.help_degen')))),h('p',{class:'small muted mx-foot'},stamp(m)));
}
