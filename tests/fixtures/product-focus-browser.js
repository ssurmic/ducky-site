// SYNTHETIC UI validation. Not included by build.py or connected to production.
const query=new URLSearchParams(location.search),mode=query.get('case')||'data';
document.documentElement.dataset.theme=query.get('theme')==='dark'?'dark':'light';
document.documentElement.dataset.tg='web';
window.DUCKY={API_BASE:'/qa-api',PRODUCT_FOCUS_ENABLED:true,RESEARCH_BRIEF_ENABLED:true,BILLING_ENABLED:false};
const clock=new Date().toISOString(),today=clock.slice(0,10),requests=[],errors=[];
window.addEventListener('error',event=>errors.push(event.message));
window.addEventListener('unhandledrejection',event=>errors.push(String(event.reason)));
const title={zh:'若客户保持资本支出，新增产能可能支持订单增长。',en:'Additional capacity could support order growth if customers maintain capital spending.'};
const counter={zh:'支出增长可能先压低利润率，订单是否兑现还需要确认。',en:'Higher spending could pressure margins before new orders materialize.'};
const node=(id,stance='support')=>({id,kind:'creator',intent:'opinion',priority:'direct',stance,conditional:true,title:stance==='counter'?counter:title,
 published_at:today,observed_at:clock,reason:stance==='counter'?counter:title,evidence:[{id:'ev-'+id,kind:'creator',author:stance==='counter'?'Sample Cautious Author':'Sample Author',
 platform:'youtube',creator_id:stance==='counter'?'sample-cautious':'sample-author',post_id:'sample-original',title:stance==='counter'?counter:title,reason:stance==='counter'?counter:title,published_at:today,observed_at:clock,
 condition_text:'If customers maintain capital spending',source_url:'https://example.com/synthetic-source',start_seconds:75,end_seconds:92}]});
const nodes=[node('first'),node('second','counter'),node('third'),node('context1','context'),node('context2','context'),node('context3','context'),node('context4','context')];
const previousClock=new Date(Date.now()-3*86400000).toISOString();
const previousNodes=nodes.map(n=>({...n,published_at:previousClock.slice(0,10),observed_at:previousClock,
 evidence:n.evidence.map(e=>({...e,published_at:previousClock.slice(0,10),observed_at:previousClock}))}));
const overview={zh:'示例作者认为产能扩张可能带动订单，但另一作者提醒支出可能先压低利润率。',en:'Sample Author expects capacity growth to support orders, while Sample Cautious Author warns of near-term margin pressure.',citations:['first','second']};
if(mode==='fidelity-overview')Object.assign(overview,{
 zh:'Sample Research Author于2026-09-07表示：新增内存采购可能支持长期需求，但要保留循环融资、大规模资金投入以及客户支出能否延续的条件；Sample Cautious Author于2026-09-08表示：扩建支出可能先压低利润率，产能并不等于收入。',
 en:'Sample Research Author said on 2026-09-07: New memory orders may support demand, subject to circular financing, heavy spending and continued customer budgets; Sample Cautious Author said on 2026-09-08: Capacity spending may pressure margins before revenue arrives.'});
const analysis={overview,sections:[{kind:'key_points',zh:'产能投放能否转成订单，取决于客户支出。',en:'Converting new capacity into orders depends on customer spending.',citations:['first']},
 {kind:'risks',zh:'利润率可能先承压，不能把产能增加等同于收入。',en:'Margins may come under pressure first; capacity growth is not booked revenue.',citations:['second']},
 {kind:'watch',zh:'下一份财报需要核对订单和资本支出。',en:'Check orders and capital spending in the next earnings report.',citations:['first']}]};
