import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html data-lang="en"><body></body></html>',{url:'https://ducky.test/app/#/evidence/AVGO'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const {mount,mapView,connectMap,analysisPanel}=await import('../public/js/app/views/evidence.js');
const {safeTarget}=await import('../public/js/app/login-target.js');
const {closeModal}=await import('../public/js/app/ui.js');
const response=(d,status=200)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json'}});
function fixture(){return {ticker:'AVGO',status:'ready',checked_at:'2026-09-07T12:00:00Z',summary:{en:'Orders remain unconfirmed.',zh:'订单尚待确认。',citations:['n9']},
 nodes:Array.from({length:10},(_,i)=>({id:'n'+i,title:{en:'Point '+i,zh:'观点 '+i},kind:'creator',stance:i===9?'counter':i<5?'support':'context',conditional:i===9,
 published_at:'2026-09-04',evidence:[{id:'e'+i,kind:'creator',author:i===9?'Counter Author':'Source Author',source_url:'https://example.com/source',title:{en:'Source '+i,zh:'来源 '+i},
 start_seconds:70,end_seconds:90,published_at:'2026-09-04',observed_at:'2026-09-07T12:00:00Z'}]})),coverage:{corpus_documents:12,jobs:{pending:2}},missing:['price_gaps']};}
test('a ticker-like channel name is labelled as creator on both layouts and keeps the CEG route',()=>{
 const d=fixture();d.ticker='CEG';d.nodes=[{...d.nodes[0],title:{en:'CEG benefits from rising electricity prices.'},
  evidence:[{...d.nodes[0].evidence[0],author:'Ticker Symbol: YOU',platform:'youtube',creator_id:'ticker-symbol-you',
   post_id:'csv55UtVMZM',point_id:'claim:ceg',source_url:'https://www.youtube.com/watch?v=csv55UtVMZM&t=672s'}]}];
 const root=mapView(d);document.body.append(root);
 const card=root.querySelector('.evidence-node');
 assert.equal(card.querySelector('.evidence-node-author').textContent,'Creator · Ticker Symbol: YOU');
 assert.equal(card.querySelector('.evidence-mobile-author').textContent,'Creator · Ticker Symbol: YOU');
 assert.equal(card.querySelector('.evidence-category').textContent,'Bullish');
 assert.ok(card.classList.contains('is-support'));
 assert.match(root.querySelector('.evidence-center').textContent,/CEG/);
 card.click();assert.equal(location.hash,'#/creators?scope=discover&creator=ticker-symbol-you&post=csv55UtVMZM&point=claim%3Aceg');
 root.dispose();root.remove();location.hash='#/evidence/AVGO';
});
test('focused map checks a creator in place, retaining the stock, original segment and return focus',()=>{
 const previous=window.DUCKY;window.DUCKY={...previous,PRODUCT_FOCUS_ENABLED:true};
 const before=location.hash,doc=fixture();let calls=0,root;
 globalThis.fetch=()=>{calls++;throw Error('Opening a saved source must not fetch');};
 const node=doc.nodes[0];node.evidence[0]={...node.evidence[0],creator_id:'source-author',post_id:'abcdefghijk',
  point_id:'claim:source',source_url:'https://www.youtube.com/watch?v=abcdefghijk',
  condition_text:'If the stated order is confirmed.',horizon_text:'Over the next year.'};
 node.reason=node.title;node.evidence[0].reason=node.title;
 doc.nodes=[node];
 try{
  root=mapView(doc);document.body.append(root);
  const button=root.querySelector('.evidence-node-open');button.focus();button.click();
  const dialog=document.querySelector('[role="dialog"]');
  assert.ok(dialog);assert.equal(location.hash,before);assert.equal(calls,0);
  assert.equal(dialog.textContent.split(node.title.en).length-1,1,'identical title/reason is shown once');
  assert.match(dialog.textContent,/If the stated order is confirmed/);
  assert.match(dialog.textContent,/Over the next year/);
  assert.match(dialog.textContent,/2026-09-04/);
  assert.equal(dialog.querySelector('a[target="_blank"]').href,'https://www.youtube.com/watch?v=abcdefghijk&t=70');
  assert.equal(dialog.querySelector('a').target,'_blank','the original source is the first source action');
  const creator=dialog.querySelector('a[href^="#/creators"]');
  assert.equal(creator.getAttribute('href'),'#/creators?scope=discover&ticker=AVGO&creator=source-author&post=abcdefghijk&point=claim%3Asource');
  document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(document.querySelector('[role="dialog"]'),null);
  assert.equal(document.activeElement,button);assert.equal(location.hash,before);
  assert.match(root.querySelector('.evidence-author-heading a').href,/ticker=AVGO&creator=source-author/);
 }finally{closeModal();root?.dispose();root?.remove();window.DUCKY=previous;}
});
test('direct source links retain stock context when returning to the creator, including retained link aliases',async()=>{
 const previous=window.DUCKY;
 try{
  for(const compact of [true,false])for(const identity of ['node','id','point_id','legacy_claim_id','source_record_id']){
   store.bumpEpoch();store.set('me',{tier:'pro',user_id:8888});
   window.DUCKY={...previous,PRODUCT_FOCUS_ENABLED:compact};
   const doc=fixture(),node=doc.nodes[0],calls=[];
   node.evidence[0]={...node.evidence[0],creator_id:'source-author',post_id:'abcdefghijk',
    point_id:'claim:current',id:'source-record',legacy_claim_id:'legacy:old',source_record_id:'record:old'};
   doc.nodes=[node];
   const sourceId=identity==='node'?node.id:node.evidence[0][identity];
   globalThis.fetch=async(url,options)=>{
    assert.equal(options.method,'GET');assert.equal(url,'/evidence/AVGO');calls.push(url);return response(doc);
   };
   const root=document.createElement('main');document.body.append(root);
   let cleanup;
   try{
    cleanup=await mount(root,{ticker:'AVGO',query:new URLSearchParams({source:sourceId})});
    const dialog=document.querySelector('[role="dialog"]');assert.ok(dialog,identity);
    const href=dialog.querySelector('a[href^="#/creators"]').getAttribute('href');
    assert.equal(href,'#/creators?scope=discover&ticker=AVGO&creator=source-author&post=abcdefghijk&point=claim%3Acurrent');
    assert.equal(safeTarget(href+'&token=discarded'),href);
    assert.equal(dialog.querySelector('[data-reading-ticker]').dataset.readingTicker,'AVGO');
    assert.deepEqual(calls,['/evidence/AVGO'],'source opening does not fetch creator data or regenerate research');
   }finally{cleanup?.();closeModal();root.remove();}
  }
 }finally{window.DUCKY=previous;store.bumpEpoch();store.set('me',null);}
});
test('historical ownership direction stays consistent across badge, filter, source and dates',()=>{
 const doc=fixture();doc.ticker='VST';doc.nodes=[{id:'exercise',kind:'record',stance:'support',
  title:{en:'Spouse exercised calls to acquire 5,000 VST shares'},published_at:'2026-01-23',
  evidence:[{kind:'record',topic:'ownership_disclosure',author:'Nancy Pelosi',freshness:'stale',
   source_url:'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20033725.pdf',
   published_at:'2026-01-23',observed_at:'2026-09-08T06:00:00Z',retrieved_at:'2026-09-09T06:00:00Z',
   data:{opinion_state:'not_stated',applicability:'historical_event',event_direction:'positive',
    event_date:'2026-01-16',filing_date:'2026-01-23',validity:{classification:'classified',source:'validated_source_fields'}}}]}];
 const root=mapView(doc);document.body.append(root);
 assert.equal(root.querySelector('.evidence-node .evidence-category').textContent,'Bullish clue');
 assert.ok(root.querySelector('.evidence-node.source-filing.is-support'));
 assert.equal(root.querySelector('.evidence-filters .is-support .evidence-filter-count').textContent,'1');
 assert.match(root.querySelector('.evidence-node-footer').textContent,/Event · 2026-01-16/);
 assert.ok(!root.querySelector('.evidence-node-footer').textContent.includes('2026-09-09'));
 root.querySelector('.evidence-filters .is-support').click();
 assert.equal(root.querySelectorAll('.evidence-node').length,1);
 root.querySelector('.evidence-node').click();const body=document.querySelector('.modal-body');
 assert.equal(body.querySelector('.evidence-stance').textContent,'Bullish clue');
 assert.match(body.textContent,/Event date · 2026-01-16/);assert.match(body.textContent,/Disclosed · 2026-01-23/);
 assert.match(body.textContent,/historical event/);assert.ok(!body.textContent.includes('data is stale'));
 assert.equal(body.querySelector('a[target="_blank"]').href,doc.nodes[0].evidence[0].source_url);
 closeModal();root.dispose();root.remove();
});
test('ownership labels require a consistent typed event, never words or retrieval age',async()=>{
 const {eventLabel,nodeEvent}=await import('../public/js/app/evidence-event.js');
 const event={opinion_state:'not_stated',applicability:'historical_event',event_direction:'negative',
  event_date:'2026-01-16',validity:{classification:'classified',source:'validated_source_fields'}};
 const node={stance:'counter',title:{en:'Purchase'},evidence:[{topic:'ownership_disclosure',data:event}]};
 assert.equal(eventLabel(node),'Bearish clue');
 for(const change of [{stance:'support'},{evidence:[]},{evidence:[{topic:'ownership_disclosure',data:{...event,validity:{classification:'needs_review'}}}]},
  {evidence:[node.evidence[0],{kind:'creator',title:{en:'Buy'}}]}])assert.equal(nodeEvent({...node,...change}),null);
 const creator=fixture().nodes[0];assert.equal(eventLabel(creator),'Bullish');
});
test('saved overview is visible on arrival; reasons and exact citations require no network',()=>{
 let calls=0;globalThis.fetch=()=>{calls++;throw Error('must not infer on click');};
 const d=fixture();d.analysis_status='ready';d.analysis_generated_at=d.checked_at;
 d.analysis={overview:d.summary,sections:[{kind:'risks',...d.summary}]};
 const root=analysisPanel(d);document.body.append(root);
 assert.equal(root.querySelector('.evidence-analysis-overview').textContent,'Orders remain unconfirmed.10');
 assert.equal(root.querySelector('.evidence-analysis-details').open,false);
 assert.match(root.querySelector('.evidence-analysis-time').textContent,/2026-09-07 12:00 UTC/);
 assert.equal(root.querySelector('.btn-primary'),null);
 root.querySelector('summary').click();assert.equal(calls,0);
 assert.equal(root.querySelector('.evidence-analysis-details').open,true);
 root.querySelector('.brief-citation').click();assert.match(document.querySelector('.modal-body').textContent,/Counter Author/);
 closeModal();root.remove();
 d.analysis_status='source_changed';d.summary=null;
 assert.ok(!analysisPanel(d).textContent.includes('Orders remain unconfirmed'));
 assert.equal(safeTarget('#/evidence/avgo?source=claim:abc&token=secret'),'#/evidence/AVGO?source=claim%3Aabc');
});
test('only one overview appears above the graph, with detailed analysis still available',()=>{
 const d=fixture();d.analysis_status='ready';d.analysis_generated_at=d.checked_at;
 d.analysis={overview:{en:'The saved overview.',citations:['n9']},sections:[{kind:'risks',en:'A separately cited risk.',citations:['n9']}]};
 const root=mapView(d);document.body.append(root);
 assert.ok(root.firstElementChild.classList.contains('evidence-analysis'));
 assert.equal(root.querySelectorAll('.evidence-analysis').length,1);
 assert.ok(!root.textContent.includes('Orders remain unconfirmed.'));
 assert.match(root.querySelector('details.evidence-analysis-details').textContent,/A separately cited risk/);
 assert.equal(root.querySelector('.evidence-filters .is-support span').textContent,'Bullish');
 assert.equal(root.querySelector('.evidence-node.is-counter .evidence-category').textContent,'Bearish');
 assert.equal(root.querySelector('.evidence-priority'),null);
 root.dispose();root.remove();
});
test('two evidence sections stay readable without inventing a watch item or fetching data',()=>{
 let calls=0;globalThis.fetch=()=>{calls++;throw Error('shared evidence only');};
 const d=fixture();d.analysis_status='ready';d.analysis_generated_at=d.checked_at;
 d.analysis={overview:d.summary,sections:[
  {kind:'key_points',en:'The reported orders are not confirmed.',citations:['n9']},
  {kind:'risks',en:'The source does not establish future revenue.',citations:['n9']}]};
 const root=analysisPanel(d);document.body.append(root);
 root.querySelector('summary').click();
 assert.equal(root.querySelectorAll('.evidence-analysis-body > section').length,2);
 assert.equal(root.querySelector('.is-watch'),null);
 assert.match(root.textContent,/The source does not establish future revenue/);
 root.querySelector('.is-risks .brief-citation').click();
 assert.match(document.querySelector('.modal-body').textContent,/Counter Author/);
 closeModal();root.remove();assert.equal(calls,0);
});
test('an earlier analysis keeps its dated evidence while the graph shows a newer observation',()=>{
 let calls=0;globalThis.fetch=()=>{calls++;throw Error('snapshot interactions must stay local');};
 const d=fixture();d.analysis_status='refresh_pending';d.analysis_generated_at=d.checked_at;d.analysis_snapshot_id='historical-snapshot';
 const row=count=>({id:'attention',kind:'fact',stance:'context',title:{en:count+' recorded Reddit mentions'},
   observed_at:'2026-09-07T12:00:00Z',evidence:[{kind:'fact',topic:'reddit_attention',data:{mentions:count,mentions_previous:13,index:null},observed_at:'2026-09-07T12:00:00Z'}]});
 d.nodes=[row(4)];d.analysis_nodes=[row(3)];
 d.analysis={overview:{en:'The saved analysis used three recorded mentions.',citations:['attention']},sections:[{kind:'watch',en:'A count alone does not establish sentiment.',citations:['attention']}]};
 const root=mapView(d);document.body.append(root);
 assert.match(root.querySelector('.evidence-analysis-time').textContent,/Previous analysis.*2026-09-07 12:00 UTC/);
 assert.match(root.querySelector('.evidence-analysis [role=status]').textContent,/New data has arrived/);
 assert.match(root.querySelector('.evidence-node').textContent,/4 recorded Reddit mentions/);
 root.querySelector('.brief-citation').click();
 assert.equal(document.querySelector('#modal-title').textContent,'3 recorded Reddit mentions');
 assert.match(document.querySelector('.modal-body .data-notice').textContent,/2026-09-07 12:00 UTC/);
 assert.equal(JSON.parse(document.querySelector('.evidence-facts').textContent).mentions,3);
 closeModal();root.querySelector('.evidence-analysis-details summary').click();
 root.querySelector('.evidence-analysis-body .brief-citation').click();
 assert.equal(JSON.parse(document.querySelector('.evidence-facts').textContent).mentions,3);
 closeModal();root.querySelector('.evidence-node').click();
 assert.equal(document.querySelector('#modal-title').textContent,'4 recorded Reddit mentions');
 assert.equal(document.querySelector('.evidence-detail > .data-notice'),null);
 assert.equal(calls,0);closeModal();root.dispose();root.remove();
});
test('previous analysis fails closed without a complete original-evidence binding and after withdrawal',()=>{
 const d=fixture();d.analysis_status='refresh_pending';d.analysis_generated_at=d.checked_at;d.analysis_snapshot_id='historical-snapshot';
 d.analysis={overview:{en:'An earlier claim.',citations:['n9']},sections:[]};
 for(const nodes of [undefined,[],[d.nodes[0]]]){
   d.analysis_nodes=nodes;const root=analysisPanel(d);
   assert.ok(!root.textContent.includes('An earlier claim.'));
   assert.ok(!root.textContent.includes('Orders remain unconfirmed.'));
   assert.equal(root.querySelector('.brief-citation'),null);
 }
 d.analysis_nodes=[d.nodes[9]];
 for(const status of ['withdrawn','source_changed']){
   d.analysis_status=status;const root=analysisPanel(d);
   assert.ok(!root.textContent.includes('An earlier claim.'));
   assert.equal(root.querySelector('.brief-citation'),null);
 }
});
test('unready snapshots never show an old analysis or invent an update time',()=>{
 for(const state of ['pending','failed','source_changed','withdrawn','insufficient']){
  const d=fixture();d.analysis_status=state;d.summary=null;
  d.analysis={overview:{en:'An invalidated conclusion.'}};d.analysis_generated_at=d.checked_at;
  const root=analysisPanel(d);
  assert.ok(!root.textContent.includes('An invalidated conclusion'));
  assert.equal(root.querySelector('.evidence-analysis-time'),null);
  assert.equal(root.querySelector('summary'),null);
  assert.ok(root.querySelector('[role=status]').textContent.length>10);
 }
 const d=fixture();d.analysis_status='pending';
 assert.match(analysisPanel(d).textContent,/Orders remain unconfirmed/);
 d.analysis_status='source_changed';assert.ok(!analysisPanel(d).textContent.includes('Orders remain unconfirmed'));
});
test('reopening the selected ticker reads its latest snapshot instead of doing nothing',async()=>{
 store.set('me',{tier:'pro'});let calls=0;
 globalThis.fetch=async()=>{
  const d=fixture();calls++;
  if(calls===2){d.analysis_status='ready';d.analysis={overview:{en:'New saved analysis.',citations:['n1']},sections:[]};}
  return response(d);
 };
 const root=document.createElement('div');document.body.append(root);
 const cleanup=await mount(root,{ticker:'AVGO'});
 root.querySelector('.evidence-switch-stock').click();
 document.querySelector('.evidence-picker-form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(calls,2);assert.match(root.querySelector('.evidence-analysis').textContent,/New saved analysis/);
 cleanup();root.remove();
});
test('mobile picker reopens the current ticker with a fresh read and closes the dialog',async()=>{
 store.set('me',{tier:'pro'});store.set('watchlist',['AVGO']);location.hash='#/evidence/AVGO';
 let calls=0;globalThis.fetch=async(url,options)=>{
  assert.equal(url,'/evidence/AVGO');assert.equal(options.method,'GET');calls++;
  const d=fixture();if(calls===2)d.nodes[0].title.en='A newly saved observation.';return response(d);
 };
 const root=document.createElement('div');document.body.append(root);const cleanup=await mount(root,{ticker:'AVGO'});
 root.querySelector('.evidence-switch-stock').click();
 const form=document.querySelector('.evidence-picker-form');assert.ok(form);assert.equal(form.querySelector('input').value,'AVGO');
 form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(calls,2);assert.equal(location.hash,'#/evidence/AVGO');assert.equal(document.querySelector('.evidence-picker-form'),null);
 assert.match(root.querySelector('.evidence-branches').textContent,/A newly saved observation/);cleanup();root.remove();
});
test('six balanced nodes, exact source passage and progressive disclosure',()=>{
 const root=mapView(fixture());document.body.append(root);
 assert.equal(root.querySelectorAll('.evidence-node').length,6);
 assert.match(root.querySelector('.evidence-branches').textContent,/Point 9/);
 assert.equal(root.querySelector('.evidence-coverage').open,false);
 root.querySelector('.brief-citation').click();
 assert.match(document.querySelector('.modal-body').textContent,/Counter Author/);
 assert.match(document.querySelector('.modal-body').textContent,/1:10–1:30/);
 assert.match(document.querySelector('.modal-body').textContent,/conditional/);
 closeModal();root.remove();
});
test('no opinion search; stance filters and one expansion retain every viewpoint',()=>{
 const root=mapView(fixture());document.body.append(root);
 assert.equal(root.querySelector('input'),null);
 root.querySelector('.evidence-filters .is-counter').click();
 assert.equal(root.querySelectorAll('.evidence-node').length,1);
 assert.match(root.querySelector('.evidence-node').textContent,/Point 9/);
 root.querySelector('.evidence-reset-filter').click();
 root.querySelector('.evidence-map-footer button').click();
 assert.equal(root.querySelectorAll('.evidence-node').length,10);
 assert.equal(root.querySelector('.evidence-map-footer button').hidden,true);root.dispose();root.remove();
});
test('untrusted captions stay text and unsafe source links are rejected',()=>{
 const d=fixture();d.nodes[9].title.en='<img src=x onerror=alert(1)>';d.nodes[9].evidence[0].source_url='javascript:alert(1)';
 const root=mapView(d);document.body.append(root);root.querySelector('.brief-citation').click();
 assert.equal(document.querySelectorAll('img,a[href^="javascript:"]').length,0);
 assert.match(document.querySelector('.modal-box').textContent,/<img/);closeModal();root.remove();
});
test('free users read their selections without fetching an unselected map',async()=>{
 store.set('me',{tier:'free'});let calls=[];globalThis.fetch=async url=>{calls.push(String(url));return response(fixture());};
 const root=document.createElement('div');const cleanup=await mount(root,{ticker:'AVGO'});
 assert.deepEqual(calls,['/me/evidence']);assert.ok(root.querySelector('a[href="#/billing"]'));assert.equal(root.querySelectorAll('.evidence-node').length,0);cleanup();
});
test('direct route uses shared API, logout removes data and old responses cannot return',async()=>{
 store.set('me',{tier:'pro'});let resolve;globalThis.fetch=()=>new Promise(r=>resolve=r);
 const root=document.createElement('div');const task=mount(root,{ticker:'AVGO'});
 store.bumpEpoch();store.set('me',null);resolve(response(fixture()));
 const cleanup=await task;assert.equal(root.querySelectorAll('.evidence-node').length,0);cleanup();
});
test('evidence deep links survive sign-in without arbitrary query data',()=>{
 assert.equal(safeTarget('#/evidence/avgo?token=secret'),'#/evidence/AVGO');
 assert.equal(safeTarget('#/evidence'),'#/evidence');
});

test('measured connectors follow the displayed cards and release their resize observer',()=>{
 const previous=globalThis.ResizeObserver;let callback,disconnected=0,observed=[];
 globalThis.ResizeObserver=class{constructor(fn){callback=fn;}observe(n){observed.push(n);}disconnect(){disconnected++;observed=[];}};
 const map=document.createElement('div'),center=document.createElement('div'),branches=document.createElement('div');
 map.append(center,branches);document.body.append(map);map.style.setProperty('--evidence-layout','radial');
 const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
 map.getBoundingClientRect=()=>rect(10,20,900,400);center.getBoundingClientRect=()=>rect(385,145,150,150);
 for(const [tone,left]of [['support',30],['counter',590]]){
  const card=document.createElement('button');card.className='evidence-node is-'+tone;card.getBoundingClientRect=()=>rect(left,50,300,120);branches.append(card);
 }
 const connections=connectMap(map,center,branches);connections.refresh();
 assert.equal(observed.length,4);assert.equal(map.querySelectorAll('.evidence-wire').length,2);
 assert.match(map.querySelector('.evidence-wire.is-support').getAttribute('d'),/320 90$/);
 assert.match(map.querySelector('.evidence-wire.is-counter').getAttribute('d'),/580 90$/);
 assert.equal(map.querySelector('svg').getAttribute('aria-hidden'),'true');
 branches.lastChild.remove();callback();assert.equal(map.querySelectorAll('.evidence-wire').length,1);
 map.style.setProperty('--evidence-layout','tree');callback();assert.equal(map.querySelectorAll('.evidence-trunk').length,1);
 connections.dispose();assert.equal(observed.length,0);assert.ok(disconnected>=2);assert.equal(map.querySelectorAll('svg path').length,0);
 map.remove();globalThis.ResizeObserver=previous;
});
test('point numbers keep matching summary citations after filtering',()=>{
 const root=mapView(fixture());document.body.append(root);
 const before=root.querySelector('.evidence-node.is-counter .evidence-node-number').textContent;
 root.querySelector('.evidence-filters .is-counter').click();
 assert.equal(root.querySelector('.evidence-node-number').textContent,before);
 root.querySelector('.evidence-node').click();assert.match(document.querySelector('.modal-body').textContent,/Counter Author/);
 closeModal();root.dispose();root.remove();
});

test('source dialogs omit a repeated explanation while retaining author and dates',()=>{
 const d=fixture();d.nodes[9].reason={en:'The order still needs confirmation.'};d.nodes[9].evidence[0].reason={en:'The order still needs confirmation.'};
 const root=mapView(d);document.body.append(root);root.querySelector('.brief-citation').click();
 const body=document.querySelector('.modal-body').textContent;
 assert.equal(body.split('The order still needs confirmation.').length-1,1);assert.match(body,/Counter Author/);assert.match(body,/2026-09-04/);assert.match(body,/1:10–1:30/);
 closeModal();root.dispose();root.remove();
});

test('one shared set of points forms support, opposition and context branches',()=>{
 const root=mapView(fixture());document.body.append(root);
 assert.equal(root.querySelectorAll('.evidence-group').length,3);
 assert.equal(root.querySelector('.evidence-group.is-counter .evidence-node strong').textContent,'Point 9');
 assert.equal(root.querySelector('.evidence-group.is-support .evidence-group-count').textContent,'5');
 assert.equal(root.querySelector('.evidence-group.is-context .evidence-group-count').textContent,'4');
 assert.equal(root.querySelector('.evidence-group.is-counter .evidence-node-mobile-meta .evidence-condition').textContent,'Conditional');
 [...root.querySelectorAll('button')].find(b=>b.textContent==='Show all viewpoints').click();
 const numbers=[...root.querySelectorAll('.evidence-node-number')].map(n=>n.textContent);
 assert.equal(numbers.length,10);assert.equal(new Set(numbers).size,10);root.dispose();root.remove();
});
test('phone stock picker and stance filters reuse the loaded graph without watchlist writes',async()=>{
 store.set('me',{tier:'pro'});store.set('watchlist',['AVGO','ORCL']);let calls=[];
 globalThis.fetch=async url=>{calls.push(String(url));return response(fixture());};
 const root=document.createElement('div');document.body.append(root);const cleanup=await mount(root,{ticker:'AVGO'});
 const before=calls.length;root.querySelector('.evidence-stock-trigger').focus();root.querySelector('.evidence-stock-trigger').click();
 assert.equal(document.querySelectorAll('.evidence-picker-list a').length,2);
 assert.equal(document.querySelector('.evidence-picker-form input').value,'AVGO');closeModal();
 assert.equal(document.activeElement,root.querySelector('.evidence-stock-trigger'));
 assert.equal(root.querySelector('.evidence-search-toggle'),null);
 root.querySelector('.evidence-filters .is-counter').click();
 assert.equal(root.querySelectorAll('.evidence-node').length,1);assert.equal(root.querySelector('.evidence-reset-filter').hidden,false);
 root.querySelector('.evidence-reset-filter').click();assert.equal(root.querySelectorAll('.evidence-node').length,6);assert.equal(root.querySelector('.evidence-reset-filter').hidden,true);
 assert.deepEqual(store.get('watchlist'),['AVGO','ORCL']);assert.equal(calls.length,before);cleanup();root.remove();
});

test('untranslated source entries show original text without inventing a translation',()=>{
 const doc=fixture();doc.nodes[0].title={zh:'公司事件原文',en:'Company event source'};
 doc.nodes[0].original_title={zh:'原始公告内容'};doc.nodes[0].evidence[0].original_title={zh:'原始公告内容'};
 const root=mapView(doc);document.body.append(root);
 assert.equal(root.querySelector('.evidence-original-title').textContent,'原始公告内容');
 root.querySelector('.evidence-node.is-support').click();
 assert.match(document.querySelector('.modal-body').textContent,/Original source text · Translation unavailable/);
 assert.match(document.querySelector('.modal-body').textContent,/原始公告内容/);
 closeModal();root.dispose();root.remove();
});

test('platform identity uses source domains and structured metadata, never author names or stance',async()=>{
 const {sourceIdentity,nodeSourceIdentity}=await import('../public/js/app/evidence-source.js');
 for(const url of ['https://www.youtube.com/watch?v=abc','https://youtu.be/abc','https://www.youtube-nocookie.com/embed/abc'])assert.equal(sourceIdentity({source_url:url}),'youtube');
 for(const url of ['https://youtube.com.evil.test/watch','https://evil.test/?url=youtube.com','javascript:alert(1)','https://youtube.com@evil.test/'])assert.notEqual(sourceIdentity({source_url:url,platform:'youtube'}),'youtube');
 assert.equal(sourceIdentity({source_url:'https://x.com/author/status/123'}),'x');
 assert.equal(sourceIdentity({source_url:'https://twitter.com/author/status/123'}),'x');
 assert.equal(sourceIdentity({kind:'creator',author:'YouTube Analyst'}),'creator');
 assert.equal(sourceIdentity({kind:'creator',platform:'youtube'}),'youtube');
 assert.equal(sourceIdentity({kind:'fact',topic:'macro_background'}),'macro');
 assert.equal(sourceIdentity({kind:'fact',topic:'technicals'}),'data');
 assert.equal(sourceIdentity({source_url:'https://www.sec.gov/Archives/doc.htm'}),'filing');
 assert.equal(nodeSourceIdentity({evidence:[{source_url:'https://youtu.be/a'},{source_url:'https://x.com/a/status/1'}]}),'mixed');
});

test('source branding preserves viewpoint, exact links, counts and source-dialog attribution',()=>{
 const doc=fixture();doc.summary=null;
 doc.nodes=doc.nodes.slice(0,4).map((node,i)=>({...node,stance:['support','counter','context','context'][i],evidence:[{...node.evidence[0],source_url:['https://youtu.be/a','https://x.com/a/status/1','https://fred.stlouisfed.org/series/CPIAUCSL','https://example.com/data'][i],kind:i===2?'fact':'creator',topic:i===2?'macro_background':undefined}]}));
 const original=JSON.stringify(doc),root=mapView(doc);document.body.append(root);
 for(const [identity,stance]of [['youtube','support'],['x','counter'],['macro','context']]){
  const card=root.querySelector('.evidence-node.source-'+identity);assert.ok(card.classList.contains('is-'+stance));
  assert.equal(card.querySelector('.evidence-category').textContent,copy['app.evidence.'+stance]);
  assert.equal(card.querySelector('.evidence-source-badge').textContent,copy['app.evidence.source_'+identity]);
  assert.equal(card.querySelector('.evidence-source-watermark').getAttribute('aria-hidden'),'true');
 }
 assert.equal(root.querySelectorAll('.evidence-node').length,4);
 root.querySelector('.evidence-node.source-youtube').click();
 assert.equal(document.querySelector('.evidence-source>.evidence-source-badge').textContent,'YouTube');
 assert.equal(document.querySelector('.evidence-source a[target="_blank"]').href,'https://youtu.be/a');
 assert.equal(JSON.stringify(doc),original);closeModal();root.dispose();root.remove();
});

test('all fifty watched stocks remain reachable through the visible selector without searching',async()=>{
 const stocks=Array.from({length:50},(_,i)=>'T'+String(i).padStart(2,'0'));
 store.set('me',{tier:'pro'});store.set('watchlist',stocks);let requests=0;
 globalThis.fetch=async()=>{requests++;return response({...fixture(),ticker:'T49'});};
 const root=document.createElement('div');document.body.append(root);const cleanup=await mount(root,{ticker:'T49'});
 assert.ok(root.querySelector('.evidence-watchlist a[href="#/evidence/T49"]'));
 assert.ok(root.querySelector('.evidence-all-stocks').textContent.includes('50'));
 const trigger=root.querySelector('.evidence-switch-stock');trigger.focus();trigger.click();
 assert.equal(document.querySelectorAll('.evidence-picker-list a').length,50);
 assert.equal(document.querySelector('.evidence-picker-list a[href="#/evidence/T49"]').getAttribute('aria-current'),'page');
 assert.equal(requests,1);closeModal();assert.equal(document.activeElement,trigger);
 trigger.click();const target=document.querySelector('.evidence-picker-list a[href="#/evidence/T48"]');target.click();
 assert.equal(document.querySelector('.modal-body'),null);assert.equal(requests,1);
 cleanup();root.remove();
});

test('syncing the account selection on mount does not fetch the same map twice',async()=>{
 store.set('me',{tier:'free',experience:{evidence:{selected:[],cap:3}}});const calls=[];
 globalThis.fetch=async url=>{calls.push(String(url));return response(String(url)==='/me/evidence'?{selected:['AVGO']}:fixture());};
 const root=document.createElement('div');document.body.append(root);const cleanup=await mount(root,{ticker:'AVGO'});
 assert.deepEqual(calls,['/me/evidence','/evidence/AVGO']);
 assert.deepEqual(store.get('me').experience.evidence.selected,['AVGO']);
 cleanup();root.remove();
});
