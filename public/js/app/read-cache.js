// A bounded, memory-only preview of reads in this authenticated session.
// Views still revalidate on every entry. Dates and unavailable states are kept;
// a successful withdrawal replaces old text, while a network failure does not.
import * as store from './store.js';

const entries=new Map(),MAX_AGE=5*60*1000,MAX_BYTES=8*1024*1024;
let owner=null,bytes=0;
const scope=()=>JSON.stringify([store.epoch(),store.get('token'),store.get('me')?.user_id,
  store.get('me')?.tier,store.get('me')?.access,store.get('me')?.experience?.evidence]);
function current(){
  const next=scope();
  if(next!==owner){clear();owner=next;}
  return !!store.get('me')&&!!store.get('token');
}
export function clear(){entries.clear();bytes=0;}
function remove(path){bytes-=entries.get(path)?.size||0;entries.delete(path);}
export function forget(path){current();remove(path);}
const stockPath=/^\/(stock-research|evidence)\/([A-Z][A-Z0-9.-]{0,9})$/;
export function allowed(path){return path==='/watchlist'||path==='/me/stock-research'||stockPath.test(path);}
function valid(path,value){
  if(!value||value.__accepted)return false;
  if(path==='/watchlist')return Array.isArray(value.items)&&Array.isArray(value.overview?.items);
  if(path==='/me/stock-research')return Array.isArray(value.items)&&value.items.every(item=>item&&typeof item.ticker==='string');
  const match=path.match(stockPath),doc=match?.[1]==='stock-research'?value.evidence:value;
  return !!match&&value.ticker===match[2]&&(doc===null||Array.isArray(doc?.nodes));
}
function put(path,value,at=Date.now()){
  const text=JSON.stringify(value),size=text.length*2;
  remove(path);
  if(size>MAX_BYTES/2)return;
  while(entries.size>=32||bytes+size>MAX_BYTES)remove(entries.keys().next().value);
  entries.set(path,{text,size,at});bytes+=size;
}
export function peek(path){
  if(!current())return null;
  const entry=entries.get(path);
  if(!entry){
    const match=path.match(stockPath);
    if(!match)return null;
    const other='/'+(match[1]==='evidence'?'stock-research':'evidence')+'/'+match[2];
    if(!entries.has(other))return null;
    const saved=peek(other);
    if(!saved)return null;
    return match[1]==='evidence'?(saved.evidence?{...saved.evidence,display_price:saved.price}:null):
      {ticker:match[2],evidence:saved,price:saved.display_price||null};
  }
  if(Date.now()-entry.at>MAX_AGE||Date.now()<entry.at){remove(path);return null;}
  return JSON.parse(entry.text);
}
export function remember(path,value){
  if(!current()||!allowed(path)||!valid(path,value))return;
  // A full authoritative graph also refreshes its overview. This prevents a
  // withdrawn source from resurfacing when returning from a map to the list.
  const match=path.match(stockPath);
  if(match){
    const ticker=match[2],doc=match[1]==='stock-research'?value.evidence:value;
    const list=peek('/me/stock-research');
    if(list){
      const nodes=doc?.analysis_status==='refresh_pending'?doc.analysis_nodes||[]:doc?.nodes||[];
      const refs=doc?.analysis?.overview?.citations||[];
      const accepted=['ready','refresh_pending'].includes(doc?.analysis_status)&&refs.length&&refs.every(id=>nodes.some(n=>n.id===id));
      list.items=list.items.map(item=>item.ticker!==ticker?item:{ticker,status:doc?.analysis_status||'pending',
        overview:accepted?doc.analysis.overview:null,sources:accepted?nodes.filter(n=>refs.includes(n.id)):[],
        as_of:doc?.analysis_generated_at,version:doc?.analysis_evidence_version,records:doc?.nodes?.length??null});
      put('/me/stock-research',list,entries.get('/me/stock-research').at);
    }
    remove('/'+(match[1]==='evidence'?'stock-research':'evidence')+'/'+ticker);
  }else if(path==='/me/stock-research'){
    const previous=peek(path);
    for(const item of value.items){
      const old=previous?.items.find(p=>p.ticker===item.ticker);
      if(JSON.stringify(old)!==JSON.stringify(item)){
        remove('/stock-research/'+item.ticker);remove('/evidence/'+item.ticker);
      }
    }
  }
  put(path,value);
}
for(const key of ['token','me'])store.subscribe(key,current);
let membership='';
store.subscribe('watchlist',()=>{
  const next=[...(store.get('watchlist')||[])].sort().join('|');
  if(next!==membership){
    const saved=peek('/watchlist');
    const incoming=(saved?.items||[]).map(item=>typeof item==='string'?item:item?.ticker||item?.symbol).filter(Boolean).sort().join('|');
    if(!saved||incoming!==next){forget('/watchlist');forget('/me/stock-research');}
    membership=next;
  }
});
