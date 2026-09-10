// Presentation only: retain every node, revision, source and stance. Never infer
// agreement, average opposing views, or treat repeat mentions as corroboration.
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
  return [...groups.values()];
}
