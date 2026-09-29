// Synthetic integrated dashboard acceptance only; never exported to production.
import {currentMacro} from './today-current-data.js';
export function dashboardMacro(options={}){
 const doc=currentMacro(options),session=doc.current_session.session;
 const next=new Date(session+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);
 const tomorrow=next.toISOString().slice(0,10),at=doc.current_session.published_at;
 const dates=[],cursor=new Date(session+'T12:00:00Z');
 while(dates.length<11){if(![0,6].includes(cursor.getUTCDay()))dates.unshift(cursor.toISOString().slice(0,10));cursor.setUTCDate(cursor.getUTCDate()-1);}
 doc.observed=dates.map((date,i)=>({date,nominal_10y:5.05+i*.02,qqq_index:100+i*.4+Math.sin(i),spy_index:100+i*.2+Math.cos(i),funding_score:50+Math.sin(i)*10,net_liquidity_bn:5760+i*2}));
 doc.latest.metrics.net_liquidity_bn=5780;doc.latest.metrics.net_liquidity_65d_change_bn=-41;
 doc.current_session.macro.metrics.nominal_10y.value=5.255;
 doc.current_session.summary.en=doc.current_session.summary.en.replace('5.29%','5.25%');
 doc.current_session.summary.zh=doc.current_session.summary.zh.replace('5.29%','5.25%');
 doc.observed.at(-1).nominal_10y=5.255;
 Object.assign(doc.current_session.fear_greed,{previous_close:37,previous_1_week:34,previous_1_month:54,previous_1_year:51});
 Object.assign(doc.digest,{session,next_session:tomorrow,generated_at:at});
 Object.assign(doc.digest.preview,{anchor_session:session,calendar_day:tomorrow,next_session:tomorrow,observed_at:at});
 doc.digest.preview.events=doc.digest.preview.events.slice(2,7).map(event=>({...event,date:tomorrow,source_observed_at:at}));
 return doc;
}
