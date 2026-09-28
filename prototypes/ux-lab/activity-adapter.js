// Presentation-only projection of existing Radar archive rows. No requests or inference.
export const ACTIVITY_KINDS={all:['insider','cluster','13f','political','partner','stake','news','index'],insider:['insider','cluster'],holdings:['13f'],political:['political'],company:['partner','stake','news','index']};
const finite=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}/.test(value)?value.slice(0,10):null;
const safeUrl=value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null;}catch{return null;}};
export function activityRecord(row,language='zh'){
 const extra=row.extra||{},facts=extra.facts||{},structured=Boolean(row.provenance)&&!String(row.id).startsWith('s:');
 // Explicitly missing source time wins over observation/legacy clocks.
 const publication=Object.hasOwn(extra,'source_published_at')?extra.source_published_at:
  Object.hasOwn(row,'source_published_at')?row.source_published_at:
  extra.publication_basis==='first_observed'?null:row.published_at||extra.published_at||facts.filing_date||(structured?row.ts:null);
 const category=Object.keys(ACTIVITY_KINDS).find(k=>k!=='all'&&ACTIVITY_KINDS[k].includes(row.kind))||null;
 const transactions=Array.isArray(facts.transactions)?facts.transactions:[];
 const transactionDates=[...new Set(transactions.map(tx=>date(tx.date)).filter(Boolean))];
 let action='record',metric=null,metricType='unknown',transactionDate=null,reportPeriod=null;
 if(category==='insider'){
  action=facts.side==='buy'?'buy':facts.side==='sell'?'sell':'record';
  // Do not multiply a joint filing's total by the number of owners.
  metric=finite(facts.total_value);metricType=metric===null?'unknown':'transaction_value';
  transactionDate=transactionDates.length?transactionDates.join(' / '):null;
 }else if(category==='holdings'){
  action=facts.put_call?'option_holding':['new','increased','decreased','held','closed'].includes(facts.position_change)?facts.position_change:'record';
  metric=facts.put_call?null:finite(facts.new_shares);metricType=metric===null?'unknown':'shares';reportPeriod=date(facts.report_period);
 }else if(category==='political'){
  action='disclosed';metric=typeof facts.amount_range==='string'?facts.amount_range:null;metricType=metric?'amount_range':'unknown';transactionDate=date(facts.transaction_date);
 }else if(category==='company')action=row.kind==='index'?'index_change':row.kind==='news'?'announcement':'company_event';
 const ticker=typeof row.ticker==='string'&&/^[A-Z][A-Z0-9.\-]{0,9}$/.test(row.ticker)?row.ticker:null;
 return {id:String(row.id),kind:row.kind,category,ticker,instrument:facts.put_call?'option':ticker?'equity':'unresolved',stockEligible:Boolean(ticker)&&!facts.put_call,actor:row.reporter_name||facts.reporter_name||facts.politician||extra.publisher||(facts.owners||[]).map(owner=>owner.name).filter(Boolean).join(' / ')||null,
  actorRoles:(facts.owners||[]).map(owner=>owner.title||owner.role).filter(Boolean),dateReviewRequired:facts.date_review_required===true,
  summary:(language==='en'?extra.message_en:extra.message_zh)||row.summary||extra.message_text||'',
  action,metric,metricType,priorShares:facts.put_call?null:finite(facts.prior_shares),transactionDate,reportPeriod,
  publishedDate:date(publication),observedAt:row.observed_at||null,effectiveDate:date(extra.effective_at),
  sourceUrl:safeUrl(row.source_url||extra.source_url),sourceType:facts.form||extra.publisher||row.kind,
  provenance:row.provenance||null,raw:row};
}
export function activityArchive(document,language='zh'){
 return {items:(Array.isArray(document?.items)?document.items:[]).filter(row=>ACTIVITY_KINDS.all.includes(row.kind)).map(row=>activityRecord(row,language)),
  access:document?.access||null,partial:document?.partial===true,nextCursor:document?.next_cursor||null};
}
