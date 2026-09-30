// Current video summaries stay beside the map; they never enter its evidence counts or scoring.
import {el} from './ui.js';
import {s} from './strings.js';
import {mountCreatorOpinions} from './creator-opinions.js';

export function mountMapOpinions(host,{ticker,signal,from='watchlist'}={}){
  const reader=mountCreatorOpinions(host,{ticker,signal,from,rail:true,title:s('opinions.map_title',{ticker})});
  const entry=el('button.btn.btn-ghost.btn-sm',{type:'button','data-map-video-views':ticker,onclick:()=>{
    const heading=host.querySelector('h2');
    heading?.scrollIntoView?.({block:'start',behavior:'auto'});heading?.focus({preventScroll:true});
  }},s('opinions.map_entry'));
  return {entry,ready:reader.ready,dispose(){reader.dispose();entry.remove();host.replaceChildren();}};
}
