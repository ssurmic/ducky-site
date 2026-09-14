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

// A folder is a reading aid, never a replacement point or an extra vote. The
// server may supply reviewed cross-video equivalence. Old graphs use the safe
// same-original-source folder, without claiming that all statements mean the same.
export function groupViews(nodes,reviewed=[]){
  const byId=new Map(nodes.map(n=>[n.id,n])),used=new Set(),groups=[];
  const qualifiers=n=>JSON.stringify([n.stance,n.intent||'',n.action||'',!!n.conditional,n.condition_text||'',n.horizon_text||'']);
  const add=(key,members,basis)=>{
    const rows=[...members].sort((a,b)=>String(b.published_at||'').localeCompare(String(a.published_at||'')));
    rows.forEach(n=>used.add(n.id));groups.push({key,nodes:rows,lead:rows[0],basis});
  };
  for(const group of Array.isArray(reviewed)?reviewed:[]){
    if(!group||typeof group!=='object')continue;
    const ids=group.node_ids;
    if(group.basis!=='reviewed_equivalent_thesis'||!Array.isArray(ids)||ids.length<2||new Set(ids).size!==ids.length||ids.some(id=>!byId.has(id)||used.has(id)))continue;
    const members=ids.map(id=>byId.get(id)),author=authorIdentity(members[0]);
    if(!author||members.some(n=>authorIdentity(n)?.id!==author.id||qualifiers(n)!==qualifiers(members[0])))continue;
    add(group.id,members,'thesis');
  }
  const originals=new Map();
  for(const node of nodes){
    if(used.has(node.id))continue;
    const author=authorIdentity(node),keys=(node.evidence||[]).map(originalSourceKey),sources=[...new Set(keys.filter(Boolean))];
    // Missing/mixed source attribution and missing stance stay as individual records.
    const key=author&&keys.every(Boolean)&&sources.length===1&&['support','counter','context'].includes(node.stance)?
      JSON.stringify([author.id,sources[0],qualifiers(node)]):'point:'+node.id;
    if(!originals.has(key))originals.set(key,[]);originals.get(key).push(node);
  }
  for(const [key,members]of originals)add(key,members,members.length>1?'source':'point');
  // Keep the input's ranking; every folder consumes one preview slot, even if
  // it contains many older records. Counterarguments retain their own slots.
  const rank=new Map(readingOrder(nodes).map((n,i)=>[n.id,i]));
  return groups.sort((a,b)=>Math.min(...a.nodes.map(n=>rank.get(n.id)))-Math.min(...b.nodes.map(n=>rank.get(n.id))));
}
