import {el,clear,date} from '../ui.js';
import {s,LANG} from '../strings.js';
import {evidenceTarget} from '../creator-route.js';
import {avatar} from './creator-setup.js';
import {claimQualifications} from './creator-claim.js';
import {safeSource} from './creator-research.js';

// Discovery already checks the current source, identity and correction gates.
// This is a reading entry point, not a performance ranking or corpus-completion claim.
export function starterChoices(doc,{following=new Set(),language=LANG,now=Date.now()}={}) {
  if(doc?.status!=='ready'||!Array.isArray(doc.items))return [];
  const seen=new Set();
  return doc.items.filter(row=>{
    const c=row?.creator,v=row?.latest_view,at=Date.parse(v?.published_at);
    if(row?.status!=='available'||!c?.id||!c.name||following.has(c.id)||seen.has(c.id)||v?.creator_id!==c.id
      ||!['support','counter'].includes(v?.stance)||typeof v.text?.[language]!=='string'||!v.text[language].trim()
      ||!Number.isFinite(at)||at>now||now-at>60*86400000||!safeSource(v.source_url)
      ||!evidenceTarget(v)||(v.conditional&&!v.condition_text))return false;
    seen.add(c.id);return true;
  }).sort((a,b)=>Number(b.creator.lang===language)-Number(a.creator.lang===language)
    ||Date.parse(b.latest_view.published_at)-Date.parse(a.latest_view.published_at)
    ||a.creator.id.localeCompare(b.creator.id)).slice(0,6);
}

export function creatorStarters(doc,{following,state={},onFollow}={}) {
  const choices=starterChoices(doc,{following});
  if(!choices.length)return null;
  if(!choices.some(row=>row.creator.id===state.selected))state.selected=choices[0].creator.id;
  state.paused ??= window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const section=el('section.creator-starters',{'aria-labelledby':'creator-starters-title'});
  const pause=el('button.creator-starters-motion',{type:'button','aria-pressed':String(state.paused),onclick:()=>{
    state.paused=!state.paused;motion();
  }});
  function motion(){section.classList.toggle('is-paused',state.paused);pause.setAttribute('aria-pressed',String(state.paused));pause.textContent=s(state.paused?'creatorstart.resume':'creatorstart.pause');}
  section.append(el('header.creator-starters-heading',el('div',
    el('p.creator-starters-eyebrow',s('creatorstart.eyebrow')),
    el('h2#creator-starters-title',s('creatorstart.title')),
    el('p',s('creatorstart.intro'))),pause));
  const rail=el('div.creator-starters-rail',{'role':'group','aria-label':s('creatorstart.people')});
  const preview=el('div.creator-starters-preview',{'aria-live':'polite','aria-atomic':'true'});
  const buttons=[];
  for(const [index,row] of choices.entries()){
    const c=row.creator;
    const button=el('button.creator-starter-person',{type:'button','aria-label':s('creatorstart.preview',{name:c.name}),
      title:c.name,'data-creator-id':c.id,style:{'--float-delay':`${-index*1.3}s`},onclick:()=>{state.selected=c.id;show();}},
      el('span.creator-starter-portrait',avatar(c),el('span.creator-starter-ready',{'aria-hidden':'true'},'✓')),
      el('span.creator-starter-name',c.name));
    buttons.push(button);rail.append(button);
  }
  function show(){
    const row=choices.find(r=>r.creator.id===state.selected),c=row.creator,v=row.latest_view;
    buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.creatorId===c.id)));
    clear(preview);
    const quote=el('div.creator-starter-quote',
      el('p.creator-starter-byline',el('strong',c.name),' · ',el('span',v.ticker),' · ',el('time',{datetime:v.published_at},date(v.published_at))),
      el('p.creator-starter-excerpt',v.text[LANG]));
    const qualifications=claimQualifications(v);
    if(qualifications)quote.append(el('details.creator-starter-qualifications',
      el('summary',s('creatorstart.qualifications')),qualifications));
    const controls=el('div.creator-starter-actions',
      el('a.btn.btn-ghost.btn-sm',{href:evidenceTarget(v)},s('creatorstart.read')),
      el('button.btn.btn-primary.btn-sm',{type:'button','aria-label':s('creatorstart.follow_name',{name:c.name}),onclick:event=>onFollow?.(c,event.currentTarget)},s('creators.follow')));
    preview.append(quote,controls);
  }
  section.append(rail,preview);motion();show();return section;
}
