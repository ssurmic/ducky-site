import { el, clear, spinner, px, errorBox } from '../ui.js';
import { s, LANG } from '../strings.js';
import * as api from '../api.js';
import * as store from '../store.js';
import { dateTime } from './creator-research.js';

export function realEntries(items){return items.filter(row=>row.book==='live'&&
  ['opened','added','trimmed','closed','invalidated'].includes(row.status));}

export async function mount(root,route={}) {
  const ctl=new AbortController(),epoch=store.epoch();let alive=true;
  const valid=()=>alive&&!ctl.signal.aborted&&epoch===store.epoch();
  const cleanup=()=>{alive=false;ctl.abort();};route.signal?.addEventListener('abort',cleanup,{once:true});
  root.append(el('div.view-head',el('div',el('h1',s('nav.ducky')),el('p.muted',s('ducky.description')))));
  const body=el('div');root.append(body);
  const base=LANG==='en'?'/en':'';
  async function load(){
    clear(body).append(spinner());
    try{
      const doc=await api.get('/public/ideas.json',{auth:false,signal:ctl.signal});
      if(!valid())return;if(!Array.isArray(doc.ideas))throw Error('invalid_response');
      clear(body);const rows=realEntries(doc.ideas);
      body.append(el('p.small.muted',s('ducky.as_of',{date:dateTime(doc.generated_at||doc.as_of)})));
      if(!rows.length)body.append(el('section.card.ducky-empty',el('img',{src:'/avatar-160.jpg',width:64,height:64,alt:''}),
        el('h2',s('ducky.empty')),el('p.muted',s('ducky.empty_note'))));
      for(const row of rows){const card=el('article.card',el('h2',row.ticker),el('span.chip',s('ducky.live')),
        el('p',(row.opened_d||'—')+' · '+s('ducky.entry')+' '+px(Number.isFinite(row.entry_px)&&row.entry_px>0?row.entry_px:null)),
        el('p',s('ducky.status_'+row.status)),el('p',row.title));
        if(row.closed_d)card.append(el('p',row.closed_d+' · '+s('ducky.exit')+' '+px(row.exit_px)));
        if(/^[a-z0-9][a-z0-9-]*$/.test(row.slug||''))card.append(el('a',{href:base+'/ideas/'+row.slug+'/'},s('ducky.reason')+' →'));
        body.append(card);
      }
      body.append(el('p.small.muted',s('ducky.basis')),
        el('a.btn.btn-ghost',{href:base+'/ideas/'},s('ducky.all')));
    }catch(error){if(valid())clear(body).append(errorBox(error,load));}
  }
  if(!route.signal?.aborted)await load();return cleanup;
}
