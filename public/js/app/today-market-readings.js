// Read the saved per-metric projection without choosing another provider in the browser.
const SOURCES=new Set(['quote','fred','macro_beta','mixed']);
const BASES=new Set(['saved_intraday_observation','stored_observed_reading','latest_available_print','session_aligned_score']);
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
  if(key==='vix_term_ratio'){
    if(!Array.isArray(r.components)||r.components.length!==2||!r.components.every(c=>source(c)&&day(c.date)&&c.date===r.date))return null;
  }
  return r;
}
