import {el,dateTime} from '../ui.js';
import {s,LANG} from '../strings.js';
import {claimQualifications} from './creator-claim.js';
import {safeSource} from './creator-research.js';
import {evidenceTarget} from '../creator-route.js';

export function discoveryPreview(entry,status='ready') {
  const view=entry?.latest_view;
  if(!view)return el('p.small.muted',s(status==='unavailable'?'creatordiscovery.unavailable':'creatordiscovery.no_view'));
  const text=view.text?.[LANG]||'';
  const box=el('div.creator-discovery-preview',
    el('p.creator-discovery-stance',el('span',{class:'creator-discovery-badge '+(view.stance==='support'?'is-bull':'is-bear')},s('evidence.'+view.stance)),
      el('strong.mono',view.ticker)),
    el('p.creator-card-gist',text||s('creatordiscovery.translation_missing')));
  const qualifications=claimQualifications(view);if(qualifications)box.append(el('details.creator-discovery-qualifications',
    el('summary',s('creatorstart.qualifications')),qualifications));
  box.append(el('time.creator-discovery-date',{datetime:view.published_at||''},s('creatordiscovery.published',{date:dateTime(view.published_at)})));
  const links=el('div.creator-discovery-links');
  const target=evidenceTarget(view);
  if(target)links.append(el('a',{href:target},s('creatorstart.read')+' →'));
  if(safeSource(view.source_url))links.append(el('a',{href:view.source_url,target:'_blank',rel:'noopener noreferrer'},s('creatordiscovery.source')+' ↗'));
  if(links.childElementCount)box.append(links);
  if(entry.coverage?.scan_limited)box.append(el('p.small.muted',s('creatordiscovery.limited')));
  return box;
}
