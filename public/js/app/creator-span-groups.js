// Group repeated presentation, never source identity or historical records.
// Receipt differences stay available on expansion. Any other differing field
// (including future qualification fields) keeps the viewpoints separate.
const receipts=new Set(['point_id','source_url','start_seconds','end_seconds','evidence','evidence_reading','excerpt_status']);
const normalized=value=>{
  if(typeof value==='string')return value.trim().replace(/\s+/g,' ');
  if(Array.isArray(value))return value.map(normalized);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,normalized(value[key])]));
  return value;
};
function key(row){
  if(!['creator_id','post_id','point_id','ticker'].every(k=>typeof row[k]==='string'&&row[k].trim()) ||
    !['en','zh'].every(lang=>typeof row.title?.[lang]==='string'&&row.title[lang].trim()))return null;
  try{
    const u=new URL(row.source_url);
    if(u.protocol!=='https:'||u.username||u.password||!['youtube.com','www.youtube.com','youtu.be'].includes(u.hostname))return null;
    const video=u.hostname==='youtu.be'?u.pathname.slice(1):u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:shorts|embed)\/([^/]+)$/)?.[1];
    if(video!==row.post_id)return null;
  }catch{return null;}
  return JSON.stringify(normalized(Object.fromEntries(Object.entries(row).filter(([field])=>!receipts.has(field)))));
}
export function spanGroups(rows){
  const groups=[],byKey=new Map();
  for(const row of rows){
    const identity=key(row),group=identity&&byKey.get(identity);
    if(group)group.push(row);
    else{const next=[row];groups.push(next);if(identity)byKey.set(identity,next);}
  }
  return groups;
}
