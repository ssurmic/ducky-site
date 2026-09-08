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
 const old={id:1,kol_id:'talk',kol_name:'Talk',platform_post_id:'abcdefghijk',title:'Old source',summary:{...ready,quality:'grounded'},
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
 const dispose=await mount(root,{query:new URLSearchParams('scope=discover&creator=talk&post=abcdefghijk&point=claim:abc')});await tick();
 assert.ok(calls.includes('/kol/talk/posts/abcdefghijk'));
 assert.equal(root.querySelectorAll('.cr-post').length,1);
 assert.ok(root.querySelector('.cr-sections').open);
 const focused=root.querySelector('[data-point-id="claim:abc"]');
 assert.ok(focused.closest('.cr-sections'),'exact graph point is inside the single interpretation');
 assert.equal(root.querySelectorAll('.cr-post > .creator-reviewed-spans').length,0);
 assert.ok(focused.querySelector('.cr-take.cr-bull'));
 assert.ok(!root.querySelector('.cr-post').textContent.includes('Obsolete duplicated AVGO card'));
 assert.ok(!root.querySelector('.cr-post').textContent.includes('Verified source spans'));
 assert.equal(focused.querySelector('a').href,'https://www.youtube.com/watch?v=abcdefghijk&t=634');
 assert.equal(focused.dataset.scrolled,'true');assert.ok(focused.querySelector('details').open);
 assert.match(focused.textContent,/Customer concentration is falling/);
 root.querySelector('[data-creator-scope="following"]').click();await tick();
 assert.ok(!root.querySelector('.is-focused-source'));
 assert.match(root.querySelector('.cr-feed').textContent,/Recent post/);
 assert.ok(!location.hash.includes('post='));
 dispose();root.remove();
});
