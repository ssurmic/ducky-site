// Read the saved per-metric projection without choosing another provider in the browser.
const SOURCES=new Set(['quote','fred','macro_beta','mixed']);
const BASES=new Set(['saved_intraday_observation','provider_quote_observation','stored_observed_reading','latest_available_print','session_aligned_score']);
export const hasCanonicalReadings=doc=>doc?.market_readings?.schema==='market-readings/1';
const day=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
const clock=value=>typeof value==='string'&&day(value.slice(0,10))&&/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value));
const source=value=>SOURCES.has(value?.source)&&typeof value?.series==='string'&&value.series.trim().length>0;

export function canonicalReading(doc,key){
  const projection=doc?.market_readings,r=projection?.metrics?.[key];
  if(!hasCanonicalReadings(doc)||!day(projection.session)||!r||typeof r.value!=='number'||!Number.isFinite(r.value)||
    !day(r.date)||r.date>projection.session||!source(r)||!BASES.has(r.basis)||![true,false,null].includes(r.live)||
    (r.observed_at!==null&&!clock(r.observed_at)))return null;
  if(r.basis==='saved_intraday_observation'&&r.live!==true)return null;
  if(r.basis==='provider_quote_observation'&&(r.live!==true||!clock(r.quote_at)||!clock(r.observed_at)||Date.parse(r.quote_at)>Date.parse(r.observed_at)))return null;
  if(key==='vix_term_ratio'){
    if(!Array.isArray(r.components)||r.components.length!==2||!r.components.every(c=>source(c)&&day(c.date)&&c.date===r.date))return null;
  }
  return r;
}

export function kIndexReading(doc){
  const r=doc?.k_index,vix=canonicalReading(doc,'vix'),fng=doc?.fear_greed;
  if(r?.schema!=='k-index/1'||r.formula!=='cnn_fear_greed/vix'||r.status!=='ready'||
    typeof r.value!=='number'||!Number.isFinite(r.value)||r.value<0||!day(r.date)||
    !vix||vix.value<=0||r.date!==vix.date||!clock(fng?.as_of)||
    typeof fng.score!=='number'||!Number.isFinite(fng.score)||fng.score<0||fng.score>100)return null;
  const [fear,vol]=r.components||[];
  if(r.components?.length!==2||fear?.source!=='cnn'||fear.series!=='fear_greed'||fear.value!==fng.score||
    fear.as_of!==fng.as_of||fear.observed_at!==fng.retrieved_at||!clock(fear.observed_at)||
    new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(fng.as_of))!==r.date||
    fear.date!==r.date||vol?.date!==r.date||vol.source!==vix.source||vol.series!==vix.series||vol.value!==vix.value||
    vol.observed_at!==vix.observed_at||vol.quote_at!==(vix.quote_at??null))return null;
  return r;
}
