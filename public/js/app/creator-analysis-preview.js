// The current creator-page renderer, using only the already-public summary example.
// Summary sections remain attributed summaries; they never become transcript quotations.
import {renderCreatorPage} from './views/creator-page.js';
import {el} from './ui.js';
import {s} from './strings.js';

const text=value=>typeof value==='string'&&value.trim()&&value.length<=5000;
const timestamp=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&
  Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value.slice(0,10);
const source=value=>{
  try{
    const url=new URL(value);
    return url.protocol==='https:'&&url.hostname==='www.youtube.com'&&url.pathname==='/watch'&&
      !url.username&&!url.password&&!url.port&&/^[A-Za-z0-9_-]{11}$/.test(url.searchParams.get('v')||'')?url.href:null;
  }catch{return null;}
};
const clock=seconds=>Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');

export function publicCreator(snapshot){
  const url=source(snapshot?.url),sections=snapshot?.sections,duration=snapshot?.source?.duration_seconds;
  if(!url||!text(snapshot?.kol_name)||!text(snapshot?.title)||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/.test(snapshot?.kol_id||'')||
      !timestamp(snapshot?.published_at)||snapshot?.source?.status!=='ready'||
      snapshot.source.summary_reviewed!==true||!Number.isFinite(duration)||duration<=0||
      !Array.isArray(sections)||!sections.length||sections.length>20)throw Error('invalid_public_creator');
  let previous=-1;
  const highlights=sections.map(section=>{
    const start=section?.start_seconds;
    if(!Number.isInteger(start)||start<=previous||start<0||start>=duration||
        !['en','zh'].every(lang=>text(section?.[lang])))throw Error('invalid_public_creator');
    previous=start;
    return {published_at:snapshot.published_at,url,start_seconds:start,
      summary:{en:section.en,zh:section.zh}};
  });
  return {creator:{id:snapshot.kol_id,name:snapshot.kol_name},page:{highlights},
    title:snapshot.title,url,published_at:snapshot.published_at};
}

export function mountPublicCreator(root,snapshot){
  const doc=publicCreator(snapshot),view=el('section.creator-page');
  renderCreatorPage(view,doc);
  // This selection contains one video's summary, not the creator's profile,
  // coverage totals, price studies, account controls or simulation inputs.
  view.querySelectorAll('.creator-page-about,.evidence-controls').forEach(node=>node.remove());
  view.querySelector('.creator-page-heading').after(el('div.creator-preview-source',
    el('h2.cr-video-title',el('a',{href:doc.url,target:'_blank',rel:'noopener noreferrer'},doc.title)),
    el('p.small.muted',s('creators.published')+' '+doc.published_at.slice(0,10))));
  for(const [index,article]of [...view.querySelectorAll('.creator-highlights>article')].entries()){
    const link=article.querySelector('a');
    if(link)link.textContent=clock(doc.page.highlights[index].start_seconds)+' · '+s('creatorpage.source')+' ↗';
  }
  root.replaceChildren(view);
  return view;
}

const root=document.getElementById('creator-analysis-preview');
if(root){
  try{mountPublicCreator(root,JSON.parse(document.getElementById('creator-analysis-data').textContent));}
  catch{root.replaceChildren(el('p.errbox',{role:'status'},s('preview.creator_unavailable')));}
}
