import { el } from '../ui.js';
import { s } from '../strings.js';
import * as store from '../store.js';
import { mountSocial } from './social-tracking.js';
import { mountMacroBeta } from '../macro-beta.js';
import { mountScreen, mountSavedScreens } from './signal-screen.js';

export function mount(root,route={}) {
  const name=store.get('route')?.name||'vibe';
  if(name==='vibe')return mountSocial(root,{...route,view:name});
  root.append(el('div.view-head',el('h1',s('nav.'+name))));
  const cleanups=[];
  if(name==='macro')cleanups.push(mountMacroBeta(root));
  else {
    const query=new URLSearchParams(route.query);query.set('screening','1');
    cleanups.push(mountScreen(root,{...route,query}),mountSavedScreens(root,route));
  }
  const cleanup=()=>cleanups.splice(0).forEach(fn=>fn?.());
  route.signal?.addEventListener('abort',cleanup,{once:true});return cleanup;
}
