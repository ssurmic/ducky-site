import {el} from '../ui.js';
import {s} from '../strings.js';
import {symbolPicker} from '../symbol-picker.js';
import {stockHref} from '../stock-reading.js';
import {mount as researchFeed} from './today.js';

export async function mount(root,{signal}={}){
  root.classList.add('focus-explore');
  const input=el('input.input',{type:'search',placeholder:s('focus.find_stock'),'aria-label':s('focus.find_stock'),autocomplete:'off'});
  const picker=symbolPicker(input,()=>[],{allowWatched:true,onSelect:row=>{location.hash=stockHref(row.ticker,'explore');}});
  root.append(el('header.focus-heading',el('div',el('h1',s('focus.explore')),el('p.muted',s('focus.explore_intro')))),picker.wrap);
  const links=el('div.focus-explore-links');
  for(const [route,key] of [['creators','creators'],['calendar','calendar'],['boards','company_events']])
    links.append(el('a.focus-explore-link',{href:'#/'+route},el('strong',s('focus.explore_'+key)),el('span.muted',s('focus.explore_'+key+'_note'))));
  root.append(links);
  const deep=el('details.focus-tools',el('summary',s('focus.more_tools')),el('div.focus-tool-links',
    ...[['opportunities','opportunities'],['vibe','vibe'],['reports','reports'],['briefing','briefing'],['chart','chart'],['alerts','alerts']].map(([route,key])=>
      el('a.btn.btn-ghost',{href:'#/'+route},s('nav.'+key)))));
  root.append(deep,el('h2',s('focus.discover_research')));
  const feed=el('div');root.append(feed);
  const dispose=await researchFeed(feed,{signal,scope:'all',embedded:true});
  return()=>{picker.dispose();dispose?.();};
}
