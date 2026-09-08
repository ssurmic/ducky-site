import {el} from './ui.js';
import {s} from './strings.js';
import * as store from './store.js';

export function freeGuide() {
  const me=store.get('me')||{}, x=me.experience;
  if(store.isPaid()||!x)return null;
  const items=[['watches','watchlist',x.watches?.cap],['evidence','evidence',x.evidence?.cap],
    ['creators','creators',x.creators?.cap],['alerts','alerts',x.alerts?.cap]];
  return el('section.free-guide',{'aria-label':s('experience.included')},
    el('div.free-guide-heading',el('strong',s('experience.included')),el('a',{href:'#/billing'},s('experience.compare'))),
    el('div.free-guide-links',...items.filter(([, ,cap])=>Number.isFinite(cap)).map(([key,route,cap])=>
      el('a',{href:'#/'+route},s('experience.allow_'+key,{cap})))));
}

export function quotaNote(feature,used,cap) {
  if(!Number.isFinite(cap))return null;
  return el('div.experience-quota',{'aria-live':'polite'},
    el('span',s('experience.usage_'+feature,{used,cap})),
    used>=cap?el('span',s('experience.replace')):null,
    el('a',{href:'#/billing'},s('experience.more')));
}
