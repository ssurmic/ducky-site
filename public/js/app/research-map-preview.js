// Adapt only the dated, already-public homepage selection to the current map renderer.
// IDs below identify local DOM nodes; they are not source-owner IDs or approval receipts.
import {mapView} from './views/evidence.js';
import {el} from './ui.js';
import {s} from './strings.js';

const day=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
  Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
const source=value=>{
  try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}
  catch{return null;}
};

export function publicMap(snapshot){
  const stock=snapshot?.stocks?.find(item=>item.ticker==='NVDA');
  if(!stock||!day(snapshot.as_of)||!day(stock.close_date)||
      typeof stock.close!=='number'||!Number.isFinite(stock.close)||stock.close<=0||
      !Array.isArray(stock.items)||!stock.items.length)throw Error('invalid_public_map');
  const nodes=stock.items.map((item,index)=>{
    const href=source(item.source_url);
    if(!href||!day(item.date)||!['creator','record'].includes(item.kind)||
        !['support','counter','context'].includes(item.stance)||
        !['en','zh'].every(lang=>typeof item.title?.[lang]==='string'&&item.title[lang].trim())||
        typeof item.author!=='string'||!item.author.trim())throw Error('invalid_public_map');
    const id='public-NVDA-'+index;
    const topic=item.kind==='record'&&item.source_label?.en==='SEC 13F'?{topic:'13f'}:{};
    return {id,ticker:stock.ticker,kind:item.kind,stance:item.stance,...topic,title:{...item.title},published_at:item.date,
      evidence:[{id:id+'-source',kind:item.kind,...topic,author:item.author,title:{...item.title},
        published_at:item.date,source_url:href,source_label:{...item.source_label}}]};
  });
  // Selection date is not observation/approval time. Do not manufacture coverage,
  // reviewed analysis, source hashes, creator IDs, or price-position measurements.
  return {ticker:stock.ticker,nodes,display_price:{price:stock.close,price_session:stock.close_date},
    market_context:{price:{data:{price:stock.close,price_session:stock.close_date}}}};
}

export function mountPublicMap(root,snapshot){
  const doc=publicMap(snapshot);
  const view=mapView(doc,{example:false,showAnalysis:false,showShare:false});
  // The public selection has no acquisition/job coverage receipt. The full app's
  // missing-field fallbacks must not become zero pending/failed claims here.
  view.querySelectorAll('.evidence-coverage,.evidence-ordering').forEach(node=>node.remove());
  root.replaceChildren(view);
  view.refresh();
  return view;
}

export function appLink(event,appURL){
  const anchor=event.target.closest?.('a[href]');
  if(!anchor?.getAttribute('href')?.startsWith('#/'))return;
  anchor.href=appURL+anchor.getAttribute('href');
  anchor.target='_blank';anchor.rel='noopener noreferrer';
}

const root=document.getElementById('research-map-preview');
if(root){
  try{
    const view=mountPublicMap(root,JSON.parse(document.getElementById('research-map-data').textContent));
    // Source dialogs may add links later. Internal app routes open outside the
    // preview; external original-source links retain the renderer's own target.
    const open=event=>appLink(event,root.dataset.appUrl);
    document.addEventListener('click',open,true);
    document.addEventListener('auxclick',open,true);
    window.addEventListener('pagehide',()=>view.dispose(),{once:true});
  }catch{
    root.replaceChildren(el('p.errbox',{role:'status'},s('preview.map_unavailable')));
  }
}
