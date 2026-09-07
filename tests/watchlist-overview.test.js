import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const dom=new JSDOM('<html lang="en"><body><main id="view"></main></body></html>',{url:'https://ducky.test/app/#/watchlist'});
for(const k of ['window','document','Node','location','history','localStorage'])globalThis[k]=dom.window[k];
const copy=JSON.parse(readFileSync('i18n/en.json'));const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {treemap,weighted,changeClass,overviewView}=await import('../public/js/app/watchlist-overview.js');
const store=await import('../public/js/app/store.js');
const {mount}=await import('../public/js/app/views/watchlist.js');
const row=(ticker,cap,change=0)=>({ticker,company:ticker+' Company',market_cap:cap,market_cap_status:'ready',market_cap_currency:'USD',market_cap_as_of:'2026-09-07T00:00:00Z',price:100,price_status:'ready',change_pct:change});

test('treemap has exact market-cap areas without overlaps at 50 symbols',()=>{
 const rows=Array.from({length:50},(_,i)=>row('T'+i,10**(i/10)));
 const tiles=treemap(rows);const total=rows.reduce((n,r)=>n+r.market_cap,0);
 assert.equal(tiles.length,50);
 for(const a of tiles){assert.ok(Math.abs(a.w*a.h/600000-a.market_cap/total)<1e-10);assert.ok(a.x>=0 && a.y>=0 && a.x+a.w<=1000.00001 && a.y+a.h<=600.00001);
  for(const b of tiles)if(a!==b)assert.ok(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)<1e-8 || Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)<1e-8);
 }
 assert.equal(treemap([row('BAD',NaN),{...row('ETF',10),security_type:'ETF'}]).length,0);
});

test('zero, missing, losses and unweighted stocks stay distinguishable and clickable',()=>{
 const rows=[row('FLAT',10,0),row('LOSS',20,-2),row('MISSING',5,null),{...row('ETF',20,1),security_type:'ETF'}, {...row('OLD',10),market_cap_status:'stale'}];
 let selected;const view=overviewView(rows,{view:'heatmap',onSelect:t=>selected=t,session:'2026-09-04'});
 assert.equal(view.querySelectorAll('.watch-tile').length,3);
 assert.ok(view.querySelector('.watch-tile.watch-flat'));assert.ok(view.querySelector('.watch-tile.watch-unknown'));assert.ok(view.querySelector('.watch-tile.watch-down'));
 view.querySelector('[data-open="ETF"]').click();assert.equal(selected,'ETF');
 assert.equal(changeClass(null),'unknown');assert.equal(changeClass(0),'flat');
 assert.equal(view.querySelectorAll('.watch-unweighted .watch-row').length,2);
});

test('large watchlist fetches no details until selection and pending quote keeps research accessible',async()=>{
 const items=Array.from({length:50},(_,i)=>row('T'+i,(50-i)*1e9,i-25));
 const requests=[];globalThis.fetch=async url=>{requests.push(String(url));return new Response(JSON.stringify(String(url)==='/watchlist'?{items,overview:{items,session:'2026-09-04',previous_session:'2026-09-03'}}:{snapshot:{ok:false}}),{headers:{'content-type':'application/json'}});};
 store.set('me',{tier:'pro',watch_cap:50});store.set('watchlist',[]);store.set('snapshots',{});
 const root=document.querySelector('main');const dispose=await mount(root);
 assert.deepEqual(requests,['/watchlist']);assert.equal(root.querySelectorAll('article.snap').length,0);
 root.querySelector('[data-open="T0"]').click();await new Promise(r=>setTimeout(r,0));
 assert.equal(requests.filter(x=>x.startsWith('/snapshot/')).length,1);
 assert.equal(root.querySelectorAll('article.snap').length,1);assert.ok(root.querySelector('.watch-detail a[href="#/research/T0"]'));
 root.querySelector('[data-open="T1"]').click();await new Promise(r=>setTimeout(r,0));assert.equal(root.querySelectorAll('article.snap').length,1);
 root.querySelector('[data-mode="heatmap"]').click();assert.equal(root.querySelectorAll('.watch-tile').length,50);
 root.querySelector('.watch-close').click();assert.equal(root.querySelectorAll('article.snap').length,0);
 const filter=root.querySelector('.watch-filter');filter.value='Company';filter.dispatchEvent(new window.Event('input'));assert.equal(root.querySelectorAll('.watch-tile').length,50);
 filter.value='T49';filter.dispatchEvent(new window.Event('input'));assert.equal(root.querySelectorAll('.watch-tile').length,1);
 dispose();root.replaceChildren();
});
