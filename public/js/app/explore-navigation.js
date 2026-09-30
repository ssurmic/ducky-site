import {el} from './ui.js';
import {s} from './strings.js';
import {icon} from './icons.js';

// These are destinations, not in-page tabs. Native links preserve browser history.
export function exploreNavigation(active){
  return el('nav.explore-primary-tools',{'aria-label':s('explore.destinations')},
    ...[
      ['activity','#/boards','boards','explore.company_activity','explore.activity_purpose'],
      ['research','#/explore?tab=research','evidence','explore.stock_research','explore.research_purpose'],
      ['creators','#/creators?scope=discover','creators','focus.explore_creators','explore.creators_purpose'],
    ].map(([key,href,glyph,title,purpose])=>el('a',{
      href,'data-explore-destination':key,'aria-current':active===key?'page':null,
    },icon(glyph),el('span.explore-destination-copy',el('strong',s(title)),el('span',s(purpose))))));
}
