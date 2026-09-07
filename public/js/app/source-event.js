import {s, LANG} from './strings.js';

// Source dates are facts, not the time at which Ducky happened to observe them.
export function sourceDay(value) {
  if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value))return null;
  if(value.length>10&&!Number.isFinite(Date.parse(value)))return null;
  const day=value.slice(0,10), date=new Date(day+'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10)===day?day:null;
}
export const isIndexChange = event => event.event_type==='index_constituent_change' || event.type==='index_change';
export function sourceEventHint(event) {
  if(isIndexChange(event)) {
    const action=['add','remove'].includes(event.action)?s('event.index_'+event.action,{index:event.index_name || s('event.index_named')}):'';
    return [action,s('event.hint_index_change')].filter(Boolean).join(LANG==='en'?' ':'');
  }
  return event.event_type==='issuer_news'?s('event.hint_issuer_news'):'';
}
export function effectiveDate(event) {
  return sourceDay(event.effective_at || (event.type==='index_change'?event.date:null));
}
export function effectiveTiming(event) {
  const day=effectiveDate(event);
  if(!day)return s('event.effective_unknown');
  const session=event.effective_session==='before_open'?s('event.before_open'):
    (LANG==='en'?event.time_en:event.time) || s('event.session_unknown');
  const zone=event.effective_timezone || event.time_zone;
  return day+' · '+session+(zone==='America/New_York'?' · ET':'');
}
