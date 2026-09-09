import {el,dateTime} from '../ui.js';
import {s,LANG} from '../strings.js';
import {claimQualifications} from './creator-claim.js';
import {safeSource} from './creator-research.js';

export function discoveryPreview(entry,status='ready') {
  const view=entry?.latest_view;
  if(!view)return el('p.small.muted',s(status==='unavailable'?'creatordiscovery.unavailable':'creatordiscovery.no_view'));
  const text=view.text?.[LANG]||'';
  const box=el('div.creator-discovery-preview',
    el('p.small',el('strong',{class:view.stance==='support'?'cr-bull':'cr-bear'},s('evidence.'+view.stance)),
      ' · ',el('span.mono',view.ticker)),
    el('p.creator-card-gist',text||s('creatordiscovery.translation_missing')),
    el('p.small.muted',s('creatordiscovery.published',{date:dateTime(view.published_at)})));
  const qualifications=claimQualifications(view);if(qualifications)box.append(qualifications);
  if(safeSource(view.source_url))box.append(el('a.btn.btn-ghost.btn-sm',{href:view.source_url,target:'_blank',rel:'noopener noreferrer'},s('creatordiscovery.source')+' ↗'));
  if(entry.coverage?.scan_limited)box.append(el('p.small.muted',s('creatordiscovery.limited')));
  return box;
}
