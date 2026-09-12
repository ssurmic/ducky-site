import * as api from '../api.js';
import * as store from '../store.js';
import {el,clear,errorBox} from '../ui.js';
import {s} from '../strings.js';

export async function mount(root,{signal}={}){
  let busy=false,disposed=false;
  const input=el('input.input',{type:'text',maxlength:20,'aria-label':s('trial.ticker'),placeholder:'NVDA',autocomplete:'off'});
  const add=el('button.btn.btn-primary',{type:'submit'},s('watch.add'));
  const list=el('ul'),notice=el('p',{role:'status'});
  const form=el('form.add-row',{onsubmit:async event=>{
    event.preventDefault();if(busy||!input.value.trim())return;busy=true;add.disabled=true;
    try{await api.watchlist.add(input.value.trim().toUpperCase());input.value='';await load();}
    catch(error){if(!disposed)notice.replaceChildren(errorBox(error));}
    finally{busy=false;add.disabled=false;}
  }},input,add);
  root.append(el('h1',s('watch.title')),el('p',s('trial.manager_note')),
    el('a.btn.btn-primary',{href:'#/billing'},s('trial.manage')),form,notice,list);
  async function load(){
    const response=await api.watchlist.list({signal});if(disposed||signal?.aborted)return;
    clear(list);notice.textContent=s('trial.watch_count',{used:response.items.length,cap:response.cap});
    store.set('watchlist',response.items.map(row=>row.ticker));
    for(const row of response.items)list.append(el('li',el('strong',row.ticker),row.name?el('span',row.name):null,
      el('button.btn.btn-ghost',{type:'button','aria-label':s('experience.remove_map',{ticker:row.ticker}),onclick:async event=>{
        event.currentTarget.disabled=true;
        try{await api.watchlist.remove(row.ticker);await load();}catch(error){if(!disposed)notice.replaceChildren(errorBox(error));}
      }},s('trial.remove'))));
  }
  try{await load();}catch(error){if(!signal?.aborted)notice.replaceChildren(errorBox(error,load));}
  return ()=>{disposed=true;};
}
