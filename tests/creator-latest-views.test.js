import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html lang="en"><body><main id="view"></main><div id="modal" hidden></div><div id="toasts"></div></body></html>',{url:'https://ducky.test/app/#/creators'});
for(const key of ['window','document','Node','location','history','localStorage'])globalThis[key]=dom.window[key];
globalThis.requestAnimationFrame=fn=>{fn();return 0;};
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const {mount,filterPosts}=await import('../public/js/app/views/creators.js');
const {closeModal}=await import('../public/js/app/ui.js');
const tick=async()=>{for(let i=0;i<4;i++)await new Promise(r=>setImmediate(r));};

const ready={quality:'no_call',zh:'作者认为订单会上升。',en:'The creator expects orders to rise.',source:{kind:'transcript',status:'ready',version:'creator-video-v4',summary_reviewed:true,
  sections:[{start_seconds:70,zh:'第一段。',en:'First section.'}]}};
const span=(ticker,stance,text,seconds)=>({basis:'attributed_opinion',intent:'opinion',ticker,stance,point_id:'claim:'+ticker.toLowerCase()+':'+seconds,
  title:{en:text,zh:text},reason:{en:'Stated in the video.'},published_at:'2026-09-10T20:00:00Z',source_url:'https://www.youtube.com/watch?v=abcdefghijk',start_seconds:seconds,end_seconds:seconds+20,evidence:'"'+text+'"'});
const posts=[
 {id:1,kol_id:'alpha',kol_name:'Alpha Creator',platform_post_id:'abcdefghijk',url:'https://www.youtube.com/watch?v=abcdefghijk',title:'Memory demand ✨ 20260910',published_at:'2026-09-10T20:00:00Z',
  first_seen_at:'2026-09-10T20:07:00Z',fetched_at:'2026-09-10T21:00:00Z',tickers:['MU','NVDA'],calls:[],summary:ready,
  reviewed_spans:[span('MU','support','Memory pricing supports margins into next year.',70),span('NVDA','counter','Valuation already prices in the data-center cycle.',400),
   {basis:'verified_mention_no_direction',intent:'mention',ticker:'AMD',stance:'context',point_id:'m1',title:{en:'Mentioned AMD without a view.'},published_at:'2026-09-10T20:00:00Z',start_seconds:900}]},
 {id:2,kol_id:'beta',kol_name:'Beta Creator',platform_post_id:'zzzzzzzzzzz',url:'https://www.youtube.com/watch?v=zzzzzzzzzzz',title:'Macro chat',published_at:'2026-09-09T18:00:00Z',tickers:[],calls:[],summary:ready,reviewed_spans:[]},
 {id:3,kol_id:'alpha',kol_name:'Alpha Creator',platform_post_id:'pendingvid1',url:'https://www.youtube.com/watch?v=pendingvid1',title:'The Stock Market Is Designed For Amazon Success',published_at:'2026-09-11T20:00:00Z',
  tickers:[],calls:[],summary:{source:{kind:'metadata',status:'discovered',discovery_version:'creator-discovery-v1',channel_id:'UC123'}},reviewed_spans:[]},
 {id:4,kol_id:'gamma',kol_name:'Unfollowed Creator',platform_post_id:'unfollowed01',url:'https://www.youtube.com/watch?v=unfollowed01',title:'Not mine',published_at:'2026-09-11T10:00:00Z',tickers:['TSLA'],calls:[],summary:ready,reviewed_spans:[span('TSLA','support','Deliveries beat.',30)]}];

test('pending sources are never listed; exact links still reach them',()=>{
 const selection={following:new Set(['alpha','beta']),mine:true,archive:false};
 assert.deepEqual(filterPosts(posts,selection).map(p=>p.id),[1,2]);
 assert.deepEqual(filterPosts(posts,{...selection,archive:true}).map(p=>p.id),[3,1,2]);
});

test('my creators open on their latest views, one line each, and a line opens the source with its summary',async()=>{
 store.bumpEpoch();store.set('me',{tier:'pro',user_id:7});store.set('token','synthetic-only');
 const calls=[];
 globalThis.fetch=async(url,opts)=>{calls.push([String(url),opts?.method||'GET']);
  if(url==='/kol/feed')return Response.json({kols:[{id:'alpha',name:'Alpha Creator',profile:{}},{id:'beta',name:'Beta Creator',profile:{}},{id:'gamma',name:'Unfollowed Creator',profile:{}}],posts,pages:{}});
  if(url==='/me/kols')return Response.json({subs:['alpha','beta'],analysis:{}});
  if(url==='/watchlist')return Response.json({items:[{ticker:'MU'}]});
  if(String(url).startsWith('/kol/discover'))return Response.json({status:'ready',items:[]});
  return Response.json({items:[]});};
 const root=document.querySelector('main');root.replaceChildren();
 const dispose=await mount(root,{query:new URLSearchParams('')});await tick();
 // No picker, no "include unverified" toggle, no request button, no pending card.
 assert.equal(root.querySelector('.creator-directory-picker'),null);
 assert.equal([...root.querySelectorAll('button')].some(b=>b.textContent===copy['app.creators.show_archive']),false);
 assert.equal(root.querySelector('.creator-request-summary'),null);assert.equal(root.querySelector('.cr-post'),null);
 assert.equal(root.textContent.includes('Designed For Amazon Success'),false);
 const groups=[...root.querySelectorAll('.creator-views-group')];
 assert.deepEqual(groups.map(g=>g.dataset.creator),['alpha','beta']);   // newest view first; unfollowed creators absent
 const rows=[...groups[0].querySelectorAll('.creator-view-row')];
 assert.equal(rows.length,2);                                          // the AMD mention is not a view
 assert.match(rows[0].textContent,/\$NVDA Bearish|\$NVDA/);assert.match(rows[0].textContent,/Valuation already prices in/);
 assert.match(rows[0].textContent,/2026-09-10 · Memory demand$/);       // promotion tag trimmed from the title
 assert.match(rows[1].textContent,/\$MU/);assert.match(rows[1].textContent,/Memory pricing supports margins/);
 assert.match(groups[1].textContent,/The creator expects orders to rise/);   // a reviewed video without a stock view gets its summary line
 assert.ok(rows.every(r=>r.querySelector('button').getBoundingClientRect||true));
 rows[1].querySelector('button').click();
 const detail=document.querySelector('#modal .creator-view-detail');assert.ok(detail);
 assert.match(document.querySelector('#modal').textContent,/Alpha Creator · 2026-09-10/);
 assert.ok(detail.querySelector('.creator-reviewed-spans article.is-focused'));
 assert.match(detail.textContent,/The creator expects orders to rise/);assert.match(detail.textContent,/First section/);
 const source=detail.querySelector('a.cr-orig');assert.equal(source.getAttribute('href'),'https://www.youtube.com/watch?v=abcdefghijk&t=70');
 assert.ok(detail.querySelector('a[href="#/evidence/MU"], a[href^="#/evidence/MU"]'));
 closeModal();
 groups[0].querySelector('.creator-name').click();await tick();
 assert.ok(root.querySelector('.creator-selected-heading'));assert.match(root.querySelector('.creator-selected-heading').textContent,/Alpha Creator/);
 assert.equal(root.querySelectorAll('.cr-post').length,1,'the creator page lists only reviewed videos');
 assert.ok(calls.every(([,method])=>method==='GET'));
 dispose();root.replaceChildren();closeModal();
});