if(mode==='no-watch-section')analysis.sections=analysis.sections.filter(p=>p.kind!=='watch');
let watches=mode==='no-watch'?[]:['NVDA','AVGO','AMD','GLW'];
if(mode==='watchlist-management')watches=['NVDA','AVGO','AMD','GLW',...Array.from({length:46},(_,i)=>'TEST'+String(i).padStart(2,'0'))];
if(mode==='today-large')watches=['AAPL','AEHR','ALAB','AMD','AVGO','GLW','NVDA','TSLA'];
// These explicit membership cases accept writes only to the fixture's in-memory array.
if(['watchlist-add','autocomplete-watchlist'].includes(mode))watches=['NVDA','AVGO','AMD'];
if(mode==='wall-consistency')watches=['NVDA','COIN','AVGO','TSLA','AMD'];
const writable=['watchlist-management','watchlist-add','autocomplete-watchlist'].includes(mode);
const autocompleteSymbols=[
 {ticker:'META',name:'Meta Platforms, Inc. - Class A Common Stock',exchange:'NASDAQ',instrument_type:'stock',instrument_tags:['stock'],watch_eligible:true,watch_reason:null,
  industry:'超大规模云与平台计算需求',industry_en:'Hyperscaler / platform compute demand'},
 {ticker:'NVDA',name:'NVIDIA Corporation',exchange:'NASDAQ',instrument_type:'stock',instrument_tags:['stock'],watch_eligible:true,watch_reason:null},
 {ticker:'MTAW',name:'Meta AI Lab Ecosystem ETF',exchange:'NYSE Arca',instrument_type:'etf',instrument_tags:['etf'],watch_eligible:true,watch_reason:null},
 {ticker:'METU',name:'Direxion Daily META Bull 2X Shares',exchange:'NASDAQ',instrument_type:'etf',instrument_tags:['etf','leveraged','2x'],watch_eligible:false,watch_reason:'leveraged_instrument'},
 {ticker:'SH',name:'ProShares Short S&P500',exchange:'NYSE Arca',instrument_type:'etf',instrument_tags:['etf','inverse'],watch_eligible:true,watch_reason:null},
 {ticker:'WARNT',name:'Synthetic Corporation Warrants',exchange:'NASDAQ',instrument_type:'warrant',instrument_tags:['warrant'],watch_eligible:true,watch_reason:null},
 {ticker:'MYST',name:'Synthetic Unclassified Instrument',exchange:'NASDAQ',instrument_type:'unknown',instrument_tags:['unknown'],watch_eligible:true,watch_reason:null},
 // Older API data is deliberately missing the additive gate fields.
 {ticker:'LEGACY',name:'Synthetic Legacy Symbol',exchange:'NASDAQ'},
];
let researchReads=0;
const wallPrices={NVDA:230,COIN:184.55,AVGO:200,TSLA:300,AMD:160};
const wallFact=(topic,data)=>({topic,dimension:'technical',observed_at:'2026-09-11T20:00:00Z',data});
// Deliberately different coverage: a wall does not manufacture a closing-price range.
const wallBriefs={items:[
 {ticker:'NVDA',status:'ready',generated_at:'2026-09-11T20:00:00Z',evidence:[wallFact('price',{price:230}),wallFact('option_concentrations',{put_wall:225,call_wall:240,expiries:['2026-09-18','2026-10-16']})]},
 {ticker:'COIN',status:'ready',generated_at:'2026-09-11T20:00:00Z',evidence:[wallFact('price',{price:184.55}),wallFact('price_position',{price:184.55,low:146.23,high:192.70,sessions:20})]},
 {ticker:'AVGO',status:'ready',generated_at:'2026-09-11T20:00:00Z',evidence:[wallFact('price',{price:200}),wallFact('option_concentrations',{put_wall:190,call_wall:220,expiries:['2026-09-18']}),wallFact('price_position',{price:200,low:180,high:230,sessions:20})]},
 {ticker:'TSLA',status:'ready',evidence:[]},
 {ticker:'AMD',status:'pending'}
]};
// Readings for the table's verdict and side columns: NVDA current, AMD written for older facts (stale), others pending.
const READINGS={NVDA:{status:'ready',session:'2026-09-09',generated_at:'2026-09-09T23:40:00-07:00',stale:false,
  overall:{zh:'总的来说，Meta Muse 发布后英伟达贴着 240 的看涨墙之下收盘，内部人六月减持 4.1 亿美元后没有新动作。',en:'Overall, after the Meta Muse launch NVIDIA closed just under the call wall at 240, with no insider move since the $410 million of June sales.'},
  right:{zh:'趋势派会看收盘能否重新站上 240 的看涨墙，站上去就顺势，站不上去就等。',en:'Trend followers watch whether the close reclaims the call wall at 240; above it they follow, below it they wait.'},
  left:{zh:'长线加仓派会看回调是否在 221 的看跌墙附近企稳，同时盯着内部人是否继续净卖出。',en:'Long-term accumulators watch whether a pullback settles near the put wall at 221 while insiders keep net selling.'}},
 AMD:{status:'ready',session:'2026-09-08',generated_at:'2026-09-08T23:40:00-07:00',stale:true,
  overall:{zh:'总的来说，AMD 在财报后回落到 20 日区间中部，机构上季度净增持。',en:'Overall, AMD has drifted back to the middle of its 20-day range after earnings, with funds net adding last quarter.'},
  right:{zh:'趋势派会看 20 日区间上沿能否收复。',en:'Trend followers watch whether the top of the 20-day range is recovered.'},
  left:{zh:'长线加仓派会看回落是否停在区间下沿附近。',en:'Long-term accumulators watch whether the slide stops near the bottom of the range.'}}};
