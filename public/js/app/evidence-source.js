import {el} from './ui.js';
import {s} from './strings.js';
import {icon} from './icons.js';

// Source identity is independent of a point's stance. Never infer a platform
// from an author's name, a title, or an arbitrary substring in a URL.
export function sourceIdentity(e={}) {
  if(e.topic==='macro_background'||e.kind==='macro')return 'macro';
  if(e.topic==='reddit_attention')return 'reddit';
  let host='';
  if(e.source_url){
    try {
      const url=new URL(e.source_url);
      if(url.protocol!=='https:'||url.username||url.password)return e.kind==='creator'?'creator':'data';
      host=url.hostname.toLowerCase();
    } catch { return e.kind==='creator'?'creator':'data'; }
  }
  const domain=name=>host===name||host.endsWith('.'+name);
  if(domain('youtube.com')||host==='youtu.be'||domain('youtube-nocookie.com'))return 'youtube';
  if(domain('x.com')||domain('twitter.com'))return 'x';
  if(domain('reddit.com')||host==='redd.it')return 'reddit';
  if(domain('substack.com'))return 'substack';
  if(domain('sec.gov'))return 'filing';
  // A stored platform can identify a source whose link was not retained.
  if(!e.source_url){
    const platform=String(e.platform||'').toLowerCase();
    if(['youtube','x','reddit','substack'].includes(platform))return platform;
    if(platform==='twitter')return 'x';
  }
  return e.kind==='creator'?'creator':'data';
}

export function nodeSourceIdentity(node) {
  const kinds=[...new Set((node.evidence||[]).map(sourceIdentity))];
  return kinds.length===1?kinds[0]:kinds.length?'mixed':'data';
}

export function sourceMark(kind) {
  if(!['youtube','x'].includes(kind))return icon(({macro:'liquidity',filing:'briefing',data:'briefing',mixed:'briefing',creator:'creators',reddit:'creators',substack:'briefing'})[kind]||'briefing');
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  for(const [key,value]of Object.entries({class:'evidence-brand-mark',viewBox:'0 0 24 24',fill:'currentColor','aria-hidden':'true',focusable:'false'}))svg.setAttribute(key,value);
  const path=document.createElementNS(ns,'path');
  path.setAttribute('fill-rule','evenodd');
  path.setAttribute('d',kind==='youtube'?
    'M5 4.5h14a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4v-7a4 4 0 0 1 4-4ZM10 8.5v7l6-3.5-6-3.5Z':
    'M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l8.2-9.4L2.8 2h6.5l4.5 6.7L18.9 2ZM17.9 20h1.7L8.2 3.9H6.4L17.9 20Z');
  svg.append(path);return svg;
}

export function sourceBadge(kind) {
  return el('span.evidence-source-badge',{class:'source-'+kind},sourceMark(kind),el('span',s('evidence.source_'+kind)));
}
