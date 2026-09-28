let strings = {};
export function setStrings(value) { strings = value; }
export function t(key, params = {}) { let value = strings['ux.' + key] ?? strings[key] ?? key; for (const [k,v] of Object.entries(params)) value = value.replaceAll('{'+k+'}', String(v)); return value; }
export function h(tag, attrs = {}, ...children) {
 const node = document.createElement(tag);
 if (attrs instanceof Node || typeof attrs !== 'object' || Array.isArray(attrs)) { children.unshift(attrs); attrs = {}; }
 for (const [key,value] of Object.entries(attrs || {})) {
  if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
  else if(key === 'class') node.className = value;
  else if(key === 'style' && typeof value === 'object') Object.assign(node.style,value);
  else if(key === 'textContent') node.textContent=value;
  else if(key==='value') node.value=value;
  else if(key==='checked'||key==='disabled'||key==='selected') node[key]=!!value;
  else if (value !== null && value !== undefined && value !== false) node.setAttribute(key,String(value));
 }
 for (const child of children.flat(Infinity)) if(child !== null && child !== undefined && child !== false) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
 return node;
}
export const button = (label,onClick,className='btn') => h('button',{type:'button',class:className,onClick},label);
export const link = (label,href,className='text-link') => h('a',{href,class:className},label);
export const badge = (label,tone='neutral') => h('span',{class:'badge '+tone},label);
export const money = n => Number.isFinite(n) ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(n) : '—';
export const percent = n => Number.isFinite(n) ? (n>0?'+':'')+n.toFixed(2)+'%' : '—';
export const stockLink = ticker => link(ticker,'#/stock/'+encodeURIComponent(ticker),'ticker-link mono');
export const sectionHead = (title,right) => h('div',{class:'section-head'},h('h2',{},title),right);
const paths={
 home:'M3 10 12 3l9 7v10H3V10m6 10v-7h6v7',list:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',compass:'m16 8-3 5-5 3 3-5 5-3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',calendar:'M4 5h16v16H4V5m0 5h16M8 3v4m8-4v4',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-3.87M13 4a4 4 0 0 1 0 8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',search:'M21 21l-5-5m2-6a8 8 0 1 1-16 0 8 8 0 0 1 16 0',plus:'M12 5v14M5 12h14',arrow:'M4 12h16m-6-6 6 6-6 6',chevron:'m9 5 7 7-7 7',bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4',map:'M5 4h5v5H5zM16 2h5v5h-5zM16 16h5v5h-5zM10 6h3v-2h3M10 7h3v11h3',chart:'M3 3v18h18M6 16l4-5 4 3 6-9',close:'m6 6 12 12M6 18 18 6',check:'m5 12 4 4L20 5',star:'m12 3 3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1 3-6',grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',filter:'M3 5h18M6 12h12M10 19h4',sun:'M12 3V1m0 22v-2M3 12H1m22 0h-2M4 4 2 2m20 20-2-2M4 20l-2 2M22 2l-2 2M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',moon:'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11',settings:'M4 7h16M4 17h16M9 4v6m6 4v6',bookmark:'M6 3h12v18l-6-4-6 4V3',external:'M14 3h7v7m0-7-11 11M10 3H3v18h18v-7',info:'M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',clock:'M12 6v6l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0'};
export function icon(name,size=18) { const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); for(const [k,v] of Object.entries({width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':1.65,'stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':true}))svg.setAttribute(k,String(v));const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',paths[name]||paths.info);svg.append(p);return svg; }
let toastTimer;
export function toast(message) {let node=document.getElementById('toast');if(!node)return;node.replaceChildren(icon('check',17),h('span',{},message));node.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('visible'),3600);}
export function showDialog({title,content,wide=false}) {
 const previous=document.activeElement; const dialog=h('dialog',{class:'dialog'+(wide?' wide':'')});
 const close=()=>dialog.close();const closeButton=button(icon('close'),close,'icon-btn');closeButton.setAttribute('aria-label',t('common.close'));
 const id='dialog-title-'+Math.random().toString(36).slice(2);dialog.setAttribute('aria-labelledby',id);
 dialog.append(h('div',{class:'dialog-heading'},h('h2',{id},title),closeButton),h('div',{class:'dialog-body'},content));
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
 dialog.addEventListener('close',()=>{dialog.remove();if(previous?.isConnected)previous.focus({preventScroll:true});},{once:true});
 document.body.append(dialog);dialog.showModal();return {close};
}
