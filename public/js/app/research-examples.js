import {el} from './ui.js';
import {s} from './strings.js';
import {icon} from './icons.js';

// Navigation to explicitly dated public cases, plus a live saved evidence map.
// These are reading examples, not invented research or buy recommendations.
export function researchExamples(){
  return el('section.research-examples',el('h2',s('focus.examples_title')),
    el('p.small.muted',s('focus.examples_note')),
    el('div.research-example-grid',...[
      ['nvda','#/evidence/NVDA'],['nok','#/evidence/NOK?example=NOK'],['glw','#/evidence/GLW?example=GLW']
    ].map(([key,href])=>el('a.research-example',{href},icon('evidence'),
      el('strong',s('focus.example_'+key)),el('span.small.muted',s('focus.example_'+key+'_note')),el('span.example-arrow',{'aria-hidden':'true'},'→')))));
}
