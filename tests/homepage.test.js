import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {mountHomepage} from '../public/js/homepage.js';

// The hero and the catches strip are static build output from three reviewed public files.
const casesFile=readdirSync('public/media').filter(f=>/^ducky-home-cases-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().at(-1);
const cases=JSON.parse(readFileSync('public/media/'+casesFile,'utf8')).cases;
const signals=JSON.parse(readFileSync('public/home-signals.json','utf8'));
const proof=JSON.parse(readFileSync('public/home-proof.json','utf8'));

function fixture(lang='zh',reduced=false){
 const dom=new JSDOM(readFileSync(lang==='en'?'dist/en/index.html':'dist/zh/index.html','utf8'),{url:'https://duckybot.app/'+(lang==='en'?'en/':'zh/'),pretendToBeVisual:true,runScripts:'outside-only'});
 const {window:w}=dom,doc=w.document;
 const media=new w.EventTarget();media.matches=reduced;
 w.matchMedia=q=>q.includes('reduced')?media:{matches:true,addEventListener(){},removeEventListener(){}};
 let requests=0;w.fetch=()=>{requests++;throw Error('Homepage examples must be static');};
 const dispose=mountHomepage(doc);
 return {dom,w,doc,media,dispose,get requests(){return requests;}};
}

for(const lang of ['zh','en'])test(`the public homepage works before JS: one stock's sourced signals, dated catches with full paths and honest counts: ${lang}`,()=>{
 const doc=new JSDOM(readFileSync(`dist/${lang}/index.html`,'utf8')).window.document,prefix=`/${lang}/`;
 assert.equal(doc.querySelector('.home-cta a').getAttribute('href'),prefix+'app/#/register');
 assert.equal(doc.querySelector('.home-cta .home-text-link').getAttribute('href'),'#recent-catches');
 assert.equal(doc.querySelector('dialog'),null,'no research dialog; the examples are on the page');
 assert.equal(doc.querySelector('[data-home-open]'),null);
 const rows=[...doc.querySelectorAll('[data-home-signals] .signal-row')];
 assert.equal(rows.length,signals.items.length);
 rows.forEach((row,i)=>{
  const item=signals.items[i];
  assert.equal(row.querySelector('time').dateTime,item.date);
  assert.equal(row.querySelector('a').href,item.source_url);
  assert.equal(row.querySelector('a').rel,'noopener noreferrer');
  assert.ok(row.textContent.includes(item.title[lang]));
  assert.ok(row.classList.contains('is-'+item.stance));
 });
 assert.ok(new Set(signals.items.map(i=>i.stance)).has('counter'),'the snapshot shows a bearish item, not only bullish ones');
 assert.ok(doc.querySelector('.signal-note').textContent.includes(signals.as_of));
 assert.equal(doc.querySelector('.signal-foot a').getAttribute('href'),prefix+'app/#/stock/'+signals.ticker);
 const numbers=[...doc.querySelectorAll('[data-home-proof] dt')].map(n=>n.textContent.replace(/,/g,''));
 assert.deepEqual(numbers,[proof.creators,proof.videos_tracked,proof.tickers_with_evidence,proof.source_documents].map(String));
 assert.ok(doc.querySelector('.home-proof-note').textContent.includes(proof.as_of));
 const cards=[...doc.querySelectorAll('#recent-catches .catch-card')];
 assert.equal(cards.length,cases.length);
 cards.forEach((card,i)=>{
  const c=cases[i];
  assert.equal(card.querySelector('time').dateTime,c.signal_date);
  assert.equal(card.querySelector('polyline').getAttribute('points').split(' ').length,c.path.length);
  assert.equal(card.querySelector('.catch-change').textContent.trim(),(c.headline_return_pct>=0?'+':'')+c.headline_return_pct.toFixed(1)+'%');
  assert.equal(card.classList.contains('is-negative'),c.headline_return_pct<0);
  assert.equal(card.querySelector('.tag').textContent.trim(),c.tag==='live'?'LIVE':(lang==='en'?'Replay':'回放'));
  if(c.source_url)assert.equal(card.querySelector('a[target=_blank]').href,c.source_url);
  if(c.record_url)assert.ok(card.querySelector(`a[href="${prefix}track-record/"]`));
 });
 assert.ok(cases.some(c=>c.headline_return_pct<0),'the strip discloses at least one loss');
 assert.ok(doc.querySelector(`#recent-catches a[href^="/media/${casesFile}"]`));
 assert.ok(doc.querySelector(`#access a[href="${prefix}app/#/register"]`),'the cost section answers the money question with open access');
 assert.equal(doc.querySelector('#pricing,a[href*="#/billing"]'),null,'no pricing while OPEN-ACCESS-01 is in force');
 assert.ok(doc.querySelector('#about #community'),'support and community sit in the "who runs this" section');
 assert.ok(doc.querySelector('#access').compareDocumentPosition(doc.querySelector('#community'))&4,'support comes after the cost section');
 assert.ok(doc.querySelector('#recent-catches').compareDocumentPosition(doc.querySelector('#features'))&4,'the tool catalogue follows the proof');
});

test('motion pauses on request and honors system reduced motion without offering an ineffective toggle',()=>{
 const f=fixture(),hero=f.doc.querySelector('[data-home-hero]'),pause=f.doc.querySelector('[data-home-motion]');
 pause.click();assert.equal(hero.classList.contains('motion-paused'),true);assert.equal(pause.getAttribute('aria-pressed'),'true');
 pause.click();assert.equal(hero.classList.contains('motion-paused'),false);
 f.media.matches=true;f.media.dispatchEvent(new f.w.Event('change'));
 assert.equal(pause.disabled,true);assert.equal(hero.classList.contains('motion-paused'),true);assert.equal(pause.textContent,'已减少动态效果');
 assert.equal(f.requests,0);
 f.dispose();f.media.matches=false;f.media.dispatchEvent(new f.w.Event('change'));assert.equal(pause.disabled,true);f.dom.window.close();
 const initial=fixture('','en',true);assert.equal(initial.doc.querySelector('[data-home-motion]').disabled,true);assert.equal(initial.requests,0);initial.dispose();initial.dom.window.close();
});
