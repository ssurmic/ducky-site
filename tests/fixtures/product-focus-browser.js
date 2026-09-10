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
const analysis={overview,sections:[{kind:'key_points',zh:'产能投放能否转成订单，取决于客户支出。',en:'Converting new capacity into orders depends on customer spending.',citations:['first']},
 {kind:'risks',zh:'利润率可能先承压，不能把产能增加等同于收入。',en:'Margins may come under pressure first; capacity growth is not booked revenue.',citations:['second']},
 {kind:'watch',zh:'下一份财报需要核对订单和资本支出。',en:'Check orders and capital spending in the next earnings report.',citations:['first']}]};
if(mode==='no-watch-section')analysis.sections=analysis.sections.filter(p=>p.kind!=='watch');
let watches=mode==='no-watch'?[]:['NVDA','AVGO','AMD','GLW'];
let researchReads=0;
const price=(ticker,i=0)=>({ticker,company:{NVDA:'NVIDIA Corporation',AVGO:'Broadcom Inc.',AMD:'Advanced Micro Devices, Inc.',GLW:'Corning Incorporated'}[ticker]||ticker,
 price:223.67+i*23,price_status:'ready',price_session:'2026-09-09',change_pct:i%2?3.2:-.91,market_cap:(5-i)*1e12,metrics:{ytd:{status:'ready',value:[20.1,-2,0,-12][i]},drawdown:{status:'ready',value:-5-i*5},relative:{status:'ready',value:-7+i*2,symbols:['SPY']},iv_hv:{status:i===2?'missing':'ready',value:i===2?null:.71+i*.25},attention:{status:'ready',value:75+i*5},degen:{status:'ready',value:48+i*4}}});
const stockSummary=ticker=>({ticker,status:mode==='pending'?'pending':mode==='previous'?'refresh_pending':'ready',records:3,
 as_of:mode==='previous'?previousClock:clock,overview:mode==='pending'?null:overview,sources:(mode==='previous'?previousNodes:nodes).slice(0,2)});
const record=i=>({id:'change-'+i,ticker:i%2?'AVGO':'NVDA',kind:i===1?'revised':'added',state:i===3?'unavailable':'available',earlier_content:i===2,
 initial_coverage:false,published_at:i===2?'2026-08-20':today,observed_at:clock,available_at:clock,node:i===3?null:nodes[i%3]});
window.fetch=async(input,options={})=>{
 const url=new URL(String(input),location.origin);requests.push({path:url.pathname+url.search,method:options.method||'GET'});
 if(url.origin!==location.origin)throw Error('External traffic forbidden in synthetic fixture');
 if((options.method||'GET')!=='GET')throw Error('Writes forbidden in synthetic fixture');
 const path=url.pathname.replace('/qa-api','');
 if(mode==='failure'&&path.includes('research'))return Response.json({error:'fixture_unavailable'},{status:503});
 if(path==='/watchlist')return Response.json({items:watches.map(ticker=>({ticker})),overview:{items:watches.map(price),session:'2026-09-09'}});
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
 if(path.startsWith('/evidence/'))return Response.json({ticker:path.split('/').at(-1),status:'ready',nodes,analysis_status:'ready',analysis,analysis_generated_at:clock});
 if(path.startsWith('/stock-research/')){const ticker=path.split('/').at(-1);return Response.json({ticker,price:price(ticker),evidence:{ticker,nodes,
  analysis_status:mode==='pending'?'pending':mode==='previous'?'refresh_pending':'ready',analysis:mode==='pending'?null:analysis,
  analysis_generated_at:mode==='previous'?previousClock:clock,...(mode==='previous'?{analysis_nodes:previousNodes,analysis_snapshot_id:'synthetic-old'}:{})}});}
 if(path.startsWith('/bars/'))return Response.json({bars:mode==='pending'?[]:Array.from({length:90},(_,i)=>({t:new Date(Date.UTC(2026,5,1+i)).toISOString().slice(0,10),c:170+i*.48+Math.sin(i*.18)*12}))});
 if(path==='/public/symbols')return Response.json({items:[{ticker:'NVDA',name:'NVIDIA Corporation'}]});
 if(path==='/data-versions')return Response.json({});
 return Response.json({items:[],posts:[]});
};
const store=await import('/js/app/store.js'),router=await import('/js/app/router.js');
store.set('me',{user_id:8888,tier:'pro',access:{billing_enabled:false},watch_cap:50});store.set('token','synthetic-fixture-only');store.set('watchlist',watches);
if(!location.hash)history.replaceState(null,'',location.pathname+location.search+'#/'+(query.get('route')||'today'));
const language=document.querySelector('[data-lang-toggle]');if(language){const next=new URLSearchParams(query);next.set('lang',query.get('lang')==='en'?'zh':'en');language.href='/qa-frame?'+next+location.hash;}
await router.start();
document.querySelector('.app-foot')?.prepend(Object.assign(document.createElement('p'),{textContent:'LOCAL UI TEST · SYNTHETIC RECORDS · No production connection'}));
const report=document.createElement('details'),label=document.createElement('summary'),output=document.createElement('pre');
label.textContent='Local QA measurements';output.id='qa-status';report.append(label,output);document.querySelector('.app-foot')?.append(report);
setInterval(()=>{output.textContent=JSON.stringify({route:location.hash,width:innerWidth,errors,requests,
 overflow:[...document.querySelectorAll('.route-page *')].filter(n=>{const r=n.getBoundingClientRect();return r.width&&r.height&&(r.left<0||r.right>innerWidth+1);}).slice(0,10).map(n=>({tag:n.tagName,class:n.className})),
 navigation:[...document.querySelectorAll('.focus-nav a')].map(n=>n.textContent.trim())},null,2);},200);
