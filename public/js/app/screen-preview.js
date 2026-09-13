import {mountScreen} from './views/signal-screen.js';
import {el} from './ui.js';
import {s} from './strings.js';

export function mountScreenPreview(root){
  return mountScreen(root,{localOnly:true,query:new URLSearchParams('screen=insider-oversold')});
}

const root=document.getElementById('screen-preview');
if(root){
  try{
    const dispose=mountScreenPreview(root);
    window.addEventListener('pagehide',dispose,{once:true});
  }catch{
    root.replaceChildren(el('p.errbox',{role:'status'},s('preview.screen_unavailable')));
  }
}
