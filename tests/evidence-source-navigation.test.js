import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html lang="en"><body></body></html>',{url:'https://ducky.test/app/#/creators'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
globalThis.requestAnimationFrame=fn=>fn();
dom.window.HTMLElement.prototype.scrollIntoView=function(){this.dataset.scrolled='true';};
const copy=JSON.parse(readFileSync('i18n/en.json')),strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {creatorRoute,creatorTarget,evidenceTarget}=await import('../public/js/app/creator-route.js');
const {safeTarget}=await import('../public/js/app/login-target.js');
const {mount}=await import('../public/js/app/views/creators.js');
const {filterPosts,hasGroundedCalls,hasReviewedSummary}=await import('../public/js/app/views/creators.js');
const store=await import('../public/js/app/store.js');
const tick=()=>new Promise(r=>setImmediate(r));

test('a discovered new upload is visible without being promoted to a reviewed opinion',()=>{
 const post={kol_id:'jin',summary:{quality:'unverified',source:{kind:'metadata',status:'discovered',discovery_version:'creator-discovery-v1',channel_id:'channel'}},tickers:[]};
 assert.equal(filterPosts([post],{following:new Set(['jin']),mine:true,archive:false}).length,1);
 assert.equal(hasGroundedCalls(post),false);assert.equal(hasReviewedSummary(post),false);
 assert.equal(filterPosts([{...post,summary:{quality:'unverified'}}],{following:new Set(['jin']),mine:true,archive:false}).length,0);
});

test('exact creator/post/point link survives sign-in without carrying private values',()=>{
 const href=evidenceTarget({creator_id:'talk',post_id:'abcdefghijk',point_id:'claim:abc'});
 assert.equal(href,'#/creators?scope=discover&creator=talk&post=abcdefghijk&point=claim%3Aabc');
 assert.equal(safeTarget(href+'&token=secret&cash=99'),href);
 assert.equal(evidenceTarget({creator_id:'../oops',post_id:'abcdefghijk'}),null);
 assert.equal(creatorTarget(creatorRoute(new URLSearchParams('creator=talk&post=../../x'))),'#/creators?creator=talk');
});

test('unfollowed old source loads by exact index, focuses expanded point, and scope navigation clears it',async()=>{
 store.set('me',{tier:'pro',user_id:1});const calls=[];
 const ready={quality:'no_call',en:'The creator discusses demand.',source:{kind:'transcript',status:'ready',summary_reviewed:true}};
 const recent={id:2,kol_id:'other',kol_name:'Other',platform_post_id:'recent',title:'Recent post',summary:ready,calls:[],tickers:['NVDA']};
 const old={id:1,kol_id:'talk',kol_name:'Talk',platform_post_id:'abcdefghijk',title:'Old source',summary:{...ready,quality:'unverified'},
  calls:[{sym:'AVGO',stance:'bear',evidence:'A legacy draft selected a different statement.',note:{en:'Obsolete duplicated AVGO card'}}],tickers:['AVGO'],
  reviewed_spans:[{basis:'attributed_opinion',intent:'opinion',stance:'support',ticker:'AVGO',point_id:'claim:abc',
   title:{en:'Customer concentration is falling'},evidence:'Broadcom is diversifying its customers.',source_url:'https://www.youtube.com/watch?v=abcdefghijk&t=634',start_seconds:634}]};
 globalThis.fetch=async(url,options)=>{
  assert.ok(!options?.method||options.method==='GET');calls.push(url);
  return Response.json(url==='/kol/feed'?{kols:[{id:'other',name:'Other'}],posts:[recent]}:
   url==='/kol/talk/posts/abcdefghijk'?{creator:{id:'talk',name:'Talk'},post:old}:
   url==='/me/kols'?{subs:['other'],analysis:{}}:{items:[]});
 };
 const root=document.createElement('main');document.body.append(root);
 let dispose=await mount(root,{query:new URLSearchParams('scope=discover&creator=talk&post=abcdefghijk&point=claim:abc')});await tick();
 try {
 assert.ok(calls.includes('/kol/talk/posts/abcdefghijk'));
 assert.ok(!calls.includes('/kol/feed'),'focused source does not wait for the recent catalogue');
 assert.equal(root.querySelectorAll('.cr-post').length,1);
 assert.ok(root.querySelector('.cr-sections').open);
 const focused=root.querySelector('[data-point-id="claim:abc"]');
 assert.ok(focused.closest('.cr-sections'),'exact graph point is inside the single interpretation');
 assert.equal(root.querySelectorAll('.cr-post > .creator-reviewed-spans').length,0);
 assert.ok(focused.querySelector('.cr-take.cr-bull'));
 assert.match(root.querySelector('.cr-post-head').textContent,/\$AVGO bull/i,'ticker sentiment survives without a full-video reviewed summary');
 assert.ok(!root.querySelector('.cr-post').textContent.includes('Obsolete duplicated AVGO card'));
 assert.ok(!root.querySelector('.cr-post').textContent.includes('Verified source spans'));
 assert.equal(focused.querySelector('a').href,'https://www.youtube.com/watch?v=abcdefghijk&t=634');
 assert.equal(focused.dataset.scrolled,'true');assert.ok(focused.querySelector('details').open);
 assert.match(focused.textContent,/Customer concentration is falling/);
 root.querySelector('[data-creator-scope="following"]').click();await tick();
 dispose();root.replaceChildren();
 dispose=await mount(root,{query:new URLSearchParams(location.hash.split('?')[1])});
 assert.ok(!root.querySelector('.is-focused-source'));
 assert.match(root.querySelector('.cr-feed').textContent,/Recent post/);
 assert.equal(calls.filter(path=>path==='/kol/feed').length,1);
 assert.ok(!location.hash.includes('post='));
 } finally {dispose();root.remove();}
});