const price=(ticker,i=0)=>({ticker,...(READINGS[ticker]?{digest:{views:READINGS[ticker]}}:{}),company:{NVDA:'NVIDIA Corporation',AVGO:'Broadcom Inc.',AMD:'Advanced Micro Devices, Inc.',GLW:'Corning Incorporated'}[ticker]||ticker,
 ...(['minute-quotes','saved-quotes'].includes(mode)?{quote:{price:218.25+i*23,change_pct:-2.42,status:mode==='saved-quotes'?'stale':'current',quote_at:new Date(Date.now()-(mode==='saved-quotes'?600000:1000)).toISOString(),provider:'yahoo',feed:'yahoo_regular_session'}}:{}),
 price:223.67+i*23,price_status:'ready',price_session:'2026-09-09',change_pct:i%2?3.2:-.91,market_cap:(5-i)*1e12,metrics:{ytd:{status:'ready',value:[20.1,-2,0,-12][i]},drawdown:{status:'ready',value:-5-i*5},relative:{status:'ready',value:-7+i*2,symbols:['SPY']},iv_hv:{status:i===2?'missing':'ready',value:i===2?null:.71+i*.25},attention:{status:'ready',value:75+i*5},degen:{status:'ready',value:48+i*4}},
 ...(mode==='wall-consistency'?{price:wallPrices[ticker],price_session:'2026-09-11',company:{NVDA:'NVIDIA Corporation',COIN:'Coinbase Global, Inc.',AVGO:'Broadcom Inc.',TSLA:'Tesla, Inc.',AMD:'Advanced Micro Devices, Inc.'}[ticker]}:{})});
const stockSummary=ticker=>({ticker,status:mode==='pending'?'pending':mode==='previous'?'refresh_pending':'ready',records:3,
 as_of:mode==='today-large'?new Date(Date.now()-(watches.length-watches.indexOf(ticker))*86400000).toISOString():mode==='previous'?previousClock:clock,overview:mode==='pending'?null:overview,sources:(mode==='previous'?previousNodes:nodes).slice(0,2)});
const record=i=>({id:'change-'+i,ticker:i%2?'AVGO':'NVDA',kind:i===1?'revised':'added',state:i===3?'unavailable':'available',earlier_content:i===2,
 initial_coverage:false,published_at:i===2?'2026-08-20':today,observed_at:clock,available_at:clock,node:i===3?null:nodes[i%3]});
const macroHistory=()=>{const rows=[];let q=100,sp=100,net=5800,y=4.4,d=new Date(Date.UTC(2026,5,15));
 for(let i=0;i<70;i++){d.setUTCDate(d.getUTCDate()+(d.getUTCDay()===5?3:1));const up=Math.sin(i/3)+Math.cos(i/7);net+=up*22;q*=1-up*0.004+((i%5)-2)*0.001;sp*=1-up*0.0025+((i%7)-3)*0.0006;y+=up*0.03-((i%4)-1.5)*0.02;
  rows.push({date:d.toISOString().slice(0,10),funding_score:55+up*8,beta_score:56,regime:'mixed',metrics:{net_liquidity_bn:Math.round(net*10)/10,nominal_10y:Math.round(y*100)/100,vix:16},qqq_index:Math.round(q*1000)/1000,spy_index:Math.round(sp*1000)/1000});}
 return rows;};
