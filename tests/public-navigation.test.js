import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {mountPublicNav} from '../public/js/public-nav.js';
import {mountTour} from '../public/js/desk.js';
import {mountHomepage} from '../public/js/homepage.js';
import {safeTarget,signedInTarget} from '../public/js/app/login-target.js';

const catalog=JSON.parse(readFileSync('product-navigation.json'));
const routes=catalog.public_groups.flatMap(group=>group.routes);
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function fixture({lang='zh',phone=false,query=''}={}){
 const dom=new JSDOM(readFileSync(`dist/${lang==='en'?'en/':''}index.html`,'utf8'),{url:`https://duckybot.app/${lang==='en'?'en/':''}${query}`,pretendToBeVisual:true});
 const w=dom.window,doc=w.document,media=new w.EventTarget();media.matches=phone;
 w.matchMedia=q=>q.includes('700px')?media:{matches:q.includes('reduced'),addEventListener(){},removeEventListener(){}};
 const scrolled=[];w.HTMLElement.prototype.scrollIntoView=function(){scrolled.push(this.id);};
 w.scrollTo=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.fetch=()=>{throw Error('Public navigation must not fetch account or research data');};
 const cleanup=[mountPublicNav(doc),mountTour(doc.querySelector('[data-product-tour]'))];
 return {w,doc,media,scrolled,menu:doc.querySelector('[data-public-menu]'),cleanup:()=>{cleanup.reverse().forEach(fn=>fn());w.close();},add:fn=>cleanup.push(fn)};
}
for(const lang of ['zh','en']){
 test(`all public tools have one preview, clear access and a safe post-sign-in destination: ${lang}`,()=>{
  const f=fixture({lang});assert.equal(new Set(routes).size,14);
  const links=[...f.doc.querySelectorAll('[data-feature-link]')];assert.equal(links.length,routes.length);
  assert.equal(f.doc.querySelectorAll('.public-top-link[href*="track-record"]').length,0);
  assert.ok(f.doc.querySelector('.public-menu-footer a[href*="track-record"]'));
  for(const route of routes){
   const link=links.find(a=>a.dataset.featureLink===route),panel=f.doc.getElementById(link.hash.slice(1));
   assert.ok(panel,route);assert.ok(panel.querySelector('.desk-feature-access').textContent.trim());
   assert.ok(panel.querySelector('.feature-access-'+catalog.catalog[route].access));
   const target=panel.querySelector('.desk-feature-actions .btn').hash;
   assert.equal(safeTarget(target),target);
   assert.equal(signedInTarget({email_verified:true,profile_complete:true},target),target);
   assert.ok(signedInTarget({email_verified:false},target).includes(encodeURIComponent(route)));
   link.click();assert.equal(f.doc.querySelectorAll('.desk-feature:not([hidden])').length,1);
   assert.equal(panel.hidden,false);assert.equal(f.doc.activeElement,panel);assert.equal(f.scrolled.at(-1),panel.id);
  }
  f.cleanup();
 });
 test(`feature deep links open hidden panels, preserve theme and work repeatedly and after Back: ${lang}`,async()=>{
  const f=fixture({lang,query:'?design=brief&theme=dark#desk-feature-calendar'});
  assert.equal(f.doc.getElementById('desk-feature-calendar').hidden,false);
  const creator=f.doc.querySelector('[data-feature-link=creators]');
  creator.click();assert.equal(f.w.location.search,'?design=brief&theme=dark');
  assert.equal(f.w.location.hash,'#desk-feature-creators');
  creator.click();assert.equal(f.scrolled.at(-1),'desk-feature-creators');
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('Back navigation did not complete')),2000);
   f.w.addEventListener('popstate',()=>{clearTimeout(timer);resolve();},{once:true});
   f.w.history.back();
  });
  assert.equal(f.w.location.hash,'#desk-feature-calendar');assert.equal(f.doc.getElementById('desk-feature-calendar').hidden,false);
  assert.equal(f.doc.querySelectorAll('.desk-feature:not([hidden])').length,1);
  f.cleanup();
 });
}

test('mobile groups disclose one at a time; Escape, outside click, focus and resizing cleanly dismiss the menu',async()=>{
 const f=fixture({phone:true}),trigger=f.menu.querySelector('summary'),groups=[...f.menu.querySelectorAll('.public-tool-group')];
 assert.ok(groups.every(g=>!g.open));trigger.click();await tick();
 assert.equal(f.menu.open,true);assert.ok(f.doc.documentElement.classList.contains('public-menu-open'));
 groups[0].querySelector('summary').click();assert.equal(groups[0].open,true);
 groups[2].querySelector('summary').click();assert.equal(groups[0].open,false);assert.equal(groups[2].open,true);
 f.doc.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
 assert.equal(f.menu.open,false);assert.equal(f.doc.activeElement,trigger);assert.ok(!f.doc.documentElement.classList.contains('public-menu-open'));
 trigger.click();f.doc.body.dispatchEvent(new f.w.Event('pointerdown',{bubbles:true}));assert.equal(f.menu.open,false);
 trigger.click();f.doc.querySelector('.public-start').focus();assert.equal(f.menu.open,false);
 trigger.click();f.media.matches=false;f.media.dispatchEvent(new f.w.Event('change'));
 assert.equal(f.menu.open,false);assert.ok(groups.every(g=>g.open&&g.querySelector('summary').tabIndex===-1));
 f.cleanup();
});

test('research launched from the menu opens a dialog and returns focus to its still-visible trigger',async()=>{
 const f=fixture({phone:true});f.add(mountHomepage(f.doc));
 const trigger=f.menu.querySelector('summary');trigger.click();await tick();
 const link=f.menu.querySelector('[data-home-open]');link.focus();link.click();
 assert.equal(f.menu.open,false);assert.equal(f.doc.querySelector('[data-home-dialog]').open,true);
 f.doc.querySelector('[data-home-close]').click();
 assert.equal(f.doc.querySelector('[data-home-dialog]').open,false);assert.equal(f.doc.activeElement,trigger);
 assert.equal(f.doc.querySelectorAll('#home-dossier').length,1);
 f.cleanup();
});

test('shared public navigation is present on secondary pages and does not enter the application shell',()=>{
 for(const prefix of ['','en/']){
  for(const route of ['track-record','privacy','disclaimer']){
   const doc=new JSDOM(readFileSync(`dist/${prefix}${route}/index.html`,'utf8')).window.document;
   assert.equal(doc.querySelectorAll('[data-feature-link]').length,14);
   assert.equal(doc.querySelector('.public-top-link').getAttribute('href'),`/${prefix}#desk-feature-creators`);
  }
  const app=new JSDOM(readFileSync(`dist/${prefix}app/index.html`,'utf8')).window.document;
  assert.equal(app.querySelector('.public-nav'),null);assert.equal(app.querySelector('script[src*="public-nav.js"]'),null);
 }
});
