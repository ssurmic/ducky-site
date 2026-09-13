import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {mountHomepage} from '../public/js/homepage.js';

// The hero, the catches strip, the product preview and the creator cards are static build output
// from reviewed public files; the script only switches panels that are already in the HTML.
const casesFile=readdirSync('public/media').filter(f=>/^ducky-home-cases-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().at(-1);
const cases=JSON.parse(readFileSync('public/media/'+casesFile,'utf8')).cases;
const signals=JSON.parse(readFileSync('public/home-signals.json','utf8'));
const proof=JSON.parse(readFileSync('public/home-proof.json','utf8'));
const creators=JSON.parse(readFileSync('public/home-creators.json','utf8')).creators;

function fixture(lang='zh',reduced=false){
 const dom=new JSDOM(readFileSync(lang==='en'?'dist/en/index.html':'dist/zh/index.html','utf8'),{url:'https://duckybot.app/'+(lang==='en'?'en/':'zh/'),pretendToBeVisual:true,runScripts:'outside-only'});
 const {window:w}=dom,doc=w.document;
 const media=new w.EventTarget();media.matches=reduced;
 w.matchMedia=q=>q.includes('reduced')?media:{matches:true,addEventListener(){},removeEventListener(){}};
 let requests=0;w.fetch=()=>{requests++;throw Error('Homepage examples must be static');};
 const dispose=mountHomepage(doc);
 return {dom,w,doc,media,dispose,get requests(){return requests;}};
}

for(const lang of ['zh','en'])test(`the public homepage works before JS: sourced signals for several stocks, dated catches, real screens, creators with outcomes: ${lang}`,()=>{
 const doc=new JSDOM(readFileSync(`dist/${lang}/index.html`,'utf8')).window.document,prefix=`/${lang}/`;
 assert.equal(doc.querySelector('.home-cta a').getAttribute('href'),prefix+'app/#/register');
 assert.equal(doc.querySelector('.home-cta .home-text-link').getAttribute('href'),'#preview');
 assert.equal(doc.querySelector('dialog'),null,'no research dialog; the examples are on the page');
 assert.equal(doc.querySelector('[data-home-open]'),null);
 // hero: one panel per stock, all in the HTML, only the first visible
 const tabs=[...doc.querySelectorAll('[data-signal-stock]')],panels=[...doc.querySelectorAll('[data-signal-panel]')];
 assert.deepEqual(tabs.map(t=>t.dataset.signalStock),signals.stocks.map(s=>s.ticker));
 assert.equal(panels.length,signals.stocks.length);
 panels.forEach((panel,p)=>{
  const stock=signals.stocks[p];
  assert.equal(panel.hidden,p!==0);
  assert.ok(panel.querySelector('.signal-price').textContent.includes(stock.close.toFixed(2)));
  assert.ok(panel.querySelector('.signal-price').textContent.includes(stock.close_date));
  const rows=[...panel.querySelectorAll('.signal-row')];
  assert.equal(rows.length,stock.items.length);
  rows.forEach((row,i)=>{
   const item=stock.items[i];
   assert.equal(row.querySelector('time').dateTime,item.date);
   assert.equal(row.querySelector('a').href,item.source_url);
   assert.equal(row.querySelector('a').rel,'noopener noreferrer');
   assert.ok(row.textContent.includes(item.title[lang]));
   assert.ok(row.classList.contains('is-'+item.stance));
  });
  assert.equal(panel.querySelector('.signal-foot a').getAttribute('href'),prefix+'app/#/stock/'+stock.ticker);
 });
 assert.ok(doc.querySelector('.signal-note').textContent.includes(signals.as_of));
 const numbers=[...doc.querySelectorAll('[data-home-proof] dt')].map(n=>n.textContent.replace(/,/g,''));
 assert.deepEqual(numbers,[proof.creators,proof.videos_tracked,proof.tickers_with_evidence,proof.source_documents].map(String));
 assert.ok(doc.querySelector('.home-proof-note').textContent.includes(proof.as_of));
 // recent catches
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
 // Research preview: live app renderer for the map, dated captures for other tools.
 const previewTabs=[...doc.querySelectorAll('[data-preview-tab]')],previewPanels=[...doc.querySelectorAll('[data-preview-panel]')];
 assert.equal(previewTabs.length,4);assert.equal(previewPanels.length,4);
 previewPanels.forEach((panel,i)=>{
  assert.equal(panel.hidden,i!==0);
  const key=panel.dataset.previewPanel, routes={map:'evidence/NVDA',creator:'creators',screen:'boards?screening=1',briefing:'macro'};
  const pages={map:'research-map-preview',creator:'creator-analysis-preview',screen:'screener-preview',briefing:'market-context-preview'};
  const frame=panel.querySelector('iframe');
  assert.equal(frame.getAttribute('src'),prefix+pages[key]+'/');
  assert.ok(frame.title.length>10);
  assert.equal(frame.getAttribute('loading'),'lazy');
  assert.equal(panel.querySelector('img'),null,'outdated walkthrough posters are no longer presented');
  assert.equal(panel.querySelector('.preview-frame .preview-cta'),null,'the action must not obscure the product');
  assert.equal(panel.querySelector('.preview-cta').getAttribute('href'),prefix+'app/#/'+routes[key]);
  assert.ok(panel.querySelector('figcaption').textContent.trim().length>20);
 });
 // creators: attributed summaries in the creator's language, with separate publication and price dates
 const featured=creators.filter(c=>c.case),creatorCards=[...doc.querySelectorAll('#creator-views .creator-card')];
 assert.equal(creatorCards.length,featured.length);
 creatorCards.forEach((card,i)=>{
  const c=featured[i];
  assert.equal(card.dataset.creatorLang,c.lang);
  assert.equal(card.querySelector('blockquote'),null,'a translated summary is not a verbatim quotation');
  assert.ok(card.querySelector('.creator-summary-label').textContent.trim());
  assert.equal(card.querySelector('.creator-summary').getAttribute('lang'),c.lang==='zh'?'zh-CN':'en');
  assert.equal(card.querySelector('.creator-summary').textContent.trim(),c.case.title[c.lang]);
  if(lang!==c.lang)assert.equal(card.querySelector('.creator-translation').textContent.trim(),c.case.title[lang]);
  assert.equal(card.querySelector('.creator-source').href,c.case.source_url);
  assert.equal(card.querySelector('.creator-source').rel,'noopener noreferrer');
  assert.equal(card.querySelector('.creator-change').textContent.trim(),(c.case.change_pct>=0?'+':'')+c.case.change_pct.toFixed(1)+'%');
  assert.equal(card.classList.contains('is-negative'),c.case.change_pct<0);
  assert.equal(card.querySelector('time').dateTime,c.case.published_at);
  assert.equal(card.querySelector('time').textContent.trim(),c.case.published_at.slice(0,10));
  assert.ok(card.querySelector('.creator-basis').textContent.includes(c.case.base_close.toFixed(2)));
  assert.ok(card.querySelector('.creator-basis').textContent.includes(c.case.date));
  assert.ok(card.querySelector('.creator-change').closest('.no-glossary'),'a percentage is not glossary prose');
 });
 assert.ok(featured.some(c=>c.lang==='zh')&&featured.some(c=>c.lang==='en'),'both languages are represented');
 assert.equal(doc.querySelectorAll('#creator-views .creator-roster li').length,creators.length);
 assert.ok(doc.querySelector('#creator-views a[href$="#/creators"]'));
 // order and the rest of the page
 assert.ok(doc.querySelector('#preview').compareDocumentPosition(doc.querySelector('#recent-catches'))&4,'research tools lead the historical outcomes');
 assert.ok(doc.querySelector('#preview').compareDocumentPosition(doc.querySelector('#creator-views'))&4);
 assert.equal(doc.querySelector('#stock-research a[href*="tab=lab"]'),null,'homepage positions source research, not a portfolio simulator');
 assert.ok(doc.querySelector('.creator-roster-more').textContent.trim());
 assert.ok(doc.querySelector(`#access a[href="${prefix}app/#/register"]`),'the cost section answers the money question with open access');
 assert.equal(doc.querySelector('#pricing,a[href*="#/billing"]'),null,'no pricing while OPEN-ACCESS-01 is in force');
 assert.ok(doc.querySelector('#about #community'),'support and community sit in the "who runs this" section');
 assert.ok(doc.querySelector('#access').compareDocumentPosition(doc.querySelector('#community'))&4,'support comes after the cost section');
 assert.ok(doc.querySelector('#recent-catches').compareDocumentPosition(doc.querySelector('#features'))&4,'the tool catalogue follows the proof');
});

test('public examples retain source meaning and do not publish the staging archive',()=>{
 const items=signals.stocks.flatMap(stock=>stock.items);
 assert.ok(items.filter(item=>item.kind==='record').every(item=>item.stance==='context'),
  'filing increases, decreases and absent positions are facts, not stated creator views');
 assert.equal(items.some(item=>item.source_url.includes('kCY86gxv-h0')),false,
  'the revoked Tom Nash retrospective must not return as a current bullish Micron call');
 const withheld=creators.find(creator=>creator.id==='new-money');
 assert.ok(withheld,'the creator remains discoverable after an example is withheld');
 assert.notEqual(withheld.case?.point_id,'se-point:72a10d5bb79ded90e2af033194d896f7',
  'a source-withdrawn GOOGL claim cannot become an outcome example');
 if(!withheld.case)assert.equal(withheld.case_status,'withheld_source_changed');
 for(const folder of ['public/media','dist/media']){
  assert.equal(readdirSync(folder).some(file=>/^creator-points-.*\.json$/.test(file)),false,
   folder+' must not expose the full private generation input');
 }
 for(const lang of ['en','zh']){
  const copy=JSON.parse(readFileSync('i18n/'+lang+'.json','utf8'));
  assert.doesNotMatch(copy['how.step1_body'],/\b3\b|3\s*只/);
  assert.doesNotMatch(copy['home.proof_asof'],/read-only|research store|研究库|只读/);
  assert.doesNotMatch(copy['catches.vrt'],/over.punish|过度惩罚/);
 }
 assert.ok(existsSync('public/home-creators.json'),'the selected dated examples remain available');
});

test('the stock switcher and the preview tabs toggle panels that are already on the page, with keyboard support and no fetch',()=>{
 const f=fixture('zh'),doc=f.doc;
 const tabs=[...doc.querySelectorAll('[data-signal-stock]')],panels=[...doc.querySelectorAll('[data-signal-panel]')];
 tabs[1].click();
 assert.equal(panels[0].hidden,true);assert.equal(panels[1].hidden,false);
 assert.equal(tabs[1].getAttribute('aria-selected'),'true');assert.equal(tabs[0].getAttribute('aria-selected'),'false');
 assert.equal(tabs[1].tabIndex,0);assert.equal(tabs[0].tabIndex,-1);
 tabs[1].dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
 assert.equal(doc.activeElement,tabs[2]);assert.equal(panels[2].hidden,false);assert.equal(panels[1].hidden,true);
 tabs[2].dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));
 assert.equal(panels.at(-1).hidden,false);
 tabs.at(-1).dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
 assert.equal(panels[0].hidden,false,'arrow keys wrap around');
 const pTabs=[...doc.querySelectorAll('[data-preview-tab]')],pPanels=[...doc.querySelectorAll('[data-preview-panel]')];
 pTabs[2].click();
 assert.equal(pPanels[0].hidden,true);assert.equal(pPanels[2].hidden,false);assert.equal(pTabs[2].getAttribute('aria-selected'),'true');
 assert.equal(doc.querySelectorAll('[data-preview-panel]:not([hidden])').length,1);
 assert.equal(f.requests,0);f.dispose();f.dom.window.close();
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