// The observed panel: each session's own closes (the quote feed's, FRED's print on a day the feed skipped),
// the liquidity index of that session and net liquidity as of its prints. The last two sessions tell the
// 09-22 → 09-23 story: the index 62.5 → 57.5, the 10-year 4.96% → 5.114%, VIX 14.21 → 15.18.
const macroObserved=()=>{const rows=macroHistory().slice(-24).map((r,i)=>({date:r.date,funding_score:r.funding_score,regime:r.regime,net_liquidity_bn:r.metrics.net_liquidity_bn,net_liquidity_date:r.date,
  nominal_10y:r.metrics.nominal_10y,nominal_10y_source:i===21?'fred':'quote',vix:Math.round((16+Math.sin(i/2)*1.4)*100)/100,vix_3m:18.1,vix_term_ratio:0.88,qqq_index:r.qqq_index,spy_index:r.spy_index,scored:true,live:false}));
 Object.assign(rows[rows.length-2],{nominal_10y:4.96,funding_score:62.5,regime:'supportive',vix:14.21,vix_3m:17.61,vix_term_ratio:0.807});
 Object.assign(rows[rows.length-1],{nominal_10y:5.114,funding_score:57.5,regime:'mixed',vix:15.18,vix_3m:18.11,vix_term_ratio:0.838});
 return rows;};
const kolFeed=()=>({schema:'kol-feed/1',posts:[
 {id:1,kol_id:'sample-macro-author',kol_name:'Sample Macro Author',url:'https://www.youtube.com/watch?v=sample-macro-1',title:'美债利率两天上行，成长股承压：谁在推动？',published_at:new Date(Date.now()-5*3600e3).toISOString(),tickers:['NVDA','TSLA'],take:'bear',macro:true,
  summary:JSON.stringify({zh:'十年期收益率两天上行 15 个基点；作者认为久期长的成长股承压，本周盯 PCE 和美联储讲话。',en:'The 10-year rose 15 bp in two sessions; the author sees long-duration growth under pressure and watches PCE and Fed speakers this week.'})},
 {id:2,kol_id:'sample-author',kol_name:'Sample Author',url:'https://www.youtube.com/watch?v=sample-macro-2',title:'The Fed, inflation and what it means for tech',published_at:new Date(Date.now()-20*3600e3).toISOString(),tickers:[],take:'neutral',macro:true,
  summary:JSON.stringify({zh:'已发现视频，原文分析待完成。',en:'Video discovered; source analysis is pending.',source:{kind:'metadata',status:'discovered'}})},
 {id:3,kol_id:'sample-author',kol_name:'Sample Author',url:'https://www.youtube.com/watch?v=sample-3',title:'NVDA earnings preview',published_at:new Date(Date.now()-3*3600e3).toISOString(),tickers:['NVDA'],take:'bull',macro:false,summary:JSON.stringify({zh:'财报前瞻。',en:'Earnings preview.'})}]});
