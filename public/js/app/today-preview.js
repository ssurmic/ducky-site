// Saved calendar facts belong to this digest revision. Rendering never fetches or predicts.
import {el} from './ui.js';
import {s,LANG} from './strings.js';
import {sourceDay} from './source-event.js';

const localized=value=>typeof value==='string'?value:String(value?.[LANG==='en'?'en':'zh']||'');
const label=(value,key)=>String(value?.[LANG==='en'?key+'_en':key]||value?.[key]||'');
const https=value=>{try{const url=new URL(value);return url.protocol==='https:'?url.href:null;}catch{return null;}};
const dayAt=now=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const nextDay=day=>new Date(Date.parse(day+'T12:00:00Z')+86400000).toISOString().slice(0,10);
const dayLabel=(day,year=false)=>sourceDay(day)?new Intl.DateTimeFormat(LANG==='en'?'en-US':'zh-CN',
  {timeZone:'UTC',weekday:'short',month:'short',day:'numeric',...(year?{year:'numeric'}:{})}).format(new Date(day+'T12:00:00Z')):'—';
const stamp=value=>{if(typeof value==='string'&&value.length===10&&sourceDay(value))return value;const date=new Date(value||'');return Number.isFinite(date.getTime())?new Intl.DateTimeFormat(LANG==='en'?'en-US':'zh-CN',
  {timeZone:'America/New_York',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(date)+' ET':'—';};

export function previewTime(event){
  const text=label(event,'time');
  // Closure notes can mention the *next* open. Their typed state takes precedence.
  if(event.type==='holiday'||event.timing_status==='closed')return s('today.preview_time_closed');
  if(event.type==='early_close'||event.timing_status==='early_close')return s('today.preview_time_early_close')+
    ((event.close_et||event.time_et)?' · '+String(event.close_et||event.time_et)+' ET':'');
  if(['unknown','unconfirmed'].includes(event.timing_status))return s('today.preview_time_unknown');
  if(event.time_et)return String(event.time_et)+' ET';
  if(['before_open','after_close','during_hours','closed','early_close'].includes(event.timing_status))return s('today.preview_time_'+event.timing_status);
  if(text)return text+(event.time_zone==='America/New_York'&&!/\bET\b/.test(text)?' ET':'');
  if(event.effective_session==='before_open')return s('event.before_open');
  return s('today.preview_time_unknown');
}

function eventRow(event,index,anchor){
  const key='digest-preview:'+anchor+':'+String(event.id||event.event_id||index);
  const impacts=[localized(event.impact),...(Array.isArray(event.impacts)?event.impacts:[]).map(i=>[label(i,'title'),label(i,'body')||localized(i)].filter(Boolean).join(' — '))]
    .filter((v,i,all)=>v&&all.indexOf(v)===i);
  const title=label(event,'title')||s('today.preview_unnamed');
  const tickers=(Array.isArray(event.tickers)?event.tickers:[]).filter(t=>typeof t==='string');
  const head=el('summary',{'data-reading-key':key+':toggle'},
    el('span.today-preview-event-head',el('span.today-preview-time',previewTime(event)),el('strong',title),
      tickers.length?el('span.today-preview-tickers.mono',tickers.join(' · ')):null));
  if(impacts[0])head.append(el('span.today-preview-impact',impacts[0]));
  const row=el('article.today-preview-event',{'data-reading-anchor':key,'data-event-date':sourceDay(event.date)||''});
  const note=label(event,'note');
  const urls=[event.url,event.source_url,...(Array.isArray(event.impacts)?event.impacts:[]).map(i=>i.url)]
    .map(https).filter((url,i,all)=>url&&all.indexOf(url)===i);
  const facts=el('details.today-preview-basis',{'data-reading-key':key+':basis'},head);
  facts.append(el('p.small.muted',s(event.schedule_status==='source_scheduled'?'event.schedule_source':'event.schedule_check')));
  if(['event_type_rule','source_note'].includes(event.impact?.basis))facts.append(el('p.small.muted',s('today.preview_basis_'+event.impact.basis)));
  facts.append(el('p.small.muted',s('today.preview_source_clock',{time:stamp(event.source_observed_at)})));
  if(event.effective_at)facts.append(el('p.small.muted',s('event.effective_date')+': '+String(event.effective_at)));
  if(note)facts.append(el('p',note));
  for(const impact of impacts.slice(1))facts.append(el('p',impact));
  if(!impacts.length)facts.append(el('p.small.muted',s('today.preview_impact_missing')));
  for(const url of urls)facts.append(el('a.today-preview-source',{href:url,target:'_blank',rel:'noopener noreferrer'},s('event.source')+' · '+new URL(url).hostname));
  if(!urls.length)facts.append(el('p.small.muted',s('today.preview_source_missing')));
  row.append(facts);return row;
}

export function digestPreview(preview,session,{now=new Date()}={}){
  // A new calendar must never be attached to an old note, even when the dates look plausible.
  if(!preview||preview.anchor_session!==session||!sourceDay(session)||!sourceDay(preview.calendar_day)||!sourceDay(preview.next_session)||!Array.isArray(preview.events))return null;
  const events=preview.events,coverage=preview.coverage?.status,complete=['ready','empty','complete'].includes(coverage);
  const today=dayAt(now),tomorrow=nextDay(today),relative=session===today;
  const days=[...new Set(events.map(event=>sourceDay(event.date)).filter(Boolean))];
  const onlyToday=days.length===1&&days[0]===today;
  const ordinary=preview.calendar_day===tomorrow&&preview.next_session===tomorrow&&days.every(day=>day===today||day===tomorrow);
  const title=s(!relative?'today.preview_saved_title':onlyToday?'today.preview_today_title':
    ordinary&&days.includes(today)?'today.preview_today_tomorrow':ordinary||days.length===1&&days[0]===tomorrow?
      'today.preview_tomorrow_title':'today.preview_title');
  const headingDay=days.length===1?days[0]:!events.length?preview.calendar_day:null;
  const box=el('section.today-preview',{'aria-label':title},
    el('div.today-preview-heading',el('h3',title),headingDay?el('span.small.muted',dayLabel(headingDay,!relative)):null));
  if(!events.length)box.append(el('p.small.muted.today-preview-empty',s(complete?'today.preview_empty':'today.preview_no_records')));
  function appendRows(host,rows,start){
    let lastDay=null;
    rows.forEach((event,i)=>{
      const day=sourceDay(event.date)||'—';
      if(day!==lastDay&&day!==headingDay){
        const context=relative&&day===today?s('today.preview_day_today')+' · ':relative&&day===tomorrow?s('today.preview_day_tomorrow')+' · ':'';
        host.append(el('h4.today-preview-day',context+dayLabel(day,!relative)));lastDay=day;
      }
      host.append(eventRow(event,start+i,session));
    });
  }
  appendRows(box,events.slice(0,3),0);
  if(events.length>3){
    const key='digest-preview:'+session+':all';
    const more=el('details.today-preview-more',{'data-reading-key':key},
      el('summary',{'data-reading-key':key+':toggle'},s('today.preview_more',{n:events.length-3,total:events.length})));
    appendRows(more,events.slice(3),3);box.append(more);
  }
  const sourceKey='digest-preview:'+session+':sources';
  const sources=el('details.today-preview-sources',{'data-reading-key':sourceKey},
    el('summary',{'data-reading-key':sourceKey+':toggle'},s('today.preview_sources')),
    el('p.small.muted',s(events.length===1?'today.preview_count_one':'today.preview_count',{n:events.length})),
    el('p.small.muted.today-preview-window',s(preview.calendar_day===preview.next_session?'today.preview_window_single':'today.preview_window',
      {day:preview.calendar_day,session:preview.next_session})));
  if(!complete)sources.append(el('p.small.muted.today-preview-coverage',s(coverage==='partial'?'today.preview_partial':'today.preview_unavailable')));
  sources.append(el('p.small.muted.today-preview-clock',s('today.preview_as_of',{time:stamp(preview.observed_at)})));
  box.append(sources);
  const date=sourceDay(preview.calendar_day)||sourceDay(preview.next_session);
  if(date)box.append(el('a.today-preview-calendar',{href:'#/calendar?date='+encodeURIComponent(date),'data-reading-key':'digest-preview:'+session+':calendar'},s('today.preview_calendar')));
  return box;
}
