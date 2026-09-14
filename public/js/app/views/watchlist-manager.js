import * as api from '../api.js';
import * as store from '../store.js';
import {el,clear,errorBox} from '../ui.js';
import {s} from '../strings.js';
import {symbolPicker,watchEligibility} from '../symbol-picker.js';

export async function mount(root,{signal}={}){
  let busy=false,disposed=false,candidate=null,cap=store.get('me')?.watch_cap;
  const epoch=store.epoch(),current=()=>!disposed&&!signal?.aborted&&store.epoch()===epoch;
  const watches=()=>store.get('watchlist')||[];
  const full=()=>Number.isFinite(cap)&&watches().length>=cap;
  const input=el('input.input',{type:'text',maxlength:80,'aria-label':s('trial.ticker'),placeholder:'NVDA',autocomplete:'off',
    oninput:()=>{candidate=null;refresh();}});
  const add=el('button.btn.btn-primary',{type:'submit'},s('watch.add'));
  const list=el('ul'),notice=el('p',{role:'status'});
  const picker=symbolPicker(input,watches,{
    onSelect:row=>{candidate=row;refresh();},onResults:rows=>{candidate=rows.find(row=>row.ticker===input.value.trim().toUpperCase().replace(/^\$/,''))||null;refresh();},
    onAdd:row=>addTicker(row.ticker,row),actionState:()=>({disabled:busy||full(),
      label:full()?s('watch.full_button'):undefined,reason:full()?s('watch.full_note',{cap}):undefined})
  });
  function refresh(){if(!current())return;add.disabled=busy||full()||!!(candidate&&!watchEligibility(candidate).eligible);picker.update();
    for(const button of list.querySelectorAll('button'))button.disabled=busy;}
  function showError(error){
    if(!current())return;
    if(error.body?.error==='watch_ineligible')notice.textContent=watchEligibility({watch_eligible:false,watch_reason:error.body.reason}).reason;
    else if(error.body?.error==='watch_limit'){
      if(Number.isFinite(error.body.cap))cap=error.body.cap;
      notice.textContent=s('watch.full_note',{cap:Number.isFinite(cap)?cap:'—'});
    }else notice.replaceChildren(errorBox(error));
  }
  async function addTicker(ticker,row){
    if(!current()||busy||!ticker)return false;
    if(row&&!watchEligibility(row).eligible){notice.textContent=watchEligibility(row).reason;return false;}
    if(watches().includes(ticker)){notice.textContent=s('watch.following');return false;}
    if(full()){notice.textContent=s('watch.full_note',{cap});return false;}
    busy=true;refresh();
    try{
      const result=await api.watchlist.add(ticker,{signal,silent402:true});if(!current())return false;
      store.set('watchlist',[...new Set([...watches(),result?.ticker||ticker])]);
      input.value='';candidate=null;picker.reset();input.focus({preventScroll:true});await load();return current();
    }catch(error){showError(error);return false;}
    finally{busy=false;refresh();}
  }
  const form=el('form.add-row',{onsubmit:event=>{
    event.preventDefault();const ticker=input.value.trim().toUpperCase().replace(/^\$/,'');
    addTicker(ticker,candidate?.ticker===ticker?candidate:null);
  }},picker.wrap,add);
  root.append(el('h1',s('watch.title')),el('p',s('trial.manager_note')),
    el('a.btn.btn-primary',{href:'#/billing'},s('trial.manage')),form,notice,list);
  const unsub=store.subscribe('watchlist',refresh);
  async function load(){
    const response=await api.watchlist.list({signal});if(!current())return;
    const rows=response.items||[];if(Number.isFinite(response.cap))cap=response.cap;
    clear(list);notice.textContent=s('trial.watch_count',{used:rows.length,cap:Number.isFinite(cap)?cap:'—'});
    store.set('watchlist',rows.map(row=>typeof row==='string'?row:row.ticker));
    for(const record of rows){const row=typeof record==='string'?{ticker:record}:record;
      list.append(el('li',el('strong',row.ticker),row.name?el('span',row.name):null,
        el('button.btn.btn-ghost',{type:'button','aria-label':s('experience.remove_map',{ticker:row.ticker}),onclick:async()=>{
          if(busy||!current())return;busy=true;refresh();
          try{await api.watchlist.remove(row.ticker,{signal});if(current())await load();}catch(error){showError(error);}
          finally{busy=false;refresh();}
        }},s('trial.remove'))));
    }refresh();
  }
  try{await load();}catch(error){if(current())notice.replaceChildren(errorBox(error,load));}
  return ()=>{disposed=true;picker.dispose();unsub();};
}
