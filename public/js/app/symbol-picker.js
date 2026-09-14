// Shared asynchronous combobox. Selection and an optional watch action are separate controls.
import { el, clear } from './ui.js';
import { s,LANG } from './strings.js';
import * as api from './api.js';
let sequence = 0;
export function businessLabel(row,lang=LANG){
  if(lang!=='en')return row.industry||row.sector||'';
  const label=row.industry_en||row.sector_en||row.industry||row.sector||'';
  return /[\u3400-\u9fff]/.test(label)?'':label;
}
const TYPE_KEYS = {
  stock:'symbol.stock',etf:'symbol.etf',leveraged_etf:'symbol.etf',inverse_etf:'symbol.etf',
  etn:'symbol.etn',fund:'symbol.fund',warrant:'symbol.warrant',right:'symbol.right',
  unit:'symbol.unit',preferred:'symbol.preferred',security:'symbol.security',unknown:'symbol.security'
};
const TAG_KEYS = {...TYPE_KEYS,leveraged:'symbol.leveraged',inverse:'symbol.inverse'};
/** Labels only translate the directory's classification; names/tickers never infer leverage. */
export function instrumentLabels(row={}) {
  const labels=[s(TYPE_KEYS[row.instrument_type]||'symbol.security')];
  for(const tag of Array.isArray(row.instrument_tags)?row.instrument_tags:[]){
    const multiplier=typeof tag==='string'&&tag.length<=24&&/^\d+(?:\.\d+)?(?:e[+-]?\d+)?x$/.test(tag)&&
      Number.isFinite(Number(tag.slice(0,-1)))&&Number(tag.slice(0,-1))>0;
    const value=Object.hasOwn(TAG_KEYS,tag)?s(TAG_KEYS[tag]):multiplier?tag:'';
    if(value&&!labels.includes(value))labels.push(value);
  }
  return labels;
}
/** A missing gate is unknown, including during a mixed-version API/site rollout. */
export function watchEligibility(row={}) {
  if(row.watch_eligible===true)return {eligible:true,reason:''};
  const reasons={leveraged_instrument:'symbol.blocked_leveraged'};
  return {eligible:false,reason:s(reasons[row.watch_reason]||'symbol.unverified')};
}

