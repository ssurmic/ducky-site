import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<html data-lang="en"><body><main></main><div id="modal" hidden></div><div id="toasts"></div></body></html>',{url:'https://ducky.test/app/#/watchlist'});
for(const key of ['window','document','Node','location','history','localStorage'])globalThis[key]=dom.window[key];
window.DUCKY={PRODUCT_FOCUS_ENABLED:true};
globalThis.requestAnimationFrame=fn=>setTimeout(fn,0);globalThis.cancelAnimationFrame=clearTimeout;
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([key])=>key.startsWith('app.')).map(([key,value])=>[key.slice(4),value])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const {watchlistStarters}=await import('../public/js/app/watchlist-first-use.js');
const {mount}=await import('../public/js/app/views/watchlist.js');
const {parse}=await import('../public/js/app/router.js');
const root=document.querySelector('main'),pause=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setTimeout(resolve,0));};
const ranking={status:'ready',collected_at:'2026-09-28T22:10:00Z',items:[
  {ticker:'AMD',rank:2,name:'Synthetic AMD company',mentions:0,change_pct:200,price:999},
  {ticker:'NVDA',rank:1,company:'Synthetic NVDA company',mentions:48},
  {ticker:'AMD',rank:3,mentions:90},{ticker:'AAPL',rank:4,mentions:4},
  {ticker:'TSM',rank:5,mentions:7},{ticker:'MSFT',rank:6,mentions:3},
  {ticker:'<bad>',rank:0,mentions:1}]};
function setup({watches=[],research=true,cap=50}={}){
  store.bumpEpoch();store.set('me',{user_id:123,tier:'pro',watch_cap:cap,entitlement:{capabilities:{research}},access:{billing_enabled:false}});
  store.set('token','synthetic-only');store.set('watchlist',watches);store.set('snapshots',{});
  root.replaceChildren();history.replaceState(null,'','#/watchlist');
}
function apiFixture({social=ranking,readFailure=false,symbols=[],watches=[]}={}){
  const calls=[];let membership=[...watches];
  globalThis.fetch=async(url,options={})=>{
    const method=options.method||'GET';calls.push({url,method,signal:options.signal});
    if(url==='/watchlist'&&method==='POST'){const {ticker}=JSON.parse(options.body);membership.push(ticker);return Response.json({ticker,added:true});}
    if(url==='/watchlist')return readFailure?Response.json({error:'temporary_failure'},{status:503}):Response.json({items:membership,cap:store.get('me').watch_cap,overview:{items:membership.map(ticker=>({ticker,company:ticker,price_status:'missing'}))}});
    if(url==='/me/stock-research')return Response.json({items:[],watchlist_count:membership.length});
    if(url==='/radar/social.json')return Response.json(social);
    if(url.startsWith('/public/symbols?'))return Response.json({items:symbols,total_count:symbols.length});
    if(url.startsWith('/briefing/')||url.startsWith('/radar/archive.json'))return Response.json({items:[]});
    throw Error('Unexpected API read '+url);
  };return calls;
}
async function search(value){const input=root.querySelector('.add-row input');input.value=value;input.dispatchEvent(new window.Event('input',{bubbles:true}));await new Promise(resolve=>setTimeout(resolve,205));await pause();return input;}

