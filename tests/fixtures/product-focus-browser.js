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
const price=(ticker,i=0)=>({ticker,company:{NVDA:'NVIDIA Corporation',AVGO:'Broadcom Inc.',AMD:'Advanced Micro Devices, Inc.',GLW:'Corning Incorporated'}[ticker]||ticker,
 ...(['minute-quotes','saved-quotes'].includes(mode)?{quote:{price:218.25+i*23,change_pct:-2.42,status:mode==='saved-quotes'?'stale':'current',quote_at:new Date(Date.now()-(mode==='saved-quotes'?600000:1000)).toISOString(),provider:'yahoo',feed:'yahoo_regular_session'}}:{}),
 price:223.67+i*23,price_status:'ready',price_session:'2026-09-09',change_pct:i%2?3.2:-.91,market_cap:(5-i)*1e12,metrics:{ytd:{status:'ready',value:[20.1,-2,0,-12][i]},drawdown:{status:'ready',value:-5-i*5},relative:{status:'ready',value:-7+i*2,symbols:['SPY']},iv_hv:{status:i===2?'missing':'ready',value:i===2?null:.71+i*.25},attention:{status:'ready',value:75+i*5},degen:{status:'ready',value:48+i*4}},
 ...(mode==='wall-consistency'?{price:wallPrices[ticker],price_session:'2026-09-11',company:{NVDA:'NVIDIA Corporation',COIN:'Coinbase Global, Inc.',AVGO:'Broadcom Inc.',TSLA:'Tesla, Inc.',AMD:'Advanced Micro Devices, Inc.'}[ticker]}:{})});
const stockSummary=ticker=>({ticker,status:mode==='pending'?'pending':mode==='previous'?'refresh_pending':'ready',records:3,
 as_of:mode==='today-large'?new Date(Date.now()-(watches.length-watches.indexOf(ticker))*86400000).toISOString():mode==='previous'?previousClock:clock,overview:mode==='pending'?null:overview,sources:(mode==='previous'?previousNodes:nodes).slice(0,2)});
const record=i=>({id:'change-'+i,ticker:i%2?'AVGO':'NVDA',kind:i===1?'revised':'added',state:i===3?'unavailable':'available',earlier_content:i===2,
 initial_coverage:false,published_at:i===2?'2026-08-20':today,observed_at:clock,available_at:clock,node:i===3?null:nodes[i%3]});
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
  return Response.json({items:kind==='insider'?insider:kind==='13f'?funds:[],next_cursor:null});
 }
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
