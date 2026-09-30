import {el,dateTime,modal} from '../ui.js';
import {s,LANG} from '../strings.js';
import {claimQualifications} from './creator-claim.js';
import {safeSource} from './creator-research.js';
import {evidenceTarget} from '../creator-route.js';

export function discoveryPreview(entry,status='ready',{compact=false}={}) {
  const view=entry?.latest_view;
  if(!view)return el('p.small.muted',s(status==='unavailable'?'creatordiscovery.unavailable':'creatordiscovery.no_view'));
  const text=view.text?.[LANG]||'';
  if(compact){
    const qualification=claimQualifications(view);
    const open=el('button.creator-discovery-open',{type:'button','data-reading-key':'discovery:'+view.creator_id+':'+view.point_id+':open',
      onclick:()=>modal((entry.creator?.name||view.creator_id)+' · '+s('creatorrail.source'),discoveryPreview(entry,status))},
      el('span.creator-card-gist',text||s('creatordiscovery.translation_missing')),
      el('time.creator-discovery-date',{datetime:view.published_at||''},String(view.published_at||'').slice(0,10)||'—'),
      qualification?el('span.creator-preview-caveat',s('creatorrail.qualified')):null,
      el('span.creator-preview-read',s('creatorrail.read')));
    return el('div.creator-discovery-preview.is-compact',
      el('p.creator-discovery-stance',el('span',{class:'creator-discovery-badge '+(view.stance==='support'?'is-bull':view.stance==='counter'?'is-bear':'')},s('evidence.'+view.stance)),
        el('a',{href:'#/stock/'+encodeURIComponent(view.ticker)+'?from=creators','aria-label':s('creatorsux.research_stock',{ticker:view.ticker}),'data-reading-key':'creator-discovery:'+view.creator_id+':'+view.point_id+':stock'},el('span.ticker-symbol',view.ticker))),
      open,entry.coverage?.scan_limited?el('span.small.muted',s('creatordiscovery.limited')):null);
  }
  const box=el('div.creator-discovery-preview',
    el('p.creator-discovery-stance',el('span',{class:'creator-discovery-badge '+(view.stance==='support'?'is-bull':'is-bear')},s('evidence.'+view.stance)),
      el('a.mono',{href:'#/stock/'+encodeURIComponent(view.ticker)+'?from=creators',
        'aria-label':s('creatorsux.research_stock',{ticker:view.ticker}),
        'data-reading-key':'creator-discovery:'+view.creator_id+':'+view.point_id+':stock'},el('span.ticker-symbol',view.ticker))),
    el('p.creator-card-gist',text||s('creatordiscovery.translation_missing')));
  const qualifications=claimQualifications(view);if(qualifications)box.append(el('div.creator-discovery-qualifications',qualifications));
  box.append(el('time.creator-discovery-date',{datetime:view.published_at||''},s('creatordiscovery.published',{date:dateTime(view.published_at)})));
  const links=el('div.creator-discovery-links');
  const target=evidenceTarget(view);
  if(target)links.append(el('a',{href:target},s('creatorstart.read')+' →'));
  if(safeSource(view.source_url))links.append(el('a',{href:view.source_url,target:'_blank',rel:'noopener noreferrer'},s('creatordiscovery.source')+' ↗'));
  if(links.childElementCount)box.append(links);
  if(entry.coverage?.scan_limited)box.append(el('p.small.muted',s('creatordiscovery.limited')));
  return box;
}
