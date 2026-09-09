import {s,LANG} from '../strings.js';
import {el,clear,errorBox} from '../ui.js';
import * as api from '../api.js';
import * as store from '../store.js';
import {itemRow} from './boards.js';
import {REPORT_KINDS,recordHref} from '../record-format.js';
import {selectNavigation} from '../navigation.js';
export async function mount(root,route={}){
 const epoch=store.epoch();
 try{
  let data;
  if((route.id||'').startsWith('example:')){
   const response=await fetch('/radar-history.json',{signal:route.signal});if(!response.ok)throw new Error(s('reader.unavailable'));const doc=await response.json();
   const saved=doc.items?.find(r=>'example:'+r.id===route.id);
   if(!saved)throw new Error(s('reader.unavailable'));
   data={item:{...saved,id:route.id,archived:true,summary:saved.summary?.[LANG],extra:{message_text:saved.body?.[LANG]||''}}};
  }else data=await api.get((!!store.get('me')?'/radar/record.json?':'/public/radar/record.json?')+new URLSearchParams({id:route.id||''}),{auth:!!store.get('me'),signal:route.signal});
  if(route.signal?.aborted || epoch!==store.epoch())return;
  const row=data.item,parent=(REPORT_KINDS.has(row.kind)||['liquidity','digest','volscan','hiring'].includes(row.board))?'reports':'boards';
  // Both translation receipts and source-delivery aliases resolve to this one address.
  history.replaceState(null,'',recordHref(row));selectNavigation(parent);
  const page=el('article.record-reader'),content=el('div'),controls=el('div.record-language');
  const render=language=>{clear(content);content.append(itemRow(row,{standalone:true,language}));
   controls.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.language===language)));};
  if(row.extra?.message_en && row.extra?.message_zh)for(const language of ['zh','en'])controls.append(el('button.btn.btn-ghost.btn-sm',{type:'button','data-language':language,onclick:()=>render(language)},language==='zh'?'中文':'English'));
  page.append(el('nav.record-breadcrumb',{'aria-label':s('reader.location')},el('a',{href:'#/'+parent},s('nav.'+parent)),el('span',{'aria-hidden':'true'},'/'),el('span',s('reader.record'))),
   controls,content);root.append(page);render(LANG);
 }catch(e){if(!route.signal?.aborted && epoch===store.epoch()){if(e.status===404){root.append(el('p',s('reader.unavailable')),el('a.btn.btn-ghost',{href:'#/reports'},s('nav.reports')));}else root.append(errorBox(e,()=>{clear(root);mount(root,route);}));}}
}
