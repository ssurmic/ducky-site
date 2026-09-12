// Presentation grouping for recorded facts and events inside one stance lane.
// A topic label says what kind of record this is; it never changes stance, order
// inside a topic, counts, or which records are retained.
export const TOPIC_ORDER=['filings','price','relative','options','attention','macro','other'];
const PATTERNS=[
  ['filings',/ownership_disclosure|insider|13f|radar_source|political|stake|partner|filing/],
  ['price',/^price$|technicals|rsi|price_gaps|price_position|closing/],
  ['relative',/^ytd_|stock_vs_|peer|comparison/],
  ['options',/option|volatility|gamma/],
  ['attention',/reddit|attention|social|mention/],
  ['macro',/macro/],
];
export function topicGroup(node){
  if(node?.kind==='creator')return 'views';
  if(node?.kind==='event')return 'filings';
  const topics=(node?.evidence||[]).map(e=>String(e?.topic||e?.kind||''));
  for(const [key,re] of PATTERNS)if(topics.some(t=>re.test(t)))return key;
  return 'other';
}
// Groups keep TOPIC_ORDER; records inside a group keep the order they arrived in.
export function topicGroups(nodes){
  const groups=new Map();
  for(const node of nodes){
    const key=topicGroup(node);
    if(!groups.has(key))groups.set(key,{key,nodes:[]});
    groups.get(key).nodes.push(node);
  }
  return [...groups.values()].sort((a,b)=>TOPIC_ORDER.indexOf(a.key)-TOPIC_ORDER.indexOf(b.key));
}
