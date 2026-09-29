// Synthetic current-session snapshots. Never included by the production build.
import {marketReadingsMacro} from './today-close-data.js';
export function currentMacro({at='2026-09-29T15:40:00Z',phase='open',sequence=1}={}){
 const doc=marketReadingsMacro(),date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));
 const offset=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',timeZoneName:'longOffset'}).formatToParts(new Date(date+'T12:00:00Z')).find(p=>p.type==='timeZoneName').value.replace('GMT','');
 const trade=phase==='post'?new Date(date+'T15:59:00'+offset).toISOString():new Date(Date.parse(at)-30000).toISOString();
 const reading=(value,series)=>({value,date,source:'quote',series,basis:'provider_quote_observation',live:true,quote_at:trade,observed_at:at});
 const macro={schema:'market-readings/1',session:date,metrics:{nominal_10y:reading(5.29,'^TNX'),vix:reading(16.7,'^VIX'),vix_term_ratio:null,funding_score:doc.market_readings.metrics.funding_score}};
 const quotes=['SPY','QQQ','DIA','IWM','XLK','SMH','XLC','XLY','XLP','XLF','XLV','XLE','XLI','XLB','XLU','GLD','SLV','USO','TLT'].map((ticker,i)=>({ticker,price:100+i,change_pct:i===0?0:i%2?1.2:-0.45,previous_close:100,previous_close_basis:'provider_previous_close',quote_at:trade,recorded_at:at,source_id:'synthetic:'+ticker,provider:'synthetic',feed:'test_only',status:phase==='post'?'session_quote':'current'}));
 // Match the full deterministic producer prose, including each metric's own date.
 // These are synthetic readings; an old funding date must not become today's date.
 const funding=macro.metrics.funding_score;
 const summary={
  zh:`已覆盖行业 ETF 中，SMH +1.20%，XLK -0.45%。 记录读数：10年期美债 5.29%（${date}），VIX 16.7（${date}），美元流动性 ${funding.value}/100（${funding.date}）。`,
  en:`Among covered sector ETFs: SMH +1.20%; XLK -0.45%. Recorded readings: 10Y yield 5.29% (${date}); VIX 16.7 (${date}); USD liquidity ${funding.value}/100 (${funding.date}).`
 };
 doc.current_session={schema:'market-current/1',revision_id:'a'.repeat(64),sequence,session:date,phase,status:'ready',published_at:at,expires_at:new Date(Date.parse(at)+240000).toISOString(),coverage:{expected:19,current:phase==='post'?0:19,session_quote:phase==='post'?19:0,stale:0,missing:[]},quotes,macro,fear_greed:{score:34,rating:'fear',as_of:at,retrieved_at:at},summary};
 return doc;
}
