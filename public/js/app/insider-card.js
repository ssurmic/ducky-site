// Saved Form 4 facts only. No quotes, prose extraction or inferred holdings.
import {el,px} from './ui.js';
import {s,LANG} from './strings.js';
import {recordHref} from './record-format.js';
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const text=value=>typeof value==='string'?value.trim():'';
const clean=value=>text(value).replace(/\s+/g,' ').toLowerCase();
const taxSale=tx=>tx?.side==='sell'&&tx.purpose_rule==='form4-purpose/1'&&tx.transaction_purpose==='tax_related_sale'&&Array.isArray(tx.purpose_evidence)&&tx.purpose_evidence.some(note=>text(note?.id)&&text(note?.text));
const capBands=[['micro',0,3e8],['small',3e8,2e9],['mid',2e9,1e10],['large',1e10,2e11],['mega',2e11,Infinity]];
export function insiderMetrics(row){
 const facts=row.extra?.facts||{},txs=Array.isArray(facts.transactions)?facts.transactions:[],m=facts.trade_metrics;
 const result={price:null,priceBasis:null,currency:null,security:null,holdingPct:null,reason:'not_complete',taxRelated:facts.side==='sell'&&txs.some(taxSale),taxWhole:facts.side==='sell'&&m?.schema==='form4-trade-metrics/1'&&m.complete===true&&m.transaction_count===txs.length&&txs.length>0&&txs.every(taxSale)};
 const single=txs.length===1?txs[0]:null;
 if(single&&finite(single.price)&&single.price>0&&finite(single.shares)&&single.shares>0&&text(single.security)){
  result.price=single.price;result.priceBasis='line';result.security=text(single.security);
  // Old rows do not carry a currency receipt; don't borrow the ticker's quote currency.
 }
 if(m?.schema!=='form4-trade-metrics/1')return result;
 // A recognized projection owns missing/unsupported states; never backfill over it.
 result.price=null;result.priceBasis=null;result.currency=null;result.security=text(m.security_title)||null;
 const count=m.transaction_count,security=text(m.security_title);
 const priced=txs.length>0&&txs.every(tx=>tx&&finite(tx.shares)&&tx.shares>0&&finite(tx.price)&&tx.price>0&&clean(tx.security)===clean(security)&&tx.side===facts.side);
 const shares=priced?txs.reduce((sum,tx)=>sum+tx.shares,0):null;
 const value=priced?txs.reduce((sum,tx)=>sum+tx.shares*tx.price,0):null;
 const currency=m.currency==='USD'&&m.currency_basis==='form4_instruction_5';
 if(m.complete===true&&m.price_status==='eligible'&&currency&&security&&Number.isInteger(count)&&count>0&&m.priced_transaction_count===count&&count===txs.length&&priced&&finite(shares)&&shares>0&&finite(value)&&finite(m.priced_shares)&&Math.abs(shares-m.priced_shares)<=Math.max(1e-8,shares*1e-8)&&finite(m.weighted_avg_price)&&m.weighted_avg_price>0&&Math.abs(value/shares-m.weighted_avg_price)<=Math.max(1e-8,m.weighted_avg_price*1e-8)){
  result.price=value/shares;result.priceBasis='weighted';result.security=security;result.currency='USD';result.reason=null;
 }
 if(facts.side==='sell'&&m.held_pct_status==='eligible'&&m.held_pct_basis==='single_sale_reported_scope'&&finite(m.held_pct)&&m.held_pct>=0&&m.held_pct<=100&&text(m.owner_scope)&&text(m.security_title)&&m.ownership==='D'&&txs.length===1&&single?.side==='sell'&&single?.ownership==='D'&&clean(single?.security)===clean(m.security_title)&&finite(single?.shares)&&Math.abs(single.shares-m.shares_sold)<=Math.max(1e-8,m.shares_sold*1e-8)&&finite(m.shares_sold)&&m.shares_sold>0&&finite(m.shares_owned_after)&&m.shares_owned_after>=0&&Math.abs(m.held_pct-100*m.shares_sold/(m.shares_sold+m.shares_owned_after))<1e-6)result.holdingPct=m.held_pct;
 return result;
}
export function insiderCard(row,item,doc,{language=LANG}={}){
 const data=insiderMetrics(row),locale=language==='en'?'en-US':'zh-CN';
 const number=value=>new Intl.NumberFormat(locale,{maximumFractionDigits:2,minimumFractionDigits:2}).format(value);
 const cap=finite(row.market_cap)&&row.market_cap>=0?capBands.find(([,lo,hi])=>row.market_cap>=lo&&row.market_cap<hi)?.[0]:null;
 const amount=item.metric===null?'—':px(item.metric),action=item.action==='buy'?'buy':item.action==='sell'?'sell':'other';
 const roles=[...new Set(item.actorRoles)].join(' / '),issuer=row.issuer_name||row.company||row.extra?.facts?.company||null;
 const price=data.price===null?'—':(data.currency==='USD'?'$':'')+number(data.price);
 const metric=(label,value,className='')=>el('span.insider-fact',el('span.small.muted',label),el('strong',{class:className},value));
 const dates=[...new Set((Array.isArray(row.extra?.facts?.transactions)?row.extra.facts.transactions:[]).map(tx=>tx?.date).filter(value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)))].sort();
 const tradeDate=dates.length>1?dates[0]+' – '+dates.at(-1):dates[0]||'—';
 const title=el('a.radar-record-toggle.insider-card-main',{href:recordHref(row),'data-tour':doc.hasBody?'insider.open':null},
  el('span.insider-card-heading',el('strong.radar-ticker',item.ticker?el('span.ticker-symbol',item.ticker):doc.title),
   issuer?el('span.insider-issuer',issuer):null,
   el('span.radar-action',{class:action==='buy'?'is-purchase':action==='sell'?'is-sale':''},s('insider.direction_'+action)),
   el('strong.insider-amount',{class:action==='buy'?'pos':action==='sell'?'neg':''},amount)),
  el('span.insider-person',el('strong',item.actor||s('radar.ux.actor_unknown')),roles?el('span.muted',roles):null),
  data.taxRelated?el('span.insider-purpose',s(data.taxWhole?'insider.tax_related_all':'insider.tax_related')):null,
  el('span.insider-facts',metric(s('insider.price_'+(data.priceBasis||'missing')),price),
   ...(action==='sell'?[metric(s('insider.holding_sold'),data.holdingPct===null?'—':number(data.holdingPct)+'%')]:[]),
   el('span.insider-cap',{title:cap?s('radar.cap_'+cap)+(row.company_as_of?' · '+row.company_as_of:''):s('radar.cap_unknown')},s('insider.cap_'+(cap||'unknown')))),
  el('span.insider-security.small.muted',data.security?s('insider.security_unit',{security:data.security}):s('insider.price_unavailable'),
   data.price!==null&&!data.currency?' · '+s('insider.currency_unknown'):null,
   action==='sell'&&data.holdingPct===null?' · '+s('insider.holding_unknown'):null),
  el('span.radar-activity-dates.small.muted',el('span',s('radar.ux.transaction_date')+' '+tradeDate),el('span',s('radar.ux.published_date')+' '+(item.publishedDate||s('radar.publication_unknown')))),
  item.dateReviewRequired?el('span.small.radar-date-review',s('radar.ux.date_review')):null);
 const links=el('nav.radar-activity-links',{'aria-label':item.ticker?s('radar.ux.stock_links',{ticker:item.ticker}):s('reader.open')},
  el('a',{href:recordHref(row)},s('insider.full_record')),
  item.stockEligible?el('a',{href:'#/stock/'+encodeURIComponent(item.ticker)+'?from=boards'},s('radar.ux.stock_overview')):null,
  item.stockEligible?el('a',{href:'#/stock/'+encodeURIComponent(item.ticker)+'?from=boards&tab=evidence'},s('radar.ux.stock_map')):null);
 return el('article.radar-record.radar-activity-record.insider-record',{'data-record-id':row.id||''},title,links);
}
