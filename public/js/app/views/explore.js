import {el} from '../ui.js';
import {s} from '../strings.js';
import {symbolPicker} from '../symbol-picker.js';
import {stockHref} from '../stock-reading.js';
import {mount as researchFeed} from './today.js';
import {discoverStarters} from '../research-examples.js';
import {icon} from '../icons.js';

export async function mount(root,{signal}={}){
  root.classList.add('focus-explore');
  const input=el('input.input',{type:'search',placeholder:s('focus.find_stock'),'aria-label':s('focus.find_stock'),autocomplete:'off'});
  const picker=symbolPicker(input,()=>[],{allowWatched:true,onSelect:row=>{location.hash=stockHref(row.ticker,'explore');}});
  root.append(el('header.focus-heading',el('div',el('h1',s('focus.explore')),el('p.muted',s('focus.explore_intro')))),picker.wrap);
  // What people are talking about first, then who said what this week, then the tools: a reader
  // lands on live records, never on a fixed set of old cases.
  root.append(discoverStarters({signal}));
  root.append(el('h2',s('focus.discover_research')),el('p.small.muted',s('focus.discover_research_note')));
  const feed=el('div');root.append(feed);
  const links=el('div.focus-explore-links');
  for(const [route,key,image] of [['evidence','map','evidence'],['creators?scope=discover','creators','creators'],['boards','company_events','boards']])
    links.append(el('a.focus-explore-link',{href:'#/'+route},icon(image),el('strong',s('focus.explore_'+key)),el('span.muted',s('focus.explore_'+key+'_note'))));
  root.append(el('h2',s('focus.tools_title')),links);
  root.append(el('div.focus-tools',el('div.focus-tool-links',
    ...[['opportunities','opportunities'],['vibe','vibe'],['reports','reports'],['briefing','briefing'],['chart','chart'],['alerts','alerts']].map(([route,key])=>
      el('a.btn.btn-ghost',{href:'#/'+route},s('nav.'+key))))));
  const dispose=await researchFeed(feed,{signal,scope:'all',embedded:true,initialDays:7});
  return()=>{picker.dispose();dispose?.();};
}