const calendarDoc=()=>{
 const todayIso=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const iso=n=>{const d=new Date(todayIso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
 const ev=(n,type,title,title_en,extra={})=>({date:iso(n),type,title,title_en,tickers:[],note:'',note_en:'',...extra});
 const visit=(n,day)=>ev(n,'geo','习近平对美国进行国事访问','Xi Jinping state visit to the United States',{short:'习近平访美',short_en:'Xi in Washington',span:{start:iso(0),end:iso(2),day,days:3},
  note:'9 月 24 日白宫会谈与国宴；贸易休战延期、稀土出口、关税是议题。',note_en:'White House summit and state dinner; trade truce, rare earths and tariffs on the table.',source_url:'https://www.whitehouse.gov/'});
 const earn=(n,t)=>ev(n,'earnings',t+' 财报',t+' earnings',{tickers:[t],note:'盘后',note_en:'After the close'});
 return {schema:'calendar/1',generated_at:new Date().toISOString(),as_of:new Date().toISOString(),window_days:60,events:[
  visit(0,1),visit(1,2),visit(2,3),
  ev(0,'macro','标普全球 美国 PMI 初值','S&P Global flash US PMI',{note:'09:45 ET 公布本月 PMI 初值。',note_en:'Flash PMI at 09:45 ET.'}),
  ev(0,'macro','新屋销售','New home sales',{note:'10:00 ET',note_en:'10:00 ET'}),
  ev(1,'macro','初请失业金','Initial jobless claims',{note:'08:30 ET',note_en:'08:30 ET'}),
  earn(1,'MU'),earn(1,'COST'),
  ev(2,'macro','PCE 物价指数','PCE price index',{note:'08:30 ET 公布；美联储最看重的通胀指标。',note_en:'08:30 ET; the Fed\'s preferred inflation gauge.'}),
  ev(4,'macro','美联储主席讲话','Fed Chair speaks',{note:'12:00 ET',note_en:'12:00 ET'}),
  ev(5,'macro','ISM 制造业 PMI','ISM manufacturing PMI',{note:'10:00 ET；50 为荣枯线。',note_en:'10:00 ET; 50 divides expansion from contraction.'}),
  earn(5,'NKE'),
  ev(6,'rebal','月末调仓 · 基金再平衡','Month-end rebalance',{tickers:['SPY']}),
  earn(7,'NVDA'),earn(7,'META'),earn(7,'AMD'),earn(7,'TSLA'),earn(7,'AVGO'),
  ev(7,'macro','ISM 服务业 PMI','ISM services PMI',{note:'10:00 ET',note_en:'10:00 ET'}),
  ev(8,'macro','初请失业金','Initial jobless claims',{note:'08:30 ET',note_en:'08:30 ET'}),
  ev(9,'macro','大非农 · 非农就业 (NFP)','Nonfarm payrolls (NFP)',{note:'08:30 ET 公布上月非农就业与失业率。',note_en:'Prior-month payrolls at 08:30 ET.'}),
  ev(12,'geo','美国中期选举','US midterm elections',{short:'中期选举',short_en:'US midterms',note:'国会两院与州级选举。',note_en:'Congress and state elections.',source_url:'https://www.usa.gov/'}),
  ev(13,'macro','美联储 FOMC 利率决议','FOMC rate decision',{note:'14:00 ET 公布利率决议，14:30 ET 主席发布会 · 含点阵图。',note_en:'Rate decision 14:00 ET, press conference 14:30 ET · with dot plot.'}),
  ev(13,'opex','月度期权交割 · OPEX','Monthly OPEX'),
  ev(16,'holiday','休市 · 感恩节','Market closed · Thanksgiving'),
 ]};
};
window.fetch=async(input,options={})=>{
 const url=new URL(String(input),location.origin);requests.push({path:url.pathname+url.search,method:options.method||'GET',
  ...(mode==='autocomplete-watchlist'&&options.body?{body:JSON.parse(options.body)}:{})});
 if(url.origin!==location.origin)throw Error('External traffic forbidden in synthetic fixture');
 const path=url.pathname.replace('/qa-api',''),method=options.method||'GET';
 if(method!=='GET'){
  if(writable&&method==='DELETE'&&/^\/watchlist\/[A-Z0-9]+$/.test(path)){
   const ticker=path.split('/').at(-1),removed=watches.includes(ticker);watches=watches.filter(t=>t!==ticker);return Response.json({ticker,removed});
  }
  if(writable&&method==='POST'&&path==='/watchlist'){
   const {ticker}=JSON.parse(options.body);if(watches.length>=50)return Response.json({error:'watch_limit',cap:50},{status:402});
   if(mode==='autocomplete-watchlist'&&autocompleteSymbols.find(row=>row.ticker===ticker)?.watch_eligible===false)
    return Response.json({error:'watch_ineligible',reason:'leveraged_instrument',ticker},{status:400});
   const added=!watches.includes(ticker);if(added)watches.push(ticker);return Response.json({ticker,added});
  }
  throw Error('Writes forbidden in synthetic fixture');
 }
 if(mode==='failure'&&path.includes('research'))return Response.json({error:'fixture_unavailable'},{status:503});
 if(mode==='wall-consistency'&&path==='/briefing/stocks')return Response.json(wallBriefs);
 if(path==='/radar/social.json')return Response.json({status:'ready',collected_at:new Date(Date.now()-1800000).toISOString(),items:[
  {ticker:'NVDA',rank:1,mentions:1240,change_pct:35,overall:READINGS.NVDA.overall},{ticker:'AMD',rank:2,mentions:910,change_pct:-10,overall:READINGS.AMD.overall},
  {ticker:'GLW',rank:3,mentions:302,change_pct:120},{ticker:'AVGO',rank:4,mentions:180}]});
 if(path==='/public/calendar.json'||path==='/calendar')return Response.json(calendarDoc());
 if(path==='/watchlist')return Response.json({cap:50,items:watches.map(ticker=>({ticker})),overview:{items:watches.map(price),session:mode==='wall-consistency'?'2026-09-11':'2026-09-09'}});
 if(path==='/me/stock-research'){
  researchReads++;
  if(mode==='recover-first-read'&&researchReads===1)return Response.json({error:'fixture_first_read_unavailable'},{status:503});
  if(mode==='slow-research')await new Promise(resolve=>setTimeout(resolve,6000));
  return Response.json({items:watches.map(stockSummary),watchlist_count:watches.length});
 }
 if(path==='/me/research-changes'){
  const items=(mode==='empty'||mode==='no-watch'?[]:Array.from({length:url.searchParams.has('q')?1:3},(_,i)=>record(i)))
   .filter(row=>url.searchParams.get('earlier')!=='false'||!row.earlier_content);
  return Response.json({items,next_cursor:!url.searchParams.has('before')&&mode==='pages'?'next-page':null,scope:url.searchParams.get('scope')});
 }
 if(path.startsWith('/evidence/'))return Response.json({ticker:path.split('/').at(-1),status:'ready',nodes,display_price:price(path.split('/').at(-1)),analysis_status:'ready',analysis,analysis_generated_at:clock});
 if(path.startsWith('/stock-research/')){const ticker=path.split('/').at(-1);return Response.json({ticker,price:price(ticker),evidence:{ticker,nodes,display_price:price(ticker),
  analysis_status:mode==='pending'?'pending':mode==='previous'?'refresh_pending':'ready',analysis:mode==='pending'?null:analysis,
  analysis_generated_at:mode==='previous'?previousClock:clock,...(mode==='previous'?{analysis_nodes:previousNodes,analysis_snapshot_id:'synthetic-old'}:{})}});}
 if(path.startsWith('/bars/'))return Response.json({bars:mode==='pending'?[]:Array.from({length:90},(_,i)=>({t:new Date(Date.UTC(2026,5,1+i)).toISOString().slice(0,10),c:170+i*.48+Math.sin(i*.18)*12}))});
 if(path==='/public/symbols'){
 if(mode==='autocomplete-watchlist'){
  const q=(url.searchParams.get('q')||'').trim().toUpperCase().replace(/^\$/,'');
  const items=autocompleteSymbols.filter(row=>q==='ALL'||row.ticker.startsWith(q)||row.name.toUpperCase().includes(q)).slice(0,8);
  return Response.json({items,total_count:items.length});
 }
 // Symbol search for the add flow: a typed prefix finds an unfollowed stock; anything else keeps the NVDA default.
 const q=(url.searchParams.get('q')||'').trim().toUpperCase().replace(/^\$/,''),known={NVDA:'NVIDIA Corporation',COIN:'Coinbase Global, Inc.',MU:'Micron Technology, Inc.'};
 const stock=(ticker,name)=>({ticker,name,exchange:'NASDAQ',instrument_type:'stock',instrument_tags:['stock'],watch_eligible:true,watch_reason:null});
 const items=Object.entries(known).filter(([t,n])=>q&&(t.startsWith(q)||n.toUpperCase().includes(q))).map(([ticker,name])=>stock(ticker,name));
 return Response.json({items:items.length?items:[stock('NVDA','NVIDIA Corporation')]});
 }
 if(path==='/data-versions')return Response.json({});
 if(path==='/radar/archive.json'){
  // Synthetic Form 4 and 13F rows for the watched stocks: every stock has a purchase, the first two
  // also an open-market sale; funds add on one line and trim on another.
  const kind=url.searchParams.get('kind'),tickers=(url.searchParams.get('tickers')||'').split(',').filter(Boolean);
  const insider=tickers.flatMap((ticker,i)=>[
   {id:'sec:'+ticker+':P',kind:'insider',ticker,ts:'2026-09-0'+(1+i%8)+'T00:00:00Z',direction:1,source_url:'https://www.sec.gov/Archives/edgar/data/1/'+ticker+'-p.xml',
    extra:{facts:{owners:[{name:'Rivera Dana',role:'Director'}],transactions:[{date:'2026-09-0'+(1+i%8),price:180+i,shares:6000}]}}},
   ...(i<2?[{id:'sec:'+ticker+':S',kind:'insider',ticker,ts:'2026-09-17T00:00:00Z',direction:-1,source_url:'https://www.sec.gov/Archives/edgar/data/1/'+ticker+'-s.xml',
    extra:{facts:{owners:[{name:'Chen Wei',role:'Officer',title:'Chief Financial Officer'}],transactions:[{date:'2026-09-16',price:212.4,shares:15000}]}}}]:[])]);
  const dense=(ticker,i)=>i<2?[]:Array.from({length:11},(_,k)=>({id:'13f:d'+k+':'+ticker,kind:'13f',ticker,reporter_name:['Bridgewater Associates','Tiger Global','Coatue','Baillie Gifford','Third Point','Pershing Square','Viking Global','Lone Pine','Altimeter Capital','D1 Capital','Maverick Capital'][k],
   ts:'2026-08-1'+(k%9)+'T12:00:00Z',direction:k<5?1:-1,extra:{facts:{accession:'d'+k+'-'+ticker,position_change:k<5?'increased':'decreased',report_period:'2026-06-30',prior_shares:1e6,new_shares:k<5?1.2e6:8e5,new_value:k<5?2.4e8:1.6e8}}}));
  const funds=tickers.flatMap((ticker,i)=>[
   {id:'13f:a:'+ticker,kind:'13f',ticker,reporter_name:'Appaloosa LP',ts:'2026-08-14T12:00:00Z',direction:1,extra:{facts:{accession:'a-'+ticker,position_change:i%2?'new':'increased',report_period:'2026-06-30',prior_shares:1000000,new_shares:1500000,new_value:3e8,quarter_price_range:{low:175.75,high:235.74}}}},
   {id:'13f:b:'+ticker,kind:'13f',ticker,reporter_name:'ARK Investment Management',ts:'2026-08-13T12:00:00Z',direction:-1,extra:{facts:{accession:'b-'+ticker,position_change:i===1?'closed':'decreased',report_period:'2026-06-30',prior_shares:800000,new_shares:i===1?0:500000,new_value:1e8}}},
   ...dense(ticker,i)]);
  const political=tickers.flatMap((ticker,i)=>i>2?[]:[
   {id:'house:'+ticker+':1',kind:'political',ticker,ts:'2026-07-24T00:00:00Z',direction:1,source_url:'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/2003.pdf',
    extra:{facts:{politician:'Nancy Pelosi',owner:'SP',transaction_code:'P',transaction_date:'2026-07-24',amount_range:'$500,001 - $1,000,000',asset_type:'ST',filing_date:'2026-08-20',transaction_close:{close:22.5,date:'2026-07-24'}}}},
   ...(i===0?[{id:'house:'+ticker+':2',kind:'political',ticker,ts:'2026-06-12T00:00:00Z',direction:-1,source_url:'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/2001.pdf',
    extra:{facts:{politician:'Josh Gottheimer',owner:'JT',transaction_code:'S',transaction_date:'2026-06-12',amount_range:'$15,001 - $50,000',asset_type:'OP',description:'Call options; Strike price $340; Expires 12/18/2026',filing_date:'2026-07-10',transaction_close:{close:19.8,date:'2026-06-12'}}}}]:[])]);
  return Response.json({items:kind==='insider'?insider:kind==='13f'?funds:kind==='political'?political:[],next_cursor:null});
 }
 if(path==='/kol/feed'||path==='/kol/trial-feed')return Response.json(kolFeed());
 if(path==='/macro/beta')return Response.json({digest:{status:'ready',version:'market-digest/1',session:'2026-09-23',next_session:'2026-09-24',generated_at:'2026-09-24T05:41:00+00:00',
  close:{zh:'标普500 收跌 0.8%，纳指100 跌 1.2%，道指跌 0.5%，三大指数全线收低。',en:'The S&P 500 closed down 0.8%, the Nasdaq-100 fell 1.2% and the Dow slipped 0.5%; all three indexes finished lower.'},
  sectors:{zh:'能源涨 1.4% 领涨，半导体跌 2.3% 垫底；库里 1361 只股票里 38% 收涨。',en:'Energy led with +1.4% while semiconductors lagged at -2.3%; 38% of the 1361 stocks in the store closed up.'},
  macro:{zh:'十年期收益率 5.11%，比前一天上行 15bp，长期美债 TLT 跌 1.1%；恐慌指数 VIX 15.2，期限比值 0.84 仍低于 1；美元净流动性 5.87 万亿，较前一天 +2 亿；黄金跌 0.6%。同一天收益率上行、股指下跌。',en:'The 10-year yield rose 15bp to 5.11% and long Treasuries (TLT) fell 1.1%; VIX 15.2 with the term ratio at 0.84, still below 1; dollar net liquidity $5.87T, +$0.2B on the day; gold slipped 0.6%. Yields rose and stock indexes fell on the same day.'},
  tomorrow:{zh:'明天 08:30 美东公布初请失业金；COST、MU 盘后出财报；习近平访美第二天，白宫会谈。',en:'Initial jobless claims at 08:30 ET; COST and MU report after the close; day two of the Xi Jinping state visit, with the White House summit.'}},history:macroHistory(),observed:macroObserved(),latest_available:{as_of:'2026-09-23',dates:{DGS10:'2026-09-22',VIXCLS:'2026-09-23'},metrics:{nominal_10y:4.96,nominal_10y_20d_change_bp:26,vix:14.2,vix_3m:17.6,vix_term_ratio:0.807}},intraday:{quoted_at:'2026-09-24T04:23:46+00:00',session:'2026-09-24',phase:'pre',nominal_10y:5.114,vix:15.18,vix_3m:18.11,vix_term_ratio:0.838},schema:'macro-beta/1',status:'ok',as_of:'2026-09-18',observed_at:'2026-09-19T12:00:00Z',
  latest:{date:'2026-09-18',regime:'mixed',funding_score:57.5,rates_score:48,beta_score:51.6,metrics:{net_liquidity_bn:5850,net_liquidity_65d_change_bn:-120,nominal_10y:4.12,nominal_10y_20d_change_bp:9,vix:17.6,vix_3m:19.1,vix_term_ratio:0.9215}},
  fear_greed:{score:27,rating:'fear',previous_close:31,as_of:'2026-09-18T23:59:00+00:00'}});
 return Response.json({items:[],posts:[]});
};
const store=await import('/js/app/store.js'),router=await import('/js/app/router.js');
store.set('me',{user_id:8888,tier:'pro',access:{billing_enabled:false},watch_cap:50,
 ...(query.get('research')==='off'?{entitlement:{capabilities:{research:false}}}:{})});store.set('token','synthetic-fixture-only');store.set('watchlist',watches);
const {renderBrandNavigation}=await import('/js/app/navigation.js');renderBrandNavigation(store.get('me'));
if(!location.hash)history.replaceState(null,'',location.pathname+location.search+'#/'+(query.get('route')||'today'));
const language=document.querySelector('[data-lang-toggle]');if(language){const next=new URLSearchParams(query);next.set('lang',query.get('lang')==='en'?'zh':'en');language.href='/qa-frame?'+next+location.hash;}
await router.start();
document.querySelector('.app-foot')?.prepend(Object.assign(document.createElement('p'),{textContent:'LOCAL UI TEST · SYNTHETIC RECORDS · No production connection'}));
const report=document.createElement('details'),label=document.createElement('summary'),output=document.createElement('pre');
label.textContent='Local QA measurements';output.id='qa-status';report.append(label,output);document.querySelector('.app-foot')?.append(report);
setInterval(()=>{output.textContent=JSON.stringify({route:location.hash,width:innerWidth,errors,requests,
 overflow:[...document.querySelectorAll('.route-page *')].filter(n=>{const r=n.getBoundingClientRect();return r.width&&r.height&&(r.left<0||r.right>innerWidth+1);}).slice(0,10).map(n=>({tag:n.tagName,class:n.className})),
 navigation:[...document.querySelectorAll('.focus-nav a')].map(n=>n.textContent.trim())},null,2);},200);
