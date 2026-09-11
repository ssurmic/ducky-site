// Bounded technical receipts for read/render debugging. No account identifiers,
// ticker lists, query strings, response bodies, source text or tokens are logged.
const events=[];
export function resource(path){
  if(path==='/watchlist')return 'watchlist';
  if(path==='/me/stock-research')return 'watchlist_research';
  if(/^\/stock-research\/[A-Z][A-Z0-9.-]{0,9}$/.test(path))return 'stock_research';
  if(/^\/evidence\/[A-Z][A-Z0-9.-]{0,9}$/.test(path))return 'evidence';
  return null;
}
export function record(stage,fields={}){
  if(!['cache_hit','cache_miss','request','response','failure','render','membership_changed'].includes(stage))return;
  if(!['watchlist','watchlist_research','stock_research','evidence'].includes(fields.resource))return;
  const entry={at:new Date().toISOString(),stage,resource:fields.resource};
  for(const key of ['elapsed_ms','server_ms','status','items','readable','request_id'])if(Number.isFinite(fields[key]))entry[key]=fields[key];
  if(typeof fields.trace_id==='string'&&/^[a-f0-9]{32}$/.test(fields.trace_id))entry.trace_id=fields.trace_id;
  if(['network','timeout','cancelled','session_changed','http','unexpected'].includes(fields.reason))entry.reason=fields.reason;
  events.push(entry);if(events.length>100)events.shift();
  console.info('Ducky read',entry);
}
export const recent=()=>events.map(event=>({...event}));