test('confirmed empty membership offers one research search and up to six dated real candidates without quote reads or writes',async()=>{
  setup();const calls=apiFixture(),dispose=await mount(root);await pause();
  try{
    assert.equal(root.querySelector('.watch-add-options>summary').hidden,true);
    assert.equal(root.querySelector('.add-row>button').hidden,true);
    assert.equal(root.querySelector('.watch-controls').hidden,true);
    assert.equal(root.querySelector('.watch-first-use img'),null);
    assert.deepEqual([...root.querySelectorAll('.watch-starter')].map(node=>node.dataset.ticker),['NVDA','AMD','AAPL','TSM','MSFT']);
    assert.match(root.querySelector('.watch-starters-date').textContent,/Sep 28/);
    assert.match(root.querySelector('[data-ticker=AMD] .watch-starter-count').textContent,/0 mentions/);
    assert.doesNotMatch(root.querySelector('.watch-first-use').textContent,/999/);
    for(const anchor of root.querySelectorAll('.watch-starter a')){
      const route=parse(anchor.getAttribute('href'));assert.equal(route.name,'stock');assert.ok(['NVDA','AMD','AAPL','TSM','MSFT'].includes(route.params.ticker));
      if(anchor.classList.contains('watch-starter-map'))assert.equal(route.params.query.get('tab'),'evidence');
    }
    assert.deepEqual(store.get('watchlist'),[]);assert.ok(calls.every(call=>call.method==='GET'));
    assert.equal(calls.filter(call=>call.url==='/radar/social.json').length,1);
    assert.ok(!calls.some(call=>/snapshot|stock-research\//.test(call.url)));
  }finally{dispose();}
});

test('empty search selection researches a result and preserves same-account search text without adding it',async()=>{
  setup();const calls=apiFixture({symbols:[{ticker:'NVDA',name:'Synthetic NVDA',instrument_type:'stock',watch_eligible:true}]}),dispose=await mount(root);
  await search('Synthetic NVDA');root.querySelector('.symbol-select').click();await pause();
  assert.equal(location.hash,'#/stock/NVDA');assert.deepEqual(store.get('watchlist'),[]);assert.equal(calls.filter(call=>call.method==='POST').length,0);
  dispose();root.replaceChildren();history.replaceState(null,'','#/watchlist');const again=await mount(root);
  try{assert.equal(root.querySelector('.add-row input').value,'NVDA');}finally{again();}
});

test('the separate Add result is explicit and guarded, then leaves the ordinary populated list intact',async()=>{
  setup();const calls=apiFixture({symbols:[{ticker:'NVDA',name:'Synthetic NVDA',instrument_type:'stock',watch_eligible:true}]}),dispose=await mount(root);
  try{
    await search('NVDA');const add=root.querySelector('.symbol-add');assert.equal(add.disabled,false);assert.equal(calls.filter(call=>call.method==='POST').length,0);
    add.click();await pause();
    assert.deepEqual(store.get('watchlist'),['NVDA']);assert.equal(calls.filter(call=>call.method==='POST').length,1);
    assert.equal(root.querySelector('.watch-first-use'),null);assert.equal(root.querySelector('.watch-controls').hidden,false);
    assert.equal(root.querySelector('.add-row>button').hidden,false);assert.equal(root.querySelector('.watch-add-options>summary').hidden,false);
    assert.equal(root.querySelector('[data-mode=list]').getAttribute('aria-pressed'),'true');assert.ok(root.querySelector('a[href="#/stock/NVDA?tab=evidence"]'));
    assert.equal(calls.filter(call=>call.url==='/radar/social.json').length,1);
  }finally{dispose();}
});

test('unknown or ineligible symbols never gain an Add action from discovery rank; a full account still permits research',async()=>{
  for(const [symbol,cap] of [[{ticker:'NVDA',name:'Synthetic',instrument_type:'stock'},50],[{ticker:'NVDA',name:'Synthetic',watch_eligible:false,watch_reason:'leveraged_instrument'},50],[{ticker:'NVDA',name:'Synthetic',watch_eligible:true},0]]){
    setup({cap});const calls=apiFixture({symbols:[symbol]}),dispose=await mount(root);
    try{
      assert.equal(root.querySelector('.watch-first-use .symbol-add'),null);await search('NVDA');
      const add=root.querySelector('.symbol-add');assert.ok(!add||add.disabled);root.querySelector('.symbol-select').click();
      assert.equal(location.hash,'#/stock/NVDA');assert.deepEqual(store.get('watchlist'),[]);assert.equal(calls.filter(call=>call.method==='POST').length,0);
    }finally{dispose();}
  }
});

test('ranking failure leaves search usable, retries only the ranking, and stale data keeps its date',async()=>{
  setup();const calls=apiFixture({social:{broken:true}}),dispose=await mount(root);await pause();
  try{
    assert.equal(root.querySelectorAll('.watch-starter').length,0);assert.match(root.querySelector('.watch-starters-status').textContent,/could not be read/);
    assert.equal(root.querySelector('.add-row input').disabled,false);
    globalThis.fetch=async(url,options={})=>{calls.push({url,method:options.method||'GET'});assert.equal(url,'/radar/social.json');return Response.json({...ranking,status:'stale'});};
    root.querySelector('.watch-starters-status button').click();await pause();
    assert.equal(root.querySelectorAll('.watch-starter').length,5);assert.match(root.querySelector('.watch-starters-status').textContent,/older ranking/);
    assert.match(root.querySelector('.watch-starters-date').textContent,/Sep 28/);assert.equal(calls.filter(call=>call.url==='/watchlist').length,1);
  }finally{dispose();}
});

test('membership read failure and restricted research access do not become empty research onboarding',async()=>{
  setup();let calls=apiFixture({readFailure:true}),dispose=await mount(root);await pause();
  try{assert.equal(root.querySelector('.watch-first-use'),null);assert.ok(root.querySelector('.errbox'));assert.ok(!calls.some(call=>call.url==='/radar/social.json'));}finally{dispose();}
  setup({research:false});calls=apiFixture();dispose=await mount(root);await pause();
  try{assert.equal(root.querySelector('.watch-first-use'),null);assert.ok(!calls.some(call=>call.url==='/radar/social.json'));assert.ok(root.querySelector('a[href="#/profile"]'));}finally{dispose();}
});

test('unavailable and pending rankings remain distinct from an empty collection and never invent a collection date',async()=>{
  for(const status of ['pending','unavailable']){
    setup();apiFixture({social:{status,items:[]}});const dispose=await mount(root);await pause();
    try{
      const notice=root.querySelector('.watch-starters-status');assert.doesNotMatch(notice.textContent,/No discussion ranking is available/);
      assert.match(notice.textContent,status==='pending'?/not available yet/:/could not be read/);
      assert.ok(notice.querySelector('button'));assert.equal(root.querySelector('.watch-starters-date').hidden,true);
    }finally{dispose();}
  }
});

test('late ranking replies after account change or disposal cannot paint the old preview and the read is aborted',async()=>{
  for(const changedAccount of [true,false]){
    setup();const epoch=store.epoch();let finish,requestSignal;
    globalThis.fetch=async(url,options)=>{assert.equal(url,'/radar/social.json');requestSignal=options.signal;return new Promise(resolve=>finish=resolve);};
    const preview=watchlistStarters({current:()=>store.epoch()===epoch});root.append(preview.node);
    if(changedAccount)store.bumpEpoch();else{preview.dispose();assert.equal(requestSignal.aborted,true);}
    finish(Response.json(ranking));await pause();
    assert.equal(root.querySelectorAll('.watch-starter').length,0);preview.dispose();
  }
});

test('changing account clears the remembered research query and populated lists never fetch starter candidates',async()=>{
  setup();let calls=apiFixture(),dispose=await mount(root);const input=root.querySelector('.add-row input');input.value='private old query';input.dispatchEvent(new window.Event('input'));dispose();
  setup();calls=apiFixture();dispose=await mount(root);
  try{assert.equal(root.querySelector('.add-row input').value,'');}finally{dispose();}
  setup({watches:['NVDA']});calls=apiFixture({watches:['NVDA']});dispose=await mount(root);
  try{assert.equal(root.querySelector('.watch-first-use'),null);assert.ok(!calls.some(call=>call.url==='/radar/social.json'));assert.equal(root.querySelector('.add-row>button').hidden,false);}finally{dispose();}
});

const quick=ticker=>root.querySelector(`[data-ticker="${ticker}"] .watch-starter-add`);
test('direct Add saves two stocks once, retains candidate nodes and exits only on explicit Done',async()=>{
  setup();const calls=apiFixture(),dispose=await mount(root);await pause();
  try{
    const card=root.querySelector('[data-ticker=NVDA]'),button=quick('NVDA');button.focus();button.click();button.click();quick('AMD').click();await pause();
    assert.deepEqual(store.get('watchlist'),['NVDA']);assert.equal(calls.filter(c=>c.method==='POST').length,1);
    assert.equal(root.querySelector('[data-ticker=NVDA]'),card);assert.equal(quick('NVDA'),button);
    assert.equal(document.activeElement,button);assert.equal(button.textContent,'Added');assert.equal(button.disabled,true);
    assert.equal(quick('AMD').disabled,false);quick('AMD').click();await pause();
    assert.deepEqual(store.get('watchlist'),['NVDA','AMD']);assert.equal(calls.filter(c=>c.method==='POST').length,2);
    assert.equal(root.querySelector('.watch-starters-done').textContent,'View my watchlist (2)');
    assert.equal(root.querySelector('.watch-layout').hidden,true);
    root.querySelector('.watch-starters-done').click();assert.equal(root.querySelector('.watch-first-use'),null);
    assert.equal(root.querySelector('.watch-layout').hidden,false);assert.equal(root.querySelector('.watch-controls').hidden,false);
    assert.ok(root.querySelector('a[href="#/stock/AMD?tab=evidence"]'));
    assert.equal(calls.filter(c=>c.url==='/radar/social.json').length,1);
    assert.ok(!calls.some(c=>/public\/symbols|snapshot/.test(c.url)));
  }finally{dispose();}
});
test('direct Add preserves a committed membership while research is slow and a later membership read fails',async()=>{
  setup();apiFixture();const dispose=await mount(root);await pause();const original=globalThis.fetch;let researchFinish;
  globalThis.fetch=async(url,opts={})=>url==='/me/stock-research'?new Promise(resolve=>researchFinish=resolve):url==='/watchlist'&&opts.method!=='POST'?Response.json({error:'temporary_failure'},{status:503}):original(url,opts);
  try{
    quick('NVDA').click();await pause();assert.deepEqual(store.get('watchlist'),['NVDA']);
    assert.equal(quick('NVDA').textContent,'Added');assert.equal(quick('AMD').disabled,false);
    assert.equal(root.querySelector('[data-ticker=NVDA] .watch-starter-feedback').hidden,true);
    researchFinish(Response.json({items:[]}));await pause();assert.deepEqual(store.get('watchlist'),['NVDA']);
  }finally{dispose();}
});
test('direct Add rejects malformed acknowledgements, preserves membership and permits an explicit retry',async()=>{
  for(const body of [{ticker:'OTHER',added:true},{ticker:'NVDA'},{added:true}]){
    setup();apiFixture();const dispose=await mount(root);await pause();const original=globalThis.fetch;
    globalThis.fetch=async(url,opts={})=>opts.method==='POST'?Response.json(body):original(url,opts);
    try{quick('NVDA').click();await pause();assert.deepEqual(store.get('watchlist'),[]);assert.equal(quick('NVDA').disabled,false);
      assert.match(root.querySelector('[data-ticker=NVDA] .watch-starter-feedback').textContent,/Try again/);
    }finally{dispose();}
  }
});
test('direct Add explains authoritative ineligibility or capacity rejection without writing membership',async()=>{
  for(const body of [{error:'watch_ineligible',reason:'leveraged_instrument'},{error:'watch_limit',cap:0}]){
    setup();apiFixture();const dispose=await mount(root);await pause();const original=globalThis.fetch;
    globalThis.fetch=async(url,opts={})=>opts.method==='POST'?Response.json(body,{status:400}):original(url,opts);
    try{quick('NVDA').click();await pause();assert.deepEqual(store.get('watchlist'),[]);
      assert.equal(root.querySelector('[data-ticker=NVDA] .watch-starter-feedback').hidden,false);
      assert.equal(quick('AMD').disabled,body.error==='watch_limit');assert.ok(root.querySelector('[data-ticker=NVDA] a.watch-starter-map'));
    }finally{dispose();}
  }
});
test('late Add responses cannot update membership after an abort, disposal or account change',async()=>{
  for(const cancel of ['abort','dispose','account']){
    setup();apiFixture();const controller=new AbortController(),dispose=await mount(root,{signal:controller.signal});await pause();let finish;
    globalThis.fetch=async()=>new Promise(resolve=>finish=resolve);
    quick('NVDA').click();if(cancel==='abort')controller.abort();else if(cancel==='dispose')dispose();else{store.bumpEpoch();store.set('watchlist',[]);}
    finish(Response.json({ticker:'NVDA',added:true}));await pause();assert.deepEqual(store.get('watchlist'),[]);dispose();
  }
});
test('saved overviews retain their own date and missing summary dates do not borrow ranking timestamps',async()=>{
  setup();apiFixture({social:{...ranking,items:[
    {ticker:'NVDA',rank:1,mentions:12,overall:{en:'A dated saved overview.'},overall_as_of:'2026-09-25T12:00:00Z'},
    {ticker:'AMD',rank:2,mentions:0,overall:{en:'An undated overview.'}},
    {ticker:'TSM',rank:3,mentions:null},
  ]}});const dispose=await mount(root);await pause();
  try{assert.match(root.querySelector('[data-ticker=NVDA] .watch-starter-reading').textContent,/Sep 25/);
    assert.equal(root.querySelector('[data-ticker=AMD] .watch-starter-reading'),null);
    assert.match(root.querySelector('[data-ticker=AMD] .watch-starter-count').textContent,/0 mentions/);
    assert.doesNotMatch(root.querySelector('[data-ticker=TSM] .watch-starter-count').textContent,/0 mentions/);
  }finally{dispose();}
});

test('after quick Add, search selection and Enter remain research actions without an implicit second write',async()=>{
  setup();const calls=apiFixture({symbols:[{ticker:'AMD',name:'Synthetic AMD',watch_eligible:true}]}),dispose=await mount(root);await pause();
  try{quick('NVDA').click();await pause();await search('AMD');root.querySelector('.add-row form');
    root.querySelector('.symbol-select').click();await pause();assert.equal(location.hash,'#/stock/AMD');
    history.replaceState(null,'','#/watchlist');await search('AMD');root.querySelector('form.add-row').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await pause();
    assert.equal(location.hash,'#/stock/AMD');assert.equal(calls.filter(c=>c.method==='POST').length,1);
  }finally{dispose();}
});
test('post-add read denial remains visible before and after Done and blocks additional quick writes',async()=>{
  setup();apiFixture();const dispose=await mount(root);await pause();const original=globalThis.fetch;
  globalThis.fetch=async(url,opts={})=>url==='/watchlist'&&opts.method!=='POST'?Response.json({error:'forbidden'},{status:403}):original(url,opts);
  try{quick('NVDA').click();await pause();const error=root.querySelector('.errbox');assert.ok(error);assert.equal(error.closest('[hidden]'),null);
    assert.equal(quick('AMD').disabled,true);root.querySelector('.watch-starters-done').click();assert.equal(error.isConnected,true);assert.equal(error.closest('[hidden]'),null);
  }finally{dispose();}
});

test('a late successful research response cannot restore reviewed text after the same load denied membership',async()=>{
  setup();apiFixture();const dispose=await mount(root);await pause();const original=globalThis.fetch;let finishResearch;
  globalThis.fetch=async(url,opts={})=>url==='/me/stock-research'?new Promise(resolve=>finishResearch=resolve):
    url==='/watchlist'&&opts.method!=='POST'?Response.json({error:'forbidden'},{status:403}):original(url,opts);
  try{
    quick('NVDA').click();await pause();assert.deepEqual(store.get('watchlist'),['NVDA']);
    const error=root.querySelector('.errbox');assert.ok(error);assert.equal(error.closest('[hidden]'),null);
    const text='Synthetic reviewed text arriving after membership denial.';
    finishResearch(Response.json({items:[{ticker:'NVDA',status:'ready',as_of:'2026-09-25T20:10:00Z',
      overview:{en:text,zh:'测试迟到摘要。',citations:['synthetic-source']},sources:[{id:'synthetic-source',kind:'creator',stance:'support',
        title:{en:'Synthetic source',zh:'测试来源'},published_at:'2026-09-24',evidence:[{author:'Synthetic author',source_url:'https://example.com/synthetic-only'}]}]}]}));
    await pause();assert.equal(quick('AMD').disabled,true);
    root.querySelector('.watch-starters-done').click();
    assert.equal(root.textContent.includes(text),false);assert.equal(root.querySelector('.stock-one-sentence'),null);
    assert.equal(error.isConnected,true);assert.equal(error.closest('[hidden]'),null);
  }finally{dispose();}
});
