import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<html lang="en" data-lang="en"><body><main></main><div id="modal" hidden></div><div id="toasts"></div></body></html>',{url:'https://ducky.test/en/app/#/creators'});
for(const key of ['window','document','Node','location','history','localStorage'])globalThis[key]=dom.window[key];
globalThis.requestAnimationFrame=fn=>fn();dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
const media={matches:true,listener:null,addEventListener(name,callback){this.listener=callback;},removeEventListener(){this.listener=null;}};
window.matchMedia=()=>media;
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const store=await import('../public/js/app/store.js');
const {mount}=await import('../public/js/app/views/creators.js');
const {closeModal}=await import('../public/js/app/ui.js');
const settle=async()=>{for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));};
const summary={quality:'no_call',en:'A reviewed company discussion.',zh:'经过审核的公司讨论。',source:{kind:'transcript',status:'ready',summary_reviewed:true}};
const post=(id,date,changes={},author='alpha')=>({id,kol_id:author,kol_name:author,platform_post_id:id,title:'Source '+id,platform:'youtube',
  url:'https://www.youtube.com/watch?v='+id,published_at:date,first_seen_at:date,tickers:['MU'],summary,calls:[],
  reviewed_spans:[{creator_id:author,post_id:id,point_id:'point:'+id,ticker:'MU',basis:'attributed_opinion',intent:'opinion',stance:'support',
    title:{en:'Margins depend on contract pricing.',zh:'利润率取决于合约价格。'},condition_text:'Prices must hold.',horizon_text:'Next quarter',conditional:true,
    reason:{en:'Product mix.',zh:'产品组合。'},source_url:'https://www.youtube.com/watch?v='+id,source_hash:'hash:'+id,
    published_at:date,observed_at:date,start_seconds:60,end_seconds:90,evidence:'The exact excerpt from '+id,...changes}]});

test('following overview exposes different authors before expansion, retains repeated receipts and changed/opposed views',async()=>{
  store.bumpEpoch();store.set('me',{tier:'pro',user_id:700});store.set('token','synthetic-only');
  history.replaceState(null,'','#/creators');
  const items=[post('latest','2026-09-25T10:00:00Z'),post('earlier','2026-09-22T10:00:00Z'),
    post('risk','2026-09-24T10:00:00Z',{stance:'counter'}),post('condition','2026-09-23T10:00:00Z',{condition_text:'Prices must rise.'}),
    post('second','2026-09-24T09:00:00Z',{},'beta')];
  const requests=[];
  globalThis.fetch=async(url,options)=>{requests.push([url,options.method]);
    if(url==='/kol/feed')return Response.json({kols:[{id:'alpha',name:'Alpha'},{id:'beta',name:'Beta'}],posts:items,pages:{}});
    if(url==='/me/kols')return Response.json({subs:['alpha','beta'],analysis:{}});
    if(url==='/watchlist')return Response.json({items:[]});
    if(String(url).startsWith('/kol/discover'))return Response.json({status:'ready',items:[]});
    if(url==='/kol/alpha/page')return Response.json({kol_id:'alpha',coverage:{}});
    assert.fail(url);
  };
  const root=document.querySelector('main');root.replaceChildren();const dispose=await mount(root);await settle();
  const groups=[...root.querySelectorAll('.creators-ux-main-grid>.creator-views-group')];
  assert.equal(groups.length,2);
  assert.equal(groups[0].querySelector(':scope>ol').children.length,1,'one main view precedes other authors');
  assert.equal(groups[1].querySelector(':scope>ol').children.length,1);
  assert.equal(groups[0].querySelectorAll('.creator-view-row').length,3,'same text with changed condition or direction stays separate');
  assert.ok(groups[0].querySelector('.creator-view-row.is-bull'));
  assert.ok(groups[0].querySelector('.creator-view-row.is-bear'));
  assert.match(groups[0].textContent,/Prices must rise/);
  assert.equal(groups[0].querySelector('.creator-view-takes a').getAttribute('href'),'#/stock/MU?from=creators');
  const receipts=groups[0].querySelector('.creators-ux-repeated');assert.ok(receipts);
  assert.deepEqual([...receipts.querySelectorAll('[data-post]')].map(node=>node.dataset.post),['latest','earlier']);
  assert.equal(receipts.querySelectorAll('time').length,2);
  receipts.querySelector('[data-post="earlier"]').click();
  assert.match(document.querySelector('#modal').textContent,/2026-09-22/);
  assert.match(document.querySelector('#modal').textContent,/The exact excerpt from earlier/);
  assert.ok(document.querySelector('#modal [data-point-id="point:earlier"].is-focused'));
  assert.equal(document.querySelector('#modal a.cr-orig').href,'https://www.youtube.com/watch?v=earlier&t=60');
  closeModal();
  groups[0].querySelector('.creator-name').click();await settle();
  assert.equal(root.querySelector('.creators-ux-author-views .creator-view-list').children.length,3);
  assert.equal(root.querySelector('.creator-video-archive').open,false,'full videos stay available below main views');
  assert.equal(root.querySelectorAll('.creator-video-archive .cr-post').length,4,'all dated videos remain in the archive');
  assert.ok(requests.every(([,method])=>method==='GET'));
  dispose();root.replaceChildren();closeModal();
});

test('a new user reads source-backed discovery without following; mobile filters reopen on desktop and clean up',async()=>{
  store.bumpEpoch();store.set('me',{tier:'pro',user_id:701});history.replaceState(null,'','#/creators');media.matches=true;
  const v=post('discovery','2026-09-25T10:00:00Z').reviewed_spans[0];
  const requests=[];
  globalThis.fetch=async(url,options)=>{requests.push([url,options.method]);
    if(url==='/kol/feed')return Response.json({kols:[],posts:[],pages:{}});
    if(url==='/me/kols')return Response.json({subs:[],analysis:{}});
    if(url==='/watchlist')return Response.json({items:[]});
    if(String(url).startsWith('/kol/discover'))return Response.json({status:'ready',items:[{status:'available',creator:{id:'alpha',name:'Alpha'},latest_view:{...v,text:v.title}}]});
    assert.fail(url);
  };
  const root=document.querySelector('main');const dispose=await mount(root);await settle();
  assert.ok(root.querySelector('.creator-discovery-preview').textContent.includes('Margins depend on contract pricing.'));
  assert.ok(root.querySelector('.creator-discovery-qualifications').textContent.includes('Prices must hold.'));
  assert.equal(root.querySelector('.creators-ux-filters').open,false);
  media.matches=false;media.listener();assert.equal(root.querySelector('.creators-ux-filters').open,true);
  assert.match(root.querySelector('.creator-discovery-links a').getAttribute('href'),/creator=alpha&post=discovery&point=point%3Adiscovery/);
  assert.ok(requests.every(([,method])=>method==='GET'));
  dispose();assert.equal(media.listener,null);root.replaceChildren();
});
