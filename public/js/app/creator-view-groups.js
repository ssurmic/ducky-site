// Presentation-only collation. Every record remains attached to its original
// author, post, point and dates; repeated text never becomes corroboration.
const receiptFields=new Set(['point_id','post_id','source_url','source_hash','start_seconds','end_seconds',
  'evidence','evidence_reading','excerpt_status','published_at','observed_at','first_seen_at','associated_at']);
const normalized=value=>typeof value==='string'?value.trim().replace(/\s+/g,' '):Array.isArray(value)?value.map(normalized):
  value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,normalized(value[key])])):value;

function sameViewKey(view){
  const row=view.record,p=view.post;
  if(!row||row.basis!=='attributed_opinion'||row.intent==='mention'||['retracted','superseded'].includes(row.attribution_status))return null;
  if(!['creator_id','post_id','point_id','ticker'].every(key=>typeof row[key]==='string'&&row[key].trim())||
    row.creator_id!==p?.kol_id||row.post_id!==p?.platform_post_id||
    !['en','zh'].every(lang=>typeof row.title?.[lang]==='string'&&row.title[lang].trim()))return null;
  try{
    const url=new URL(row.source_url);
    if(url.protocol!=='https:'||url.username||url.password||!['youtube.com','www.youtube.com','youtu.be'].includes(url.hostname))return null;
    const post=url.hostname==='youtu.be'?url.pathname.slice(1):url.pathname==='/watch'?url.searchParams.get('v'):url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)$/)?.[1];
    if(post!==row.post_id)return null;
  }catch{return null;}
  // Unknown fields are semantic by default. New qualifications must never be
  // silently discarded just because the visible headline stayed the same.
  return JSON.stringify(normalized(Object.fromEntries(Object.entries(row).filter(([key])=>!receiptFields.has(key)))));
}

export function collateCreatorViews(views){
  const groups=[],keys=new Map();
  for(const view of views){
    const key=sameViewKey(view),group=key&&keys.get(key);
    if(group)group.records.push(view);
    else {const next={...view,records:[view]};groups.push(next);if(key)keys.set(key,next);}
  }
  return groups;
}
