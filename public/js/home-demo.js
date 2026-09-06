// Public cached records only. A stock selection never follows a creator or saves an alert.
const element=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
const safeSource=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}};
const stamp=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toISOString().slice(0,16).replace('T',' ')+' UTC';};
export function mountStockDemo(root,fetcher=fetch) {
 const copy=JSON.parse(root.querySelector('[data-demo-copy]').textContent),t=key=>copy[key]||key;
 const base=root.dataset.api.replace(/\/$/,''),app=root.dataset.app,input=root.querySelector('input'),form=root.querySelector('form'),status=root.querySelector('[data-demo-status]'),records=root.querySelector('[data-demo-records]'),links=root.querySelector('[data-demo-links]');
 let sequence=0,controller,disposed=false;
 const link=(title,href)=>{const a=element('a',title);a.href=href;return a;};
 async function load() {
  const ticker=input.value.trim().toUpperCase().replace(/^\$/,'');input.value=ticker;
  if(!/^[A-Z][A-Z0-9.-]{0,11}$/.test(ticker)){status.textContent=t('invalid');return;}
  const seq=++sequence;controller?.abort();controller=new AbortController();status.textContent=t('loading');records.replaceChildren();links.replaceChildren();links.hidden=true;
  // Public demo uses the same five-day delay, even during a backend rollout.
  const cutoff=new Date(Date.now()-5*86400000).toISOString().slice(0,10);
  const params=new URLSearchParams({ticker,limit:'3',content:'all',purchases:'all',end:cutoff});
  try {
   const r=await fetcher(base+'/public/radar/archive.json?'+params,{credentials:'omit',signal:controller.signal});if(!r.ok)throw Error('unavailable');
   const doc=await r.json();if(disposed||seq!==sequence)return;
   const rows=(doc.items||[]).filter(row=>String(row.ticker||'').toUpperCase()===ticker&&new Date(row.ts).getTime()<=Date.now()-5*86400000).slice(0,3);
   status.textContent=t('delay')+' '+(rows.length?t('shown').replace('{n}',rows.length):t('empty'));
   for(const row of rows){
    const card=element('article',null,'demo-record'),ingested=row.provenance==='INGESTED',dayOnly=row.extra?.date_precision==='day';
    const date=dayOnly?String(row.ts).slice(0,10):stamp(row.ts),label=ingested?(dayOnly?'published_day':'published'):'recorded';
    const summary=root.dataset.lang==='en'?(row.extra?.summary_en||row.summary):row.summary;
    card.append(element('span',t(label)+' '+date,'mono small muted'),element('h3',row.issuer_name||ticker),element('p',String(summary||'').slice(0,360)));
    if(ingested&&row.observed_at)card.append(element('p',t('collected')+' '+stamp(row.observed_at),'small muted'));
    const src=safeSource(row.source_url||row.extra?.source_url);if(src){const a=link(t('source')+' ↗',src);a.target='_blank';a.rel='noopener noreferrer';card.append(a);}else card.append(element('p',t('source_missing'),'small muted'));records.append(card);
   }
   for(const [key,path] of [['records','#/boards?mode=archive&ticker='],['creators','#/creators?ticker='],['chart','#/chart/'],['alerts','#/alerts?ticker=']])links.append(link(t(key)+' →',app+path+encodeURIComponent(ticker)));
   links.hidden=false;
  }catch(error){if(disposed||seq!==sequence||error.name==='AbortError')return;status.textContent=t('unavailable');}
 }
 const reset=()=>{++sequence;controller?.abort();records.replaceChildren();links.replaceChildren();links.hidden=true;status.textContent=t('ready');};
 input.addEventListener('input',reset);
 const submit=e=>{e.preventDefault();load();};form.addEventListener('submit',submit);
 root.querySelectorAll('[data-demo-ticker]').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.demoTicker;load();}));
 const market=root.querySelector('[data-demo-market]');
 const marketButton=root.querySelector('[data-demo-market-load]');
 const loadMarket=async()=>{
  marketButton.disabled=true;
  market.replaceChildren(element('p',t('loading'),'small muted'));
  try{const r=await fetcher(base+'/public/market-preview.json',{credentials:'omit'});if(!r.ok)throw Error();const doc=await r.json();if(disposed)return;market.replaceChildren();
   if(doc.status==='unavailable'||!doc.evidence?.length){market.append(element('p',t('market_empty'),'small muted'));return;}
   const stale=doc.status==='stale'||Date.now()-Date.parse(doc.observed_at)>86400000;
   market.append(element('p',(stale?t('stale'):t('observed'))+' '+stamp(doc.observed_at),'mono small muted'));
   for(const topic of (doc.topics||[]).slice(0,3))market.append(element('span',root.dataset.lang==='zh'?topic.label_zh:topic.label_en,'chip'));
   for(const fact of doc.evidence.slice(0,3)){const url=safeSource(fact.source_url);if(!url)continue;const p=element('p',null,'demo-headline'),a=link(fact.title,url);a.target='_blank';a.rel='noopener noreferrer';p.append(a,element('small',(fact.publisher||'')+' · '+stamp(fact.published_at),'muted'));market.append(p);}
   market.append(element('p',t('coverage'),'small muted'));
  }catch{if(!disposed)market.replaceChildren(element('p',t('unavailable'),'small muted'));}
  finally{if(!disposed)marketButton.disabled=false;}
 };
 marketButton.addEventListener('click',loadMarket);
 return()=>{disposed=true;++sequence;controller?.abort();form.removeEventListener('submit',submit);input.removeEventListener('input',reset);marketButton.removeEventListener('click',loadMarket);};
}
if(typeof document!=='undefined')document.querySelectorAll('[data-home-demo]').forEach(root=>mountStockDemo(root));
