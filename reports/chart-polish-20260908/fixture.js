const q=new URLSearchParams(location.search),route=q.get('route')||'login',kind=q.get('case')||'data';
if(route==='watchlist'){localStorage.setItem('ducky-watch-view',['cap','equal'].includes(kind)?'heatmap':'list');localStorage.setItem('ducky-watch-area',kind==='cap'?'cap':'equal');}
window.qaCalls=[];window.qaErrors=[];window.addEventListener('error',e=>qaErrors.push(e.message));window.addEventListener('unhandledrejection',e=>qaErrors.push(String(e.reason)));
if(q.get('theme'))document.documentElement.dataset.theme=q.get('theme');
window.DUCKY={API_BASE:'/qa-api',BOT:'LOCAL_FIXTURE_ONLY'};
history.replaceState(null,'',location.pathname+location.search+'#/'+route);document.documentElement.dataset.tg='web';
const nativeFetch=window.fetch.bind(window),json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json'}});
const names='NVDA AVGO ORCL NOK CIEN COHR AAOI LITE CRDO GLW'.split(' ');
const items=Array.from({length:50},(_,i)=>({ticker:names[i]||'QA'+i,company:'LOCAL FIXTURE Company '+i,price:i===49?null:100+i,price_status:i===49?'missing':'ready',price_session:'2026-09-04',change_pct:i===49?null:i===48?0:(i%13)-6,market_cap:i===0?3e12:1e11/Math.pow(i+1,2),market_cap_status:i===47?'missing':'ready',market_cap_currency:'USD',market_cap_as_of:'2026-09-08T00:00:00Z'}));
const graph={ticker:'NVDA',status:'ready',checked_at:'2026-09-08T12:00:00Z',summary:null,analysis_status:'pending',nodes:Array.from({length:9},(_,i)=>({id:'n'+i,kind:'creator',stance:i<3?'support':i<6?'counter':'context',conditional:i===4,title:{zh:['订单增长仍待公司确认','客户需求变化需要继续跟踪','行业背景：光通信业务与网络设备'][i%3],en:['Order growth remains unconfirmed by the company','Customer demand needs further monitoring','Industry context: optical communications and network equipment'][i%3]},evidence:[{id:'e'+i,kind:'creator',author:'LOCAL QA Author',source_url:'https://example.com/layout',title:{en:'Local source layout example',zh:'本地排版示例来源'},start_seconds:70,end_seconds:90,published_at:'2026-09-04',observed_at:'2026-09-08T12:00:00Z'}]})),coverage:{corpus_documents:9,jobs:{pending:2}},missing:['price_gaps']};
const sample=[{id:1,kind:'insider',open_market_value:200000,ticker:'TTMI',ts:'2026-09-06T00:00:00Z',summary:'LOCAL FIXTURE · Director purchase / 高管买入',extra:{message_text:'LOCAL FIXTURE · Filing evidence. 仅测试排版，非实际记录。'},base_d:'2026-09-01',base_px:100,ret_1d:2,ret_5d:-8,ret_20d:null}];
window.fetch=async(url,opts={})=>{const parsed=new URL(url,location.origin);if(parsed.origin!==location.origin)throw Error('QA blocks remote requests');let p=parsed.pathname;if(p.startsWith('/qa-api')){qaCalls.push({path:p,method:opts.method||'GET'});
 if(p.endsWith('/radar/record.json'))return json({item:{id:'s:10',kind:'digest',ts:'2026-09-07T21:48:00Z',extra:{message_zh:'本地排版测试日报\n\n【资金】\n资料不足，尚无确认依据。\n\n【风险】\n示例跌幅 -3%。',message_en:'Local layout test report\n\n[A] Evidence\nNo support confirmed.\n\n[B] Risk\nExample decline -3%.',message_text:'Local fixture only'}}});
 if(p.includes('/evidence/'))return json(kind==='empty'?{ticker:'NVDA',status:'pending',nodes:[]}:graph);
 if(opts.method && opts.method!=='GET') return json({error:'local_fixture_no_mutations'},403);
 if(p.endsWith('/market/context'))return json({status:'ok',observed_at:'2026-09-07T07:00:00Z',topics:['利率与通胀','AI 与半导体','能源与供应','增长与盈利','市场与政策'].map((label,i)=>({label_zh:label,label_en:['Rates & inflation','AI & chips','Energy & supply','Growth & earnings','Markets & policy'][i],synthesis:{summary_zh:'本地排版测试：市场观察摘要。完整证据在展开后可查。',summary_en:'Local layout fixture. Full source evidence remains available.'},fact_ids:['test'],tickers:[]})),evidence:[{id:'test',title:'LOCAL FIXTURE source',source_url:'https://example.com/',publisher:'QA',kind:'news_headline',published_at:'2026-09-06'}]});
 if(p.includes('/auth/providers'))return json({google:true});
 if(p==='/qa-api/me/profile')return json({email:'layout@example.test',display_name:'UI preview',email_verified:true,has_password:false,google_linked:true,lang:'zh'});
 if(p.endsWith('/billing/plans'))return json({plans:[{tier:'pro',currency:'USD',months:1,amount:9},{tier:'pro',currency:'USD',months:12,amount:90},{tier:'pro',currency:'CNY',months:12,amount:499}],rails:[]});
 if(p.endsWith('/billing/orders'))return json({orders:[]});
 if(p.endsWith('/me/kols'))return json({subs:['fixture'],analysis:{}});
 if(p.endsWith('/kol/feed'))return json({kols:[{id:'fixture',name:'示例博主 · UI fixture',platform:'youtube',profile:{}}],pages:{},posts:[1,3,2].map(i=>({id:i,kol_id:'fixture',kol_name:'示例博主',title:'LOCAL FIXTURE · 第 '+i+' 条市场观察',published_at:'2026-09-0'+i+'T12:00:00Z',url:'https://example.com/fixture',summary:{quality:'no_call',zh:'本地测试：博主讨论企业盈利与本周重要公告。第二句话保留在完整解读里。第三句话也不应该默认占据首屏。',en:'A local fixture about company earnings. The additional detail should stay in the disclosure. This third sentence should not fill the first viewport.',source:{kind:'transcript',status:'ready',version:'creator-video-v4',summary_reviewed:true}},tickers:[],calls:[]}))});
 if(p.endsWith('/watchlist'))return kind==='error'?json({error:'network'},503):json({items:kind==='empty'?[]:items,overview:{items:kind==='empty'?[]:items,session:'2026-09-04',previous_session:'2026-09-03'}});
 if(p.includes('/bars/'))return json({bars:Array.from({length:80},(_,i)=>{const c=100+Math.sin(i/5)*12+i/8;return {t:new Date(Date.UTC(2026,5,1+i)).toISOString().slice(0,10),o:c+(i%2===0?2:-2),h:c+3,l:c-3,c,v:10000};})});
 if(p.includes('/public/company/'))return json({status:'unavailable'});
 if(p.includes('/snapshot/')){if(kind==='loading')return new Promise(()=>{});if(kind==='error')return json({error:'unavailable'},503);return json({ok:true,spot:100,built_at:'2026-09-06T00:00:00Z',tech:{rsi_d:24,rsi_w:42,rsi_m:61,dd_pct:-18.2,vs_50dma:3.4,vs_200dma:-2.5,oversold:true},retrace:{d20:{pos:.2,lo:91.12,hi:111.24}},rs:{benchmark:'SEMICONDUCTOR',excess20:-4.2,label:'lagging'},vol:{iv:42.1,hv:31.2,ratio:1.35,label:'rich'},gamma:{call_wall:310,put_wall:90,flip:100,regime:'negative',scope:{expiries:['2026-09-18','2026-10-16'],retrieved_at:'2026-09-06T00:00:00Z'},by_expiry:[{expiry:'2026-09-18',call_wall:310,put_wall:90,flip:100,dte:12},{expiry:'2026-10-16',call_wall:320,put_wall:80,flip:110,dte:40}]},expected:{low:90,high:110,move_pct:10,expiry:'2026-09-18'},company_context:{status:'ready',company:'LOCAL FIXTURE Semiconductor Corporation',label_zh:'半导体',label_en:'Semiconductors',business_zh:'仅测试公司说明及布局，不代表实际公司数据。',business_en:'Synthetic UI layout fixture, not actual company data.',peers:['AMD','INTC'],sources:[{url:'https://example.com/fixture',title:'LOCAL FIXTURE evidence'}]}});}
 if(p.includes('archive.json'))return kind==='error'?json({error:'unavailable'},503):kind==='loading'?new Promise(()=>{}):json({filter_version:3,items:kind==='empty'?[]:sample});
 if(p.includes('/calendar/links'))return json({issuers:{}});
 if(p.includes('/public/calendar.json'))return json({events:[]});
 return json({items:[],status:'unavailable',sectors:[],filter_version:3});
 }if(p==='/calendar.json') return nativeFetch(url,opts); if(p.startsWith('/'))return nativeFetch(url,opts);throw new Error('External request disabled in local fixture');};

