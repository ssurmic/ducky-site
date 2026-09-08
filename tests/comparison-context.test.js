import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const lang=process.env.DUCKY_COMPARISON_LANG||'en';
const dom=new JSDOM(`<html data-lang="${lang}"><body></body></html>`,{url:'https://ducky.test/app/#/evidence/COIN'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const copy=JSON.parse(readFileSync(`i18n/${lang}.json`));
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {comparisonLabel,comparisonDetails}=await import('../public/js/app/comparison-context.js');
const {mapView}=await import('../public/js/app/views/evidence.js');
const {reportCard}=await import('../public/js/app/views/stock-briefs.js');
const {closeModal}=await import('../public/js/app/ui.js');
const tr=k=>copy['app.comparison.'+k];
function fact(role='broad_sector',ticker='COIN',right='XLF'){
 return {id:'f1',kind:'fact',topic:'stock_vs_sector_etf',observed_at:'2026-09-08T12:00:00Z',source_url:`https://finance.yahoo.com/quote/${ticker}/history/`,
   data:{left:ticker,right,left_return_pct:-4,right_return_pct:2,excess_pp:-6,start:'2026-08-07',end:'2026-09-04',
     comparison_context:{role,label:{zh:'金融服务',en:'Financial services'},reason:{zh:'按已记录的公司板块选择。',en:'Selected from the recorded company sector.'},
       classification:{sector:'Financial Services',industry:'Financial Data & Stock Exchanges',observed_at:'2026-09-05T12:00:00Z',source_url:'https://finance.yahoo.com/quote/COIN/profile/'},
       membership:{status:'not_checked'},version:'v1'}}};
}
test('COIN graph and exact source dialog distinguish a broad sector reference from ETF membership',()=>{
 const f=fact(),root=mapView({ticker:'COIN',status:'ready',nodes:[{id:'n1',kind:'fact',priority:'market',stance:'context',
   title:{en:'COIN lagged XLF by 6 percentage points.',zh:'COIN 落后 XLF 6 个百分点。'},evidence:[f]}]});
 document.body.append(root);const card=root.querySelector('.evidence-node');
 assert.equal(card.querySelector('.comparison-label').textContent,tr('broad_sector')+' · XLF');
 card.click();const details=document.querySelector('.modal-body .comparison-context');
 assert.ok(details.textContent.includes(tr('membership_unknown')));
 assert.match(details.textContent,/2026-08-07.*2026-09-04/);
 assert.match(details.textContent,/Financial Data & Stock Exchanges/);
 assert.match(details.textContent,/2026-09-05/);
 assert.equal(details.querySelector('a').href,'https://finance.yahoo.com/quote/COIN/profile/');
 assert.equal(root.querySelector('.evidence-node strong').textContent,lang==='en'?'COIN lagged XLF by 6 percentage points.':'COIN 落后 XLF 6 个百分点。');
 closeModal();root.dispose();root.remove();
});
test('AVGO industry reference shows only a dated, sourced constituent record and never infers it',()=>{
 const f=fact('industry','AVGO','SOXX');
 f.data.comparison_context.membership={status:'verified_snapshot',as_of:'2026-09-04',source_url:'https://www.ishares.com/holdings'};
 const box=comparisonDetails(f);
 assert.equal(comparisonLabel(f),tr('industry')+' · SOXX');
 assert.ok(box.textContent.includes(tr('membership').replace('{date}','2026-09-04')));
 assert.ok(box.textContent.includes(tr('membership_note')));
 assert.equal(box.querySelector('a[href="https://www.ishares.com/holdings"]').textContent,tr('holdings_source')+' ↗');
 for(const patch of [{as_of:undefined},{source_url:undefined},{status:'not_checked'}]){
   const d=structuredClone(f);Object.assign(d.data.comparison_context.membership,patch);
   assert.ok(comparisonDetails(d).textContent.includes(tr('membership_unknown')));
 }
});
test('missing classification and legacy contracts retain the pair without invented scope or holdings',()=>{
 const f=fact('broad_market','ABCD','SPY');delete f.data.comparison_context.classification;
 assert.equal(comparisonLabel(f),tr('broad_market')+' · SPY');
 assert.equal(comparisonDetails(f).querySelectorAll('a').length,0);
 delete f.data.comparison_context;
 assert.equal(comparisonLabel(f),tr('unspecified')+' · SPY');
 assert.match(comparisonDetails(f).textContent,/2026-08-07/);
 assert.ok(comparisonDetails(f).textContent.includes(tr('membership_unknown')));
 assert.equal(comparisonDetails({topic:'price',data:{price:10}}),null);
});
test('source metadata is text; credentialed and unsafe URLs cannot establish membership',()=>{
 const f=fact();f.data.comparison_context.reason[lang]='<img src=x onerror=alert(1)>';
 f.data.comparison_context.classification.source_url='javascript:alert(1)';
 f.data.comparison_context.membership={status:'verified_snapshot',as_of:'2026-09-04',source_url:'https://name:secret@example.com/holdings'};
 const box=comparisonDetails(f);
 assert.equal(box.querySelectorAll('img,script,a').length,0);
 assert.match(box.textContent,/<img/);assert.ok(box.textContent.includes(tr('membership_unknown')));
});
test('stock brief comparison uses the same scope details and theme basket is not called business peers',()=>{
 const f=fact(),theme={id:'f2',topic:'business_peer_comparison',data:{benchmark:'Crypto',scope:'thematic_reference',kind:'basket',symbols:['MSTR','MARA'],excess20:-2,as_of:'2026-09-04'}};
 const row={ticker:'COIN',status:'ready',evidence:[f,theme],report:{state:'wait',dimensions:[]}};
 const root=reportCard(row),facts=root.querySelectorAll('.stock-brief-fact');
 assert.equal(facts[0].querySelector('h4').textContent,tr('heading'));
 assert.equal(facts[0].querySelector('.comparison-label').textContent,comparisonLabel(f));
 assert.equal(facts[1].querySelector('.comparison-label').textContent,tr('theme_basket'));
 assert.ok(facts[1].textContent.includes(tr('theme_note')));assert.match(facts[1].textContent,/MSTR · MARA/);
 assert.ok(!facts[1].textContent.includes(tr('business_peers')));
 theme.data.scope='business_peers';assert.equal(comparisonLabel(theme),tr('business_peers'));
 delete theme.data.scope;assert.equal(comparisonLabel(theme),tr('unspecified'));
});
