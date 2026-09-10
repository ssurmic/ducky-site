// SYNTHETIC browser validation only. Never copied by build.py into the public site.
const q = new URLSearchParams(location.search), route = q.get('route') || 'research-brief';
const mode = q.get('case') || 'data', baseline = /*QA_BASELINE*/false;
if (route !== 'research-brief') {
  await import('/qa-old.js');
} else {
  const clock = '2026-09-09T12:00:00Z', NativeDate = Date;
  class FixedDate extends NativeDate { constructor(...args) { super(...(args.length ? args : [clock])); } static now(){ return NativeDate.parse(clock); } }
  window.Date = FixedDate;
  const theme = q.get('theme') === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;document.documentElement.dataset.tg = 'web';
  window.DUCKY = {API_BASE:'/qa-api',BOT:'LOCAL_FIXTURE_ONLY',BILLING_ENABLED:false,RESEARCH_BRIEF_ENABLED:!baseline && mode !== 'off'};
  history.replaceState(null,'',location.pathname+location.search+'#/research-brief');
  const requests=[],errors=[];window.addEventListener('error',event=>errors.push(event.message));
  window.addEventListener('unhandledrejection',event=>errors.push(String(event.reason)));
  const json=(data,status=200)=>Response.json(data,{status});
  const titles = [
    {en:'AI demand may support growth, if customer orders hold up',zh:'AI 需求可能带动增长，仍取决于客户订单'},
    {en:'Higher spending could pressure margins before new capacity pays off',zh:'新产能兑现之前，支出增加可能压低利润率'},
    {en:'Optical networking demand needs another quarter of confirmation',zh:'光通信需求还需要下一季数据确认'},
  ];
  const samplePrices = i => {
    const base=100+i*10,ret=[12.4,-4.5,0][i%3],d=i%6===5?'2026-09-02':'2026-09-04';
    return {version:'creator-price-context-v1',price_basis:'unadjusted_ohlc',currency:'USD',timezone:'America/New_York',as_of:'2026-09-09T02:00:00Z',
      publication_reference:{status:i===4?'time_unknown':'ready',d:i===4?null:d,price:i===4?null:base,field:'close',purpose:'last_completed_close_at_publication'},
      latest_close:{status:'ready',d:'2026-09-08',price:base*(1+ret/100),field:'close',purpose:'latest_recorded_close'},
      since_publication:{status:i===4?'time_unknown':'ready',ret:i===4?null:ret,price_basis:'unadjusted_close'}};
  };
  const sample = i => ({id:i+1,revision_id:100+i,kol_id:i%3?'sample-creator':'another-creator',
    kol_name:i%3?'Sample Creator':'Another Creator',platform_post_id:'sample-video-'+Math.floor(i/3),
    title:'Synthetic UI example · source '+(i+1),published_at:i===4?null:'2026-09-'+String(8-i%6).padStart(2,'0'),
    first_seen_at:i===3?null:'2026-09-09T01:30:00Z',recorded_at:'2026-09-09T02:00:00Z',
    url:'https://www.youtube.com/watch?v=example',calls:[{sym:['AVGO','NVDA','GLW'][i%3],
      point_id:'claim:sample'+i,stance:i===3?'unknown':i%3===1?'bear':'bull',intent:i===5?'mention':i===3?'context':'opinion',
      note:titles[i%3],condition_text:i%3===0?'If customer orders hold up':'',start_seconds:i===0?0:75+i,
      evidence:'Synthetic UI excerpt. These are test records, not real creator claims or market research.',price_context:samplePrices(i)}]});
  let researchRequests=0;
  window.fetch=async (input,opts={})=>{
    const url=new URL(String(input),location.origin);requests.push({path:url.pathname+url.search,method:opts.method||'GET'});
    if(url.origin!==location.origin)throw Error('External traffic forbidden in UI fixture');
    if((opts.method||'GET')!=='GET')throw Error('Writes forbidden in UI fixture');
    if(url.pathname==='/qa-api/watchlist')return mode==='partial'?json({},503):json({items:mode==='no-watch'?[]:[{ticker:'AVGO'},{ticker:'NVDA'}]});
    if(url.pathname==='/qa-api/kol/research'){
      researchRequests++;if(mode==='failure'||mode==='page-failure'&&researchRequests>1)return json({},503);
      let items=mode==='empty'?[]:Array.from({length:mode==='hundred'?100:9},(_,i)=>sample(i+(url.searchParams.has('before')?9:0)));
      if(url.searchParams.has('ticker'))items=items.filter(p=>p.calls[0].sym===url.searchParams.get('ticker'));
      if(url.searchParams.has('kol_id'))items=items.filter(p=>p.kol_id===url.searchParams.get('kol_id'));
      return json({schema:'creator-research/3',items,next_cursor:!url.searchParams.has('before')&&mode==='page-failure'?'second':null,
        pagination:{scope:'returned_page',unit:'study_records',scanned:items.length,returned:items.length}});
    }
    if(url.pathname==='/qa-api/data-versions')return json({});
    if(url.pathname==='/qa-api/kol/sample-creator/posts/sample-video-0')return json({},404);
    return json({items:[],posts:[],kols:[],subs:[],analysis:{}});
  };
  const store=await import('/js/app/store.js'), router=await import('/js/app/router.js');
  store.set('me',mode==='guest'?null:{user_id:8080,tier:'free',access:{billing_enabled:false}});store.set('token','local-synthetic-only');
  await router.start();
  const notice=document.createElement('p');notice.className='small';notice.textContent='LOCAL UI TEST · synthetic records · no production connection';
  document.querySelector('.app-foot')?.prepend(notice);
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Local QA measurements';
  const output=document.createElement('pre');output.id='qa-status';details.append(summary,output);document.querySelector('.app-foot')?.append(details);
  const rect=node=>{const r=node?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height}:null;};
  setInterval(()=>{
    output.textContent=JSON.stringify({baseline,mode,route:location.hash,width:innerWidth,height:innerHeight,theme,
      firstContent:rect(document.querySelector('.rb-evidence')),main:rect(document.querySelector('.app-main')),
      records:document.querySelectorAll('.rb-evidence').length,requests,errors,
      overflow:[...document.querySelectorAll('.research-brief *')].filter(node=>{const r=node.getBoundingClientRect();return r.width&&r.height&&(r.left<0||r.right>innerWidth+1);}).slice(0,8).map(node=>({tag:node.tagName,class:node.className,...rect(node)})),
      resources:performance.getEntriesByType('resource').map(r=>({name:new URL(r.name).pathname,duration:r.duration,bytes:r.transferSize})),
    },null,2);
  },100);
}
