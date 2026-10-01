// One selection policy for current display values. Historical research stays unchanged.
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const nyDate=at=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));
export function displayQuote(row,now=Date.now()){
  const q=row?.quote,at=Date.parse(q?.quote_at);
  if(!q||!['current','stale'].includes(q.status)||!finite(q.price)||q.price<=0||!finite(at)||at>now)return null;
  const session=nyDate(at);
  if(finite(row.price)&&row.price>0&&row.price_session){
    if(session<row.price_session)return null;
    if(session===row.price_session){
      // Only the server's exchange calendar can certify an after-close trade,
      // including early closes and DST. Old API payloads fail closed.
      const close=Date.parse(q.regular_close_at);
      if(q.market_session!=='postmarket'||q.session_date!==session||!finite(close)||nyDate(close)!==session||at<=close)return null;
    }
  }
  return q;
}
export const display=row=>displayQuote(row)||row;
// References retain their own dates; only their comparison point changes. No saved object mutates.
export function signalsAtPrice(sig,price){
  if(!sig)return sig;
  const current=finite(price)&&price>0?price:null;
  return {...sig,...(sig.walls?{walls:{...sig.walls,price:current}}:{}),
    ...(sig.support?{support:{...sig.support,price:current,refs:(sig.support.refs||[]).map(ref=>({...ref,
      gap:current&&finite(ref.value)&&ref.value>0?(ref.value/current-1)*100:null}))}}:{})};
}
