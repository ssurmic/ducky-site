import {el, num} from '../ui.js';
import {s} from '../strings.js';

const count = value => Number.isSafeInteger(value) && value >= 0;
function day(value) {
  if (typeof value !== 'string') return null;
  const text = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && Number.isFinite(Date.parse(text)) &&
    new Date(text).toISOString().slice(0, 10) === text ? text : null;
}
/** Shared channel facts, never a completion percentage or a promised delivery time. */
export function renderProgress(progress) {
  if (progress?.schema !== 'creator-progress/1' || progress.status !== 'ready' ||
      !progress.counts || typeof progress.counts !== 'object') return null;
  const counts = progress.counts;
  const readable = count(counts.readable_summaries) ? num(counts.readable_summaries, 0) :
    count(counts.readable_lower_bound) && counts.readable_lower_bound > 0 ?
      s('creatorprogress.at_least', {n:num(counts.readable_lower_bound, 0)}) : '—';
  const stat = (key, value) => el('div', el('dt', s('creatorprogress.' + key)), el('dd.mono', value));
  const box = el('aside.creator-delivery-progress', {'aria-label':s('creatorprogress.title')},
    el('dl', stat('discovered', count(counts.discovered_posts) ? num(counts.discovered_posts, 0) : '—'),
      stat('archived', count(counts.archived) ? num(counts.archived, 0) : '—'), stat('readable', readable)));
  const from = day(progress.window?.since_day), to = day(progress.window?.as_of);
  if (from && to && from <= to) box.append(el('p.small.muted',
    s('creatorprogress.window', {from, to})));
  if (progress.provider?.allowed === false) box.append(el('p.small.creator-delivery-paused',
    s('creatorprogress.source_paused')));
  if (progress.shared === true) box.append(el('p.small.muted', s('creatorprogress.shared')));
  return box;
}

// One request at a time; background tabs pause reads and failures back off.
export function progressPoll({read,onValue,onError=()=>{},active,interval=4000}) {
  let stopped=false,running=false,timer=null,failures=0;
  function schedule() {
    clearTimeout(timer);
    if(!stopped && active()) timer=setTimeout(refresh,Math.min(30000,interval*2**Math.min(failures,3)));
  }
  async function refresh() {
    clearTimeout(timer);
    if(stopped || running || !active())return;
    if(document.visibilityState==='hidden'){schedule();return;}
    running=true;
    try {const value=await read();failures=0;if(!stopped&&active())onValue(value);}
    catch(error){failures++;if(!stopped&&active())onError(error);}
    finally{running=false;schedule();}
  }
  const visible=()=>{if(document.visibilityState!=='hidden')refresh();};
  document.addEventListener('visibilitychange',visible);
  return {refresh,schedule,stop(){stopped=true;clearTimeout(timer);document.removeEventListener('visibilitychange',visible);}};
}
