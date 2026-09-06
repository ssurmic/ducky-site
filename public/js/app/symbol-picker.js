// Accessible asynchronous combobox. Selecting a result never submits a watch.
import { el, clear } from './ui.js';
import { s } from './strings.js';
import * as api from './api.js';
let sequence = 0;

export function symbolPicker(input, watched = () => []) {
  const id = 'symbol-options-' + (++sequence);
  const list = el('div.symbol-options', { id, role:'listbox', hidden:true });
  const status = el('div.symbol-status.muted.small', { role:'status', 'aria-live':'polite' });
  const wrap = el('div.symbol-picker', input, list, status);
  input.setAttribute('role','combobox'); input.setAttribute('aria-autocomplete','list');
  input.setAttribute('aria-controls',id); input.setAttribute('aria-expanded','false');
  let timer, ctl, generation=0, active=-1, rows=[], disposed=false, composing=false;
  function close() { list.hidden=true; input.setAttribute('aria-expanded','false'); input.removeAttribute('aria-activedescendant'); active=-1; }
  function cancel() { clearTimeout(timer); ctl?.abort(); ++generation; }
  function reset() { cancel(); close(); clear(list); status.textContent=''; rows=[]; }
  function select(i) {
    if (!rows[i] || watched().includes(rows[i].ticker)) return;
    input.value=rows[i].ticker; reset(); input.focus();
  }
  function highlight(i) {
    active=i;
    for (const [j,node] of Array.from(list.children).entries()) node.setAttribute('aria-selected',String(j===i));
    if (i>=0) { input.setAttribute('aria-activedescendant',id+'-'+i); list.children[i]?.scrollIntoView?.({block:'nearest'}); }
    else input.removeAttribute('aria-activedescendant');
  }
  function search() {
    cancel(); close(); const q=input.value.trim();
    if (!q || composing) { reset(); return; }
    const gen=generation;
    timer=setTimeout(async()=>{
      ctl=new AbortController(); status.textContent=s('watch.searching');
      try {
        const doc=await api.symbols(q,{signal:ctl.signal});
        if(disposed||gen!==generation) return;
        rows=Array.isArray(doc?.items)?doc.items:[]; clear(list);
        rows.forEach((r,i)=>{
          const exists=watched().includes(r.ticker);
          const item=el('div.symbol-option',{id:id+'-'+i,role:'option','aria-selected':'false','aria-disabled':String(exists)},
            el('strong.mono',r.ticker), el('span.symbol-name',r.name),
            el('span.symbol-exchange.muted.small',exists?s('watch.following'):r.exchange||r.kind||''));
          item.addEventListener('pointerdown',e=>e.preventDefault());
          item.addEventListener('click',()=>select(i)); list.append(item);
        });
        status.textContent=rows.length?s('watch.search_count',{n:rows.length}):s('watch.search_empty');
        if(doc?.status==='limited') status.textContent+=' '+s('watch.search_limited');
        list.hidden=!rows.length; input.setAttribute('aria-expanded',String(!!rows.length));
      } catch(e) {
        if(disposed||gen!==generation) return;
        close(); status.textContent=s('watch.search_unavailable');
      }
    },180);
  }
  function key(e) {
    if(composing||e.isComposing) return;
    if(e.key==='Escape') { cancel();close();return; }
    if(list.hidden) return;
    if(e.key==='ArrowDown'||e.key==='ArrowUp') {
      e.preventDefault(); const dir=e.key==='ArrowDown'?1:-1;
      let i=active;
      for(let n=0;n<rows.length;n++) { i=(i+dir+rows.length)%rows.length; if(!watched().includes(rows[i].ticker)) break; }
      highlight(i);
    } else if(e.key==='Enter'&&active>=0) { e.preventDefault();e.stopPropagation();select(active); }
  }
  const blur=()=>{cancel();close();};
  const start=()=>{composing=true;cancel();close();};
  const end=()=>{composing=false;search();};
  input.addEventListener('input',search); input.addEventListener('focus',search);
  input.addEventListener('keydown',key); input.addEventListener('blur',blur);
  input.addEventListener('compositionstart',start); input.addEventListener('compositionend',end);
  return {wrap,reset,dispose(){disposed=true;reset();
    for(const [event,fn] of [['input',search],['focus',search],['keydown',key],['blur',blur],['compositionstart',start],['compositionend',end]]) input.removeEventListener(event,fn);
  }};
}
