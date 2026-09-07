import {el,clear,px,num} from './ui.js';
import {s} from './strings.js';
import {expiryLabel} from './option-model.js';

export function renderOptionPanel(host,view,onSelect,controls=host) {
  clear(host);
  if(controls!==host)clear(controls);
  if(!view.items.length){host.append(el('p.small.data-notice',s('option.unavailable')));return;}
  const {row,context}=view;
  const select=el('select.input',{'aria-label':s('option.expiry'),onchange:()=>onSelect(select.value)},
    ...view.items.map(item=>el('option',{value:item.expiry},expiryLabel(item.expiry,Date.now(),true))));
  select.value=row.expiry;
  select.title=expiryLabel(row.expiry);
  controls.append(el('div.option-heading',el('label',el('span.small.muted',s('option.expiry')),select)));
  host.append(el('p.small.muted.option-stamp',expiryLabel(row.expiry)));
  const stamp=Date.parse(context.observed_at);
  if(Number.isFinite(stamp))host.append(el('p.small.muted.option-stamp',s('option.observed',{date:new Date(stamp).toISOString().slice(0,16).replace('T',' ')+' UTC'})));
  host.append(el('p.small.muted.option-stamp',s('option.reference_price',{price:px(context.spot)})));
  if(view.status!=='ready')host.append(el('p.small.data-notice',s('option.status_'+view.status)));
  if(view.status==='unavailable')return;
  const metrics=el('div.option-metrics');
  for(const side of ['call','put'])metrics.append(el('div.option-metric',el('span.small.muted',s('option.'+side)),
    el('strong',px(row[side+'_wall'])),el('small.muted',s('option.oi',{n:num(row[side+'_wall_oi'],0)}))));
  metrics.append(el('div.option-metric',el('span.small.muted',s('option.max_pain')),el('strong',px(row.max_pain)),
    el('small.muted',row.max_pain_strikes?.length>1?s('option.tied'):s('option.payout'))));
  host.append(metrics);
  if(row.expected)host.append(el('p.small.option-range',s('option.range',{low:px(row.expected.low),high:px(row.expected.high),expiry:row.expiry})));
  const details=el('details.option-method',el('summary',s('option.method')),el('p.small',s('option.method_body')),
    el('p.small',s('option.coverage',{n:row.coverage?.gamma_rows??'—',total:row.coverage?.received??'—'})),
    el('p.small',s('option.oi_date')),el('p.small',s('option.snapshot_note')));
  if(row.expected)details.append(el('p.small',s('option.basis_'+row.expected.method)));
  if(row.max_pain_strikes?.length>1)details.append(el('p.small',s('option.tied')+' '+row.max_pain_strikes.map(v=>px(v)).join(' · ')));
  const strikes=(row.strikes||[]).slice().sort((a,b)=>Math.abs(a.strike-context.spot)-Math.abs(b.strike-context.spot)).slice(0,15).sort((a,b)=>a.strike-b.strike);
  if(strikes.length){
    const table=el('table.option-oi-table',el('caption',s('option.nearby')),
      el('thead',el('tr',...['strike','call_oi','put_oi'].map(k=>el('th',{scope:'col'},s('option.'+k))))));
    const tbody=el('tbody');
    for(const r of strikes)tbody.append(el('tr',el('th',{scope:'row'},px(r.strike)),el('td',num(r.call_oi,0)),el('td',num(r.put_oi,0))));
    table.append(tbody);
    details.append(table);
  }
  if(context.source_url?.startsWith('https://finance.yahoo.com/'))details.append(el('a.small',{href:context.source_url,target:'_blank',rel:'noopener noreferrer'},s('stockbrief.source')+' ↗'));
  host.append(details);
}
