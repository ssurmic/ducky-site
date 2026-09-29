// Synthetic current-session snapshots. Never included by the production build.
import {marketReadingsMacro} from './today-close-data.js';
export function currentMacro({at='2026-09-29T15:40:00Z',phase='open',sequence=1}={}){
 const doc=marketReadingsMacro(),date=at.slice(0,10),trade=new Date(Date.parse(at)-30000).toISOString();
 const reading=(value,series)=>({value,date,source:'quote',series,basis:'provider_quote_observation',live:true,quote_at:trade,observed_at:at});
 const macro={schema:'market-readings/1',session:date,metrics:{nominal_10y:reading(5.29,'^TNX'),vix:reading(16.7,'^VIX'),vix_term_ratio:null,funding_score:doc.market_readings.metrics.funding_score}};
 const quotes=['SPY','QQQ','DIA','IWM','XLK','SMH','XLC','XLY','XLP','XLF','XLV','XLE','XLI','XLB','XLU','GLD','SLV','USO','TLT'].map((ticker,i)=>({ticker,price:100+i,change_pct:i===0?0:i%2?1.2:-0.45,previous_close:100,previous_close_basis:'provider_previous_close',quote_at:trade,recorded_at:at,source_id:'synthetic:'+ticker,provider:'synthetic',feed:'test_only',status:'current'}));
 doc.current_session={schema:'market-current/1',revision_id:'a'.repeat(64),sequence,session:date,phase,status:'ready',published_at:at,expires_at:new Date(Date.parse(at)+240000).toISOString(),coverage:{expected:19,current:19,stale:0,missing:[]},quotes,macro,fear_greed:{score:34,rating:'fear',as_of:at,retrieved_at:at},summary:{zh:'合成示例：半导体 ETF +1.20%，能源 ETF -0.45%。10 年期收益率 5.29%，VIX 16.7（9/29 盘中）。',en:'Synthetic: semiconductor ETF +1.20%; energy ETF -0.45%. 10-year yield 5.29%, VIX 16.7 (September 29, intraday).'}};
 return doc;
}
