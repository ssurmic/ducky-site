// Presentation only: never infer a missing price, ticker, source, or event date.
import {el} from './ui.js';
import {s,LANG} from './strings.js';
export const REPORT_KINDS=new Set(['digest','market','macro','liquidity','kindex','volscan','hiring','weekpreview','default']);
export const recordHref=row=>'#/record/'+encodeURIComponent(String(row.id));
export function cleanMessage(text,language=LANG){
 const reference=s('reader.saved_refs_'+(language==='en'?'en':'zh'));
 return String(text||'').replace(/[\p{Regional_Indicator}🧭🔔🌊📉📅🎯🔗🧑💻\uFE0F\u200D]/gu,'')
  .replace(/\[private reminder reference removed\]/g,reference)
  .replace(/\*{1,2}([^*\n]+)\*{1,2}/g,'$1').replace(/(^|\s)_([^_\n]+)_(?=\s|$)/g,'$1$2')
  .replace(/\(entry-[A-Za-z0-9-]+(?:,\s*entry-[A-Za-z0-9-]+)*\)/g,'').replace(/entry-[A-Za-z0-9-]+(?:[,、]\s*entry-[A-Za-z0-9-]+)*/g,reference)
  .replace(/^\s*#{1,6}\s+/gm,'').replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'$1 ($2)').trim();
}
export function recordDocument(row,language=LANG){
 const extra=row.extra||{}, original=(language==='zh'?extra.message_zh:extra.message_en)||extra.message_text||row.summary||extra.message_zh||extra.message_en||'';
 // Older shared reports store both languages in one original message. Select an
 // existing portion; never translate or generate content while reading a record.
 const bilingual=String(original).split(/\s*===CN===\s*/);
 const raw=bilingual.length===2?(language==='zh'?bilingual[1]:bilingual[0]):String(original);
 const lines=raw.split('\n'),header=lines[0]||'';
 const report=REPORT_KINDS.has(row.kind), datedHeader=report && /\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}[–-]\d{2}\/\d{2}/.test(header) && header.length<190;
 let title=datedHeader?cleanMessage(header).replace(/\s*[·—–-]?\s*\d{4}-\d{2}-\d{2}.*$/,'').trim():'';
 const known={digest:'digest',macro:'macro',volscan:'volscan',hiring:'hiring',weekpreview:'weekpreview'};
 if(datedHeader && known[row.kind])title=s('reader.title_'+known[row.kind]);
 if(datedHeader && row.kind==='market')title=s(/Weekly|每周/.test(header)?'reader.title_weekly':'reader.title_market');
 if(!title)title=row.ticker?'$'+row.ticker:row.issuer_name||s(row.archived?'boards.t_'+row.board:'radar.kind_'+row.kind);
 const text=(datedHeader?lines.slice(1).join('\n'):raw).trim();
 const blocks=[];
 const separated=text.replace(/\s*(\[[A-F]\]\s+)/g,'\n\n$1').replace(/\s*(【[^】\n]{2,80}】)/g,'\n\n$1\n')
  .replace(/\s*🎯\s*\*([A-Z][A-Z0-9.-]{0,9})\*/g,'\n\n### $$$1\n');
 for(const part of separated.split(/\n\s*\n/).filter(x=>x.trim())){
  let value=part.trim(), heading='';
  const labeled=value.match(/^\[([A-F])\]\s*([^\n—]+)\s*[—\n]\s*([\s\S]*)$/);
  const bracket=value.match(/^【([^】]+)】\s*([\s\S]*)$/);
  const markdown=value.match(/^###\s*([^\n]+)\n([\s\S]*)$/);
  if(labeled){heading=cleanMessage(labeled[2]);value=labeled[3];}
  else if(bracket){heading=cleanMessage(bracket[1]);value=bracket[2];}
  else if(markdown){heading=cleanMessage(markdown[1]);value=markdown[2].replace(/^\s*[·•]\s*/,'');}
  blocks.push({heading,text:cleanMessage(value,language)});
 }
 for(const block of blocks){
  const parts=block.heading.split(/\s+\/\s+/);
  if(parts.length===2 && parts.some(p=>/[\u3400-\u9fff]/.test(p))){block.heading=parts.find(p=>language==='zh'?/[\u3400-\u9fff]/.test(p):!/[\u3400-\u9fff]/.test(p))||block.heading;}
 }
 // A few Chinese characters may be an attributed name inside English prose.
 // Withhold Chinese prose only for our reports; original news/creator wording
 // remains untouched. A missing English version is separate from a missing report.
 const chineseProse=blocks.some(block=>{
  const text=block.heading+' '+block.text,han=(text.match(/[\u3400-\u9fff]/g)||[]).length,latin=(text.match(/[a-z]/gi)||[]).length;
  return han>0 && (han>latin || han>=4 && han/(han+latin)>.15);
 });
 const englishUnavailable=report && language==='en' && (chineseProse || (!raw.trim() && Boolean(String(original).trim())));
 const first=blocks.find(b=>b.text),lead=englishUnavailable?s('reader.english_unavailable'):first?([first.heading,first.text].filter(Boolean).join(' · ')):'';
 if(englishUnavailable)title=row.ticker?'$'+row.ticker:s(known[row.kind]?'reader.title_'+known[row.kind]:'radar.kind_'+row.kind);
 return {title,raw:String(original),truncated:language==='zh'&&extra.message_zh?extra.translation_message_truncated:extra.message_truncated,hasBody:Boolean(extra.message_text||extra.message_en||extra.message_zh||englishUnavailable),blocks:englishUnavailable?[]:blocks,englishUnavailable,lead:lead.length>170?lead.slice(0,170)+'…':lead,report,
  language:language==='zh'&&extra.message_zh?'zh':language==='en'&&extra.message_en?'en':null};
}
function paragraph(text){
 const node=el('p');let last=0;
 for(const match of text.matchAll(/https:\/\/[^\s<>]+/g)){
  node.append(document.createTextNode(text.slice(last,match.index)));
  const url=match[0].replace(/[)）。，,;；]+$/,'');
  let parsed;try{parsed=new URL(url);}catch{}
  if(parsed?.protocol==='https:' && !parsed.username && !parsed.password)node.append(el('a',{href:parsed.href,target:'_blank',rel:'noopener noreferrer'},parsed.hostname));
  else node.append(document.createTextNode(url));
  node.append(document.createTextNode(match[0].slice(url.length)));last=match.index+match[0].length;
 }
 node.append(document.createTextNode(text.slice(last)));return node;
}
export function renderDocument(doc){
 const body=el('div.record-prose');
 if(doc.englishUnavailable)body.append(el('p.record-language-notice',s('reader.english_unavailable_detail')));
 for(const block of doc.blocks){const section=el('section');if(block.heading)section.append(el('h2',block.heading));
  for(const line of block.text.split('\n').filter(Boolean))section.append(paragraph(line));body.append(section);}
 return body;
}
