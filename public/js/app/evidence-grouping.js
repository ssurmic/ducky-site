// Presentation only: retain every node, revision, source and stance. Never infer
// agreement, average opposing views, or treat repeat mentions as corroboration.
import {readingOrder} from './reading-order.js';
export function authorIdentity(node){
  const sources=node.kind==='creator'?(node.evidence||[]):[];
  if(!sources.length||sources.some(e=>!e.creator_id))return null;
  const ids=[...new Set(sources.map(e=>e.creator_id))];
  if(ids.length!==1)return null;
  return {id:ids[0],name:sources.find(e=>e.author)?.author||ids[0]};
}
export function originalSourceKey(e){
  if(e.creator_id&&e.post_id)return e.creator_id+':'+e.post_id;
  if(!e.source_url)return null;
  try{
    const u=new URL(e.source_url);
    if(u.protocol!=='https:'||u.username||u.password)return null;
    // Segment timestamps do not create independent videos or posts.
    for(const key of ['t','start','end'])u.searchParams.delete(key);
    u.hash='';return u.href;
  }catch{return null;}
}
export function sourceOccurrences(nodes){
  const counts=new Map();
  for(const node of nodes.filter(n=>n.kind==='creator'))for(const key of new Set((node.evidence||[]).map(originalSourceKey).filter(Boolean)))
    counts.set(key,(counts.get(key)||0)+1);
  return counts;
}
export function groupAuthors(nodes){
  const groups=new Map();
  for(const node of nodes){
    const author=authorIdentity(node),key=author?'author:'+author.id:'record:'+node.id;
    if(!groups.has(key))groups.set(key,{key,author,nodes:[],sources:new Set()});
    const group=groups.get(key);group.nodes.push(node);
    for(const e of node.evidence||[]){const source=originalSourceKey(e);if(source)group.sources.add(source);}
  }
  return [...groups.values()].map(group=>({...group,nodes:readingOrder(group.nodes)}));
}

// Receipt fields may vary between otherwise identical attributed statements.
// Everything else, including future fields, remains part of the comparison.
const nodeReceipts=new Set(['id','published_at','observed_at','recorded_at','source_count','evidence','evidence_omitted']);
const sourceReceipts=new Set(['id','point_id','legacy_claim_id','post_id','source_url','source_hash','start_seconds','end_seconds',
  'published_at','observed_at','recorded_at','first_seen_at','associated_at','retrieved_at','evidence','evidence_reading','excerpt_status']);
const normalized=value=>typeof value==='string'?value.trim().replace(/\s+/g,' '):Array.isArray(value)?value.map(normalized):
  value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,normalized(value[key])])):value;
const without=(row,excluded)=>Object.fromEntries(Object.entries(row).filter(([key])=>!excluded.has(key)));
const bilingual=title=>['en','zh'].every(lang=>typeof title?.[lang]==='string'&&title[lang].trim());
const identity=value=>typeof value==='string'&&Boolean(value.trim());
function exactAuthorKey(node,ticker){
  const author=authorIdentity(node);
  if(!author||!identity(author.id)||!identity(node.id)||!bilingual(node.title)||!['support','counter','context'].includes(node.stance)||
    !/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker||'')||(node.ticker&&node.ticker!==ticker)||node.evidence_omitted||
    node.intent==='mention'||node.basis==='verified_mention_no_direction'||['retracted','superseded'].includes(node.attribution_status))return null;
  const semantics=[];
  for(const source of node.evidence){
    if(source.kind!=='creator'||source.basis!=='attributed_opinion'||source.creator_id!==author.id||
      !identity(source.post_id)||!identity(source.point_id||source.id)||(source.ticker&&source.ticker!==ticker)||
      ['retracted','superseded'].includes(source.attribution_status))return null;
    // A source identity is not established merely by a safe-looking hostname.
    // Current grouped sources are YouTube records; other providers stay separate.
    try{
      const url=new URL(source.source_url);
      if(url.protocol!=='https:'||url.username||url.password||!['youtube.com','www.youtube.com','youtu.be'].includes(url.hostname))return null;
      const post=url.hostname==='youtu.be'?url.pathname.slice(1):url.pathname==='/watch'?url.searchParams.get('v'):url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)$/)?.[1];
      if(post!==source.post_id)return null;
    }catch{return null;}
    semantics.push(JSON.stringify(normalized(without(source,sourceReceipts))));
  }
  // Source multiplicity is receipt history, not extra independent support.
  return JSON.stringify([ticker,author.id,normalized(without(node,nodeReceipts)),[...new Set(semantics)].sort()]);
}

export function exactAuthorRepeats(nodes,{ticker}={}){
  const groups=[],known=new Map();
  for(const node of nodes){
    const key=exactAuthorKey(node,ticker),group=key&&known.get(key);
    if(group)group.push(node);
    else{const next=[node];groups.push(next);if(key)known.set(key,next);}
  }
  return groups;
}
