import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {mountHomepage} from '../public/js/homepage.js';

function fixture(query='',lang='zh',reduced=false){
 const dom=new JSDOM(readFileSync(lang==='en'?'dist/en/index.html':'dist/index.html','utf8'),{url:'https://duckybot.app/'+(lang==='en'?'en/':'')+query,pretendToBeVisual:true,runScripts:'outside-only'});
 const {window:w}=dom,doc=w.document;
 const media=new w.EventTarget();media.matches=reduced;
 w.matchMedia=q=>q.includes('reduced')?media:{matches:true,addEventListener(){},removeEventListener(){}};
 w.HTMLElement.prototype.scrollIntoView=function(){};
 let requests=0;w.fetch=()=>{requests++;throw Error('Homepage examples must be static');};
 w.eval(readFileSync('public/js/lang.js','utf8'));
 const dispose=mountHomepage(doc);
 return {dom,w,doc,media,dispose,get requests(){return requests;}};
}

test('the public homepage works before JS with dated, attributed examples and the full loss-inclusive paths',()=>{
 const doc=new JSDOM(readFileSync('dist/index.html','utf8')).window.document;
 const cases=JSON.parse(readFileSync('public/media/ducky-demo-cases-2026-09-07.json','utf8')).cases;
 assert.equal(doc.querySelector('[data-home-review]').hidden,true);
 assert.equal(doc.querySelectorAll('.home-story:not([hidden])').length,1);
 for(const [key,window] of [['nok','first_20_after_announcement'],['glw','whole_path'],['hood','after_disclosure_20']]){
  const story=doc.querySelector('#home-story-'+key),data=cases[key][window];
  assert.equal(story.querySelector('time').dateTime,data.start);
  assert.equal(story.querySelector('polyline').getAttribute('points').split(' ').length,data.path.length);
  assert.equal(story.querySelector('.home-change').textContent.trim().split(' ')[0],(data.return_pct>=0?'+':'')+data.return_pct.toFixed(1)+'%');
  assert.equal(story.querySelector('.home-story-footer a').href,cases[key].source_url);
  assert.equal(story.querySelector('.home-change').classList.contains('is-negative'),data.return_pct<0);
 }
 assert.ok(doc.querySelector('.home-demo-note').textContent.includes('历史推送')||doc.querySelector('.home-demo-note').textContent.includes('当时的推送'));
 assert.equal(doc.querySelector('.home-cta a').getAttribute('href'),'/app/#/register');
});

test('stock tabs support keyboard order, one visible panel and independent evidence disclosure',()=>{
 const f=fixture(),tabs=[...f.doc.querySelectorAll('[data-home-stock]')];
 tabs[0].dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
 assert.equal(f.doc.activeElement,tabs[1]);assert.equal(tabs[1].getAttribute('aria-selected'),'true');
 assert.equal(f.doc.querySelectorAll('.home-story:not([hidden])').length,1);
 assert.equal(f.doc.querySelector('#home-story-glw').hidden,false);
 f.doc.querySelector('#home-story-glw summary').click();
 assert.equal(f.doc.querySelector('#home-story-glw details').open,true,'native disclosure must not be cancelled by a concept-switch handler on the root');
 tabs[1].dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'End',cancelable:true}));
 assert.equal(f.doc.activeElement,tabs[2]);assert.equal(f.doc.querySelector('#home-story-hood').hidden,false);
 tabs[2].dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'ArrowRight',cancelable:true}));
 assert.equal(f.doc.activeElement,tabs[0]);assert.equal(f.doc.querySelector('#home-story-nok details').open,false);
 assert.equal(f.requests,0);f.dispose();f.dom.window.close();
});

test('concept and theme links are shareable, translated and do not affect the default homepage',()=>{
 const f=fixture('?design=flow','en'),html=f.doc.documentElement;
 assert.equal(html.dataset.homeDesign,'flow');assert.equal(f.doc.querySelector('[data-home-review]').hidden,false);
 f.doc.querySelector('[data-home-design=brief]').click();
 assert.equal(html.dataset.homeDesign,'brief');assert.equal(html.dataset.theme,'light');
 assert.equal(f.doc.querySelector('[data-home-headline]').textContent,JSON.parse(f.doc.querySelector('[data-home-strings]').textContent)['brief.h1a']);
 assert.equal(new URL(f.doc.querySelector('[data-lang-toggle]').href).searchParams.get('design'),'brief');
 f.doc.querySelector('[data-home-theme]').click();assert.equal(html.dataset.theme,'dark');
 f.w.history.replaceState(null,'',f.w.location.href+'#home-dossier');f.w.dispatchEvent(new f.w.HashChangeEvent('hashchange'));
 assert.equal(new URL(f.doc.querySelector('[data-lang-toggle-footer]').href).searchParams.get('theme'),'dark');
 assert.equal(new URL(f.doc.querySelector('[data-lang-toggle]').href).hash,'#home-dossier');
 const sample=new f.w.MouseEvent('click',{bubbles:true,cancelable:true});
 assert.equal(f.doc.querySelector('.home-text-link').dispatchEvent(sample),true,'ordinary links keep their native action');
 assert.equal(html.hasAttribute('aria-current'),false);
 assert.equal(f.w.localStorage.length,0);assert.equal(f.requests,0);f.dispose();f.dom.window.close();
 const normal=fixture('?design=unexpected&theme=invalid');
 assert.equal(normal.doc.documentElement.dataset.homeDesign,'focus');assert.equal(normal.doc.documentElement.dataset.theme,undefined);
 assert.equal(normal.doc.querySelector('[data-home-review]').hidden,true);normal.dispose();normal.dom.window.close();
});

test('motion pauses on request and honors system reduced motion without offering an ineffective toggle',()=>{
 const f=fixture(),hero=f.doc.querySelector('[data-home-hero]'),pause=f.doc.querySelector('[data-home-motion]');
 pause.click();assert.equal(hero.classList.contains('motion-paused'),true);assert.equal(pause.getAttribute('aria-pressed'),'true');
 pause.click();assert.equal(hero.classList.contains('motion-paused'),false);
 f.media.matches=true;f.media.dispatchEvent(new f.w.Event('change'));
 assert.equal(pause.disabled,true);assert.equal(hero.classList.contains('motion-paused'),true);assert.equal(pause.textContent,'已减少动态效果');
 f.dispose();f.media.matches=false;f.media.dispatchEvent(new f.w.Event('change'));assert.equal(pause.disabled,true);f.dom.window.close();
 const initial=fixture('','en',true);assert.equal(initial.doc.querySelector('[data-home-motion]').disabled,true);initial.dispose();initial.dom.window.close();
});