test('a map link opens the canonical position statement instead of the same-stock legacy neutral call',async()=>{
 store.set('me',{tier:'pro',user_id:1});const point='claim:held-intc',postId='CEGiQA6CNd4';
 const post={id:3,kol_id:'talk',kol_name:'Talk',platform_post_id:postId,title:'Position update',tickers:['INTC','CRWD'],
  summary:{quality:'no_call',en:'A dated position update.',source:{kind:'transcript',status:'ready',summary_reviewed:true}},
  calls:[{sym:'INTC',stance:'neutral',evidence:'The original source reports continued holding.',note:{en:'OLD_NEUTRAL_DUPLICATE'}}],
  reviewed_spans:[
   {basis:'attributed_opinion',ticker:'CRWD',stance:'support',point_id:'claim:other',title:{en:'A different stock view'}},
   {basis:'self_reported_position_behavior',intent:'self_reported',action:'hold',source_stance:'neutral',
    ticker:'INTC',stance:'support',point_id:point,published_at:'2026-08-24',title:{en:'The creator says he continues to hold Intel.'},
    reason:{en:'This is the statement at publication; current ownership is not established.'},
    source_url:'https://www.youtube.com/watch?v='+postId+'&t=246s',start_seconds:246.63}]};
 globalThis.fetch=async(url,options)=>{
  assert.ok(!options?.method||options.method==='GET');
  return Response.json(url==='/kol/feed'?{kols:[],posts:[]}:
   url==='/kol/talk/posts/'+postId?{creator:{id:'talk',name:'Talk'},post}:
   url==='/me/kols'?{subs:[],analysis:{}}:{items:[]});
 };
 const root=document.createElement('main');document.body.append(root);
 const dispose=await mount(root,{query:new URLSearchParams({scope:'discover',creator:'talk',post:postId,point})});await tick();
 try{
  const focused=root.querySelector('[data-point-id="'+point+'"].is-focused.is-support');assert.ok(focused);
  assert.ok(focused.closest('.cr-sections').open);assert.equal(focused.dataset.scrolled,'true');
  assert.match(root.querySelector('.cr-post-head').textContent,/\$INTC\s+bull/i);
  assert.match(focused.textContent,/Self-reported action · Hold/);assert.match(focused.textContent,/Original outlook labelneutral/);
  assert.match(focused.textContent,/current ownership is not established/);
  assert.ok(!root.textContent.includes('OLD_NEUTRAL_DUPLICATE'));
  assert.equal(root.querySelectorAll('.creator-reviewed-spans article').length,2);
  assert.equal(focused.querySelector('a').href,post.reviewed_spans[1].source_url);
 }finally{dispose();root.remove();}
});
