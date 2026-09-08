import {s} from '../strings.js';
import {el,px} from '../ui.js';

export function groundedClaim(c) {
  if(['retracted','superseded'].includes(c?.attribution_status))return false;
  return ['creator-claims-v1','creator-claims-v2'].includes(c?.extractor_version)
    ? c.evidence_verified===true && c.verification==='source_reviewed' && Boolean(c.source_hash) && Array.isArray(c.segment_ids) && c.segment_ids.length>0
    : typeof c?.evidence==='string' && c.evidence.length>=12;
}
export function sourceAt(url, seconds) {
  try {
    const u=new URL(url);
    if(u.protocol!=='https:' || !['youtube.com','www.youtube.com','youtu.be'].includes(u.hostname))return null;
    if(Number.isFinite(seconds) && seconds>=0 && seconds<=5400)u.searchParams.set('t',String(Math.floor(seconds)));
    return u.href;
  }catch{return null;}
}
const pick=value=>typeof value==='object'&&value?value[document.documentElement.lang?.startsWith('en')?'en':'zh']||value.en||value.zh:typeof value==='string'?value:'';

// Preserve the source's own qualification across creator, map and stock readers.
export function claimQualifications(call) {
  const rows=el('dl.creator-claim-facts');
  for(const [key,value] of [['creators.stated_condition',call.condition_text],['creators.stated_horizon',call.horizon_text]]){
    if(typeof value==='string'&&value.trim())rows.append(el('div',el('dt',s(key)),el('dd',value)));
  }
  return rows.children.length?rows:null;
}

export function claimDetails(call) {
  const facts=el('dl.creator-claim-facts');
  const stated=(key,value)=>facts.append(el('div',el('dt',s(key)),el('dd',value||s('creators.not_stated'))));
  const sourceWording=value=>value&&(value.length>90||(document.documentElement.lang?.startsWith('en')&&/[\u3400-\u9fff]/.test(value)))
    ?el('details',el('summary',s('creatorclaim.source_wording')),el('p.small',value)):value;
  if(call.extractor_version){
    stated('creatorclaim.action',call.action?s('creatorclaim.action_'+call.action):null);
    stated('creatorclaim.intent',call.intent?s('creatorclaim.intent_'+call.intent):null);
  }
  stated('creators.stated_horizon',sourceWording(call.horizon_text));
  stated('creators.stated_condition',sourceWording(call.condition_text));
  stated('creatorclaim.reason',pick(call.reason));
  if(call.stated_price_text)stated('creatorclaim.stated_price',call.stated_price_text);
  return el('div.creator-claim-detail',
    ['retracted','superseded'].includes(call.attribution_status)?el('p.err',s('creatorclaim.superseded')):null,
    pick(call.note)?el('p',pick(call.note)):null,facts);
}

export function priceContext(context) {
  if(!context)return null;
  const rows=el('dl.creator-price-context');
  for(const key of ['previous_close','publication_close','publication_next_open','recorded_next_open']){
    const value=context[key]||{};
    rows.append(el('div',el('dt',s('creatorclaim.'+key)),el('dd',
      value.d?el('time',{datetime:value.d},value.d+' · '):null,
      value.status==='ready'&&Number.isFinite(value.price)?px(value.price):s('creatorclaim.price_'+(value.status||'time_unknown')))));
  }
  return el('section.creator-price-anchors',el('h4',s('creatorclaim.price_title')),rows,
    el('p.small.muted',s('creatorclaim.price_basis')),
    context.simulation?.reason==='condition_not_evaluated'?el('p.small',s('creatorclaim.conditional')):null);
}
