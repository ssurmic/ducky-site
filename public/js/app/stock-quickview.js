import {el,clear,modal,closeModal,spinner,errorBox} from './ui.js';
import {s,LANG} from './strings.js';
import * as api from './api.js';
import * as store from './store.js';
import {reportCard} from './views/stock-briefs.js';

export function quickTake(row) {
  if(!['ready','stale'].includes(row?.status)||!row.report)return null;
  const value=row.report.summary?.[LANG==='en'?'en':'zh'];
  // Never truncate a reviewed sentence into a stronger or incomplete claim.
  if(typeof value!=='string'||!value.trim()||[...value].length>(LANG==='en'?360:200))return null;
  return value;
}

export function openStockQuickView(ticker,{withChart=true}={}) {
  if(!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(ticker))return;
  const ctl=new AbortController(),epoch=store.epoch();let disposeChart=null,expiry=null;
  const body=el('div.stock-quickview'),summary=el('section.quick-summary'),chartHost=el('div.stock-quickview-chart');
  body.append(summary);
  const valid=()=>!ctl.signal.aborted&&epoch===store.epoch()&&body.isConnected;
  const off=store.subscribe('me',()=>{if(!store.isPro()||epoch!==store.epoch())closeModal();});
  const host=modal('$'+ticker+' · '+s('quick.title'),body,[],{onClose:()=>{
    ctl.abort();clearTimeout(expiry);off();disposeChart?.();
  }});
  host.querySelector('.modal-box').classList.add('stock-quick-dialog');
  host.querySelector('.modal-actions').remove();
  body.addEventListener('click',event=>{if(event.target.closest('a[href^="#/"]'))closeModal();});
  if(!store.isPro()) {
    summary.append(el('p',s('stockbrief.lock_note')),el('a.btn.btn-primary',{href:'#/billing'},s('radar.access_upgrade')));
    return;
  }
  async function load() {
    clear(summary);summary.append(spinner());
    try {
      const doc=await api.get('/briefing/stocks?ticker='+encodeURIComponent(ticker),{signal:ctl.signal,silent402:true});
      if(!valid())return;
      const row=doc.items?.find(r=>r.ticker===ticker),text=quickTake(row);clear(summary);
      if(!text){summary.append(el('p.data-notice',s('stockbrief.unready_'+(row?.status==='source_changed'?'source_changed':row?.refresh?.status==='failed'?'failed':'pending'))),
        el('a.btn.btn-ghost.btn-sm',{href:'#/research/'+ticker},s('stockbrief.evidence')));return;}
      const stamp=Date.parse(row.checked_at),past=!Number.isFinite(stamp)||Date.now()<stamp||Date.now()-stamp>14*3600000;
      const notice=el('p.data-notice',{hidden:row.status!=='stale'&&!past&&row.refresh?.status!=='failed'},s('stockbrief.saved_report'));
      summary.append(notice,el('p.quick-take',text));
      const price=row.evidence?.find(f=>f.topic==='price');
      if(price)summary.append(el('p.small.muted',s('stockbrief.price_session',{date:String(price.data?.price_session||'—').slice(0,10)})));
      if(Number.isFinite(stamp)){
        summary.append(el('p.small.muted',s('stockbrief.checked',{date:new Date(stamp).toISOString().slice(0,16).replace('T',' ')+' UTC'})));
        const remaining=stamp+14*3600000-Date.now();
        if(remaining>0)expiry=setTimeout(()=>{if(valid())notice.hidden=false;},remaining+1);
      }
      summary.append(el('details.quick-evidence',el('summary',s('quick.details')),reportCard(row,{archive:true})));
    } catch(error){if(valid()){clear(summary);summary.append(errorBox(error,load));}}
  }
  load();
  if(withChart){
    body.append(chartHost);
    import('./views/chart.js').then(async chart=>{
      if(!valid())return;
      const dispose=await chart.mount(chartHost,{ticker,compact:true,signal:ctl.signal});
      if(!valid())dispose?.();else disposeChart=dispose;
    }).catch(error=>{if(valid())chartHost.append(errorBox(error));});
  }
}
