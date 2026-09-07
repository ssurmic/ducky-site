import {s,LANG} from './strings.js';

export function easternDate(now=Date.now()) {
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const get=type=>parts.find(p=>p.type===type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function expiryLabel(expiry,now=Date.now(),compact=false) {
  const today=easternDate(now),start=Date.parse(today+'T12:00:00Z'),end=Date.parse(expiry+'T12:00:00Z');
  if(!Number.isFinite(end))return expiry;
  const days=Math.round((end-start)/86400000),weekday=(new Date(start).getUTCDay()+6)%7;
  const scope=days<0?'expired':days===0?'today':days<7-weekday?'this_week':days<14-weekday?'next_week':expiry.slice(0,7)===today.slice(0,7)?'this_month':'later';
  if(compact)return expiry+' · '+s('option.'+scope);
  const date=new Intl.DateTimeFormat(LANG==='zh'?'zh-CN':'en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(end);
  return date+' · '+s('option.'+scope)+(days>=0?' · '+s('option.days',{n:days}):'');
}

export function optionView(snapshot,selected,now=Date.now()) {
  const context=snapshot?.option_context;
  if(context?.schema!=='option-context/1')return {status:'unavailable',items:[],row:null,context:null};
  const stamp=Date.parse(context.observed_at),today=easternDate(now);
  const items=(context.expirations||[]).filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.expiry));
  const row=items.find(r=>r.expiry===selected)||items.find(r=>r.expiry>=today&&r.status!=='unavailable')||items[0];
  const stale=!Number.isFinite(stamp)||stamp>now||now-stamp>26*3600000||row?.expiry<today;
  return {status:stale?'stale':row?.status||'unavailable',items,row,context};
}

export function optionOverlay(view,{expected=false,retrace=false,snapshot}={}) {
  const row=['ready','partial'].includes(view.status)?view.row:null;
  return {gamma:row?{call_wall:row.call_wall,put_wall:row.put_wall}:null,
    expected:expected&&row?row.expected:null,retrace:retrace?snapshot?.retrace:null};
}