// Local-only chart observability: no production state or data is accessed.
let chartQA=null;
const createChart=window.LightweightCharts.createChart;
window.LightweightCharts={...window.LightweightCharts,createChart:(host,options)=>{
 const chart=createChart(host,options);const state={chart,series:[]};chartQA=state;
 const add=chart.addSeries.bind(chart);
 chart.addSeries=(type,options,pane)=>{const series=add(type,options,pane);state.series.push(series);return series;};
 return chart;
}};
await import('/js/app/tg.js').then(m=>m.boot());
const store=await import('/js/app/store.js');if(!['login','register','forgot'].includes(route)){store.set('me',{tier:'pro',watch_cap:50,gates:{bars_period:'2y'}});store.set('watchlist',items.map(r=>r.ticker));}const router=await import('/js/app/router.js');await router.start();

// Measurements are exposed as DOM text so a browser audit can inspect the rendered
// result without reading internal application state or issuing extra API requests.
const ready=document.createElement('output');ready.id='qa-status';ready.hidden=true;document.body.append(ready);
let lastPointer=null;document.addEventListener('pointerdown',e=>{lastPointer={type:e.pointerType,label:e.target.closest('button,a,summary')?.textContent.trim()};});
const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
setInterval(()=>{
 const nav=[...document.querySelectorAll('.app-nav>a,.app-nav>.nav-more>summary')].filter(e=>e.getClientRects().length).map(e=>({label:e.textContent.trim(),...rect(e)}));
 const main=document.querySelector('.app-main'), content=[...document.querySelectorAll('#view .watch-row,#view .watch-tile,#view .evidence-node,#view .chart-host,#view .cal-bicell,#view .radar-row,#view .cr-post,#view .card')].filter(e=>e.getClientRects().length);
 const overflow=[...document.querySelectorAll('#view *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&(r.right>innerWidth+1||r.left<-1)&&getComputedStyle(e).position!=='fixed';}).slice(0,12).map(e=>({tag:e.tagName,cls:typeof e.className==='string'?e.className:'svg',...rect(e)}));
 ready.textContent=JSON.stringify({route:location.hash.slice(2),lang:document.documentElement.lang,width:innerWidth,height:innerHeight,coarse:matchMedia('(pointer:coarse)').matches,touchPoints:navigator.maxTouchPoints,lastPointer,theme:document.documentElement.dataset.theme||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'),nav,header:rect(document.querySelector('.app-top')),main:rect(main),firstContent:rect(content[0]),overflow,chart:chartQA?{font:chartQA.chart.options().layout.fontFamily,range:chartQA.chart.timeScale().getVisibleLogicalRange(),referenceY:chartQA.series[0]?.priceToCoordinate(310),series:chartQA.series.map(s=>({type:s.seriesType(),count:s.data().length,color:s.options().color,up:s.options().upColor,down:s.options().downColor})),pixels:[...document.querySelectorAll('canvas')].map(c=>{try{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<a.length;i+=4)if(a[i])n++;return n;}catch{return -1;}})}:null,tiles:document.querySelectorAll('.watch-tile').length,canvases:[...document.querySelectorAll('canvas')].map(e=>rect(e)),calls:qaCalls,errors:qaErrors});
},250);