export function symbolPicker(input, watched = () => [], options = {}) {
  const id = 'symbol-options-' + (++sequence), actions=typeof options.onAdd==='function';
  const list = el('div.symbol-options', { id, role:actions?'grid':'listbox', hidden:true,
    'aria-label':s('symbol.results'),class:actions?'symbol-options-actions':'' });
  const status = el('div.symbol-status.muted.small', { role:'status', 'aria-live':'polite' });
  const wrap = el('div.symbol-picker', input, list, status);
  input.setAttribute('role','combobox'); input.setAttribute('aria-autocomplete','list');
  input.setAttribute('aria-haspopup',actions?'grid':'listbox');
  input.setAttribute('aria-controls',id); input.setAttribute('aria-expanded','false');
  let timer, ctl, generation=0, active=-1, rows=[], disposed=false, composing=false, quietFocus=false;
  const pending=new Set();
  // Keep results inside the visible scroll pane, including when the phone keyboard is open.
  function fitPopup(){
    if(disposed||list.hidden)return;
    const rect=input.getBoundingClientRect(),pane=input.closest('.app-main')?.getBoundingClientRect();
    const viewport=window.visualViewport,viewportTop=viewport?.offsetTop||0;
    const top=Math.max(viewportTop,pane?.top||0);
    const bottom=Math.min(viewportTop+(viewport?.height||window.innerHeight),pane?.bottom>0?pane.bottom:Infinity);
    const below=bottom-rect.bottom-12,above=rect.top-top-12;
    const upward=below<140&&above>below;
    list.classList.toggle('symbol-options-above',upward);
    list.style.setProperty('--symbol-available-height',Math.max(0,upward?above:below)+'px');
  }
  function close() { list.hidden=true; input.setAttribute('aria-expanded','false'); input.removeAttribute('aria-activedescendant'); active=-1; }
  function cancel() { clearTimeout(timer); ctl?.abort(); ++generation; }
  function reset() { cancel(); close(); clear(list); status.textContent=''; rows=[]; }
  function focusInput(){quietFocus=true;input.focus({preventScroll:true});quietFocus=false;}
  function selectable(row){return options.allowWatched||!watched().includes(row.ticker);}
  function select(i) {
    if (disposed||!rows[i]||!selectable(rows[i])) return;
    const row=rows[i];input.value=row.ticker; reset(); focusInput();options.onSelect?.(row);
  }
  function highlight(i,scroll=true) {
    active=i;
    for (const [j,node] of Array.from(list.children).entries()) node.setAttribute('aria-selected',String(j===i));
    if (i>=0) { input.setAttribute('aria-activedescendant',id+'-'+i+(actions?'-select':'')); if(scroll)list.children[i]?.scrollIntoView?.({block:'nearest'}); }
    else input.removeAttribute('aria-activedescendant');
  }
  function actionState(row){
    const gate=watchEligibility(row), state=options.actionState?.(row)||{};
    const exists=watched().includes(row.ticker), busy=pending.has(row.ticker)||state.pending;
    return {...state,exists,busy,gate,disabled:exists||busy||!gate.eligible||!!state.disabled};
  }
  // Keep existing buttons during state updates so a pending action does not discard focus.
  function update(){
    if(disposed)return;
    rows.forEach((row,i)=>{
      const item=list.children[i];if(!item)return;
      const exists=watched().includes(row.ticker);
      if(!actions){item.setAttribute('aria-disabled',String(exists&&!options.allowWatched));
        item.querySelector('.symbol-exchange').textContent=exists?s('watch.following'):row.exchange||'';return;}
      const state=actionState(row), cell=item.querySelector('.symbol-action-cell');
      item.classList.toggle('symbol-blocked',!state.gate.eligible);
      item.querySelector('.symbol-select').disabled=!selectable(row);
      let button=cell.querySelector('button');
      if(!state.gate.eligible){
        if(button&&button===document.activeElement)focusInput();
        clear(cell);cell.append(el('span.symbol-reason',state.gate.reason));return;
      }
      if(!button){
        clear(cell);button=el('button.btn.btn-primary.symbol-add',{type:'button',tabindex:-1,
          onclick:e=>{e.stopPropagation();add(row);}});cell.append(button);
      }
      button.disabled=state.disabled;
      button.textContent=state.exists?s('symbol.following'):state.busy?s('watch.adding'):state.label||s('watch.add');
      button.setAttribute('aria-label',state.exists?s('symbol.following_ticker',{t:row.ticker}):s('symbol.add_ticker',{t:row.ticker}));
      button.setAttribute('aria-busy',String(!!state.busy));
      button.title=state.exists?s('watch.following'):state.reason||'';
      item.querySelector('.symbol-action-note')?.remove();
      if(state.reason&&!state.exists&&!state.busy)cell.append(el('span.symbol-action-note',state.reason));
    });
  }
  async function add(row){
    if(disposed||!rows.includes(row)||actionState(row).disabled)return;
    const gen=generation;pending.add(row.ticker);update();
    try{
      const result=await options.onAdd(row);
      if(!disposed&&gen===generation)status.textContent=result===false?s('watch.add_unavailable'):s('watch.added',{t:row.ticker});
    }catch{
      if(!disposed&&gen===generation)status.textContent=s('watch.add_unavailable');
    }finally{pending.delete(row.ticker);update();}
  }
  function tags(row){return el('span.symbol-tags',instrumentLabels(row).map(value=>el('span.symbol-tag',value)));}
  function details(row){
    const label=businessLabel(row);
    return el('span.symbol-name',el('span',row.name||row.ticker),actions?null:tags(row),
      actions&&(label||row.exchange)?el('small.symbol-detail.muted',label,
        label&&row.exchange?' · ':null,row.exchange?el('span.symbol-exchange',row.exchange):null):
        label?el('small.muted',label):null);
  }
  function paint(){
    clear(list);list.scrollTop=0;
    rows.forEach((r,i)=>{
      const item=el('div.symbol-option',{id:id+'-'+i,role:actions?'row':'option','aria-selected':'false'});
      if(actions){
        const selectButton=el('button.symbol-select',{type:'button',tabindex:-1,onclick:()=>select(i)},el('span.symbol-identity',el('strong.mono',r.ticker),tags(r)),details(r));
        item.append(el('div.symbol-select-cell',{id:id+'-'+i+'-select',role:'gridcell'},selectButton),
          el('div.symbol-action-cell',{role:'gridcell'}));
        item.addEventListener('focusin',()=>highlight(i,false));
      }else{
        item.append(el('strong.mono',r.ticker),details(r),el('span.symbol-exchange.muted.small'));
        item.addEventListener('pointerdown',e=>e.preventDefault());
        item.addEventListener('click',()=>select(i));
      }
      list.append(item);
    });update();
  }
  function search() {
    if(disposed)return;
    cancel(); close(); const q=input.value.trim();
    if (!q || composing) { reset(); return; }
    const gen=generation;
    timer=setTimeout(async()=>{
      ctl=new AbortController(); status.textContent=s('watch.searching');
      try {
        const doc=await api.symbols(q,{signal:ctl.signal});
        if(disposed||gen!==generation) return;
        rows=Array.isArray(doc?.items)?doc.items:[];paint();
        status.textContent=rows.length?s(actions?'symbol.search_count':'watch.search_count',{n:rows.length,total:doc.total_count ?? rows.length}):s('watch.search_empty');
        if(doc?.status==='limited') status.textContent+=' '+s('watch.search_limited');
        list.hidden=!rows.length; input.setAttribute('aria-expanded',String(!!rows.length));
        options.onResults?.(rows);fitPopup();
      } catch {
        if(disposed||gen!==generation) return;
        close(); status.textContent=s('watch.search_unavailable');
      }
    },180);
  }
  function nextIndex(from,dir){
    let i=from<0&&dir<0?0:from;
    for(let n=0;n<rows.length;n++) { i=(i+dir+rows.length)%rows.length; if(selectable(rows[i])) return i; }
    return -1;
  }
  function focusCell(i,action=false){
    if(i<0)return;
    const row=list.children[i],button=action?row.querySelector('.symbol-add:not(:disabled)'):null;
    const target=button||row.querySelector('.symbol-select:not(:disabled)');
    target?.focus({preventScroll:true});target?.scrollIntoView?.({block:'nearest'});
  }
  function key(e) {
    if(composing||e.isComposing) return;
    if(e.key==='Escape') { cancel();close();return; }
    if(list.hidden) return;
    if(e.key==='ArrowDown'||e.key==='ArrowUp') {
      e.preventDefault();highlight(nextIndex(active,e.key==='ArrowDown'?1:-1));
    } else if(e.key==='Enter'&&active>=0) { e.preventDefault();e.stopPropagation();select(active); }
    else if(actions&&((e.key==='Tab'&&!e.shiftKey)||(e.key==='ArrowRight'&&active>=0))){
      const i=active>=0?active:nextIndex(-1,1);
      if(i>=0){e.preventDefault();focusCell(i,true);}
    }
  }
  function gridKey(e){
    if(!actions||e.isComposing)return;
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancel();close();focusInput();}
    else if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault();focusCell(nextIndex(active,e.key==='ArrowDown'?1:-1),e.target.classList.contains('symbol-add'));
    }else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
      e.preventDefault();focusCell(active,e.key==='ArrowRight');
    }else if(e.key==='Home'||e.key==='End'){
      e.preventDefault();focusCell(nextIndex(e.key==='Home'?-1:0,e.key==='Home'?1:-1));
    }
  }
  // Pointer and keyboard movement into the popup belongs to this same interaction.
  const blur=e=>{if(!wrap.contains(e.relatedTarget)){cancel();close();}};
  const focus=()=>{if(!quietFocus&&list.hidden)search();};
  const start=()=>{composing=true;cancel();close();};
  const end=()=>{composing=false;search();};
  input.addEventListener('input',search); input.addEventListener('focus',focus);
  input.addEventListener('keydown',key);wrap.addEventListener('focusout',blur);list.addEventListener('keydown',gridKey);
  input.addEventListener('compositionstart',start); input.addEventListener('compositionend',end);
  window.addEventListener('resize',fitPopup);document.addEventListener('scroll',fitPopup,true);
  window.visualViewport?.addEventListener('resize',fitPopup);window.visualViewport?.addEventListener('scroll',fitPopup);
  return {wrap,reset,update,dispose(){disposed=true;reset();
    for(const [event,fn] of [['input',search],['focus',focus],['keydown',key],['compositionstart',start],['compositionend',end]]) input.removeEventListener(event,fn);
    wrap.removeEventListener('focusout',blur);list.removeEventListener('keydown',gridKey);
    window.removeEventListener('resize',fitPopup);document.removeEventListener('scroll',fitPopup,true);
    window.visualViewport?.removeEventListener('resize',fitPopup);window.visualViewport?.removeEventListener('scroll',fitPopup);
  }};
}
