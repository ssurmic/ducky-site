// Isolated synthetic UI: build, then serve research_brief_qa.py --product-focus --port 8923.
// Covers independently available option walls and closing ranges, never production data.
import {chromium,webkit} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';

const base=process.env.QA_BASE||'http://127.0.0.1:8923';
const output=process.env.QA_OUTPUT||'/tmp/ducky-wall-consistency-20260913';
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname),'QA must use loopback');
await mkdir(output,{recursive:true});
// Optional QA_ENGINE=webkit QA_WIDTH=390 QA_LANG=en QA_THEME=dark runs one Safari-engine sample.
const engine=process.env.QA_ENGINE||'chromium';assert.ok(['chromium','webkit'].includes(engine));
const browser=await ({chromium,webkit}[engine]).launch(),results=[];
const cases=[320,390,393,1440].flatMap(width=>['en','zh'].flatMap(lang=>['light','dark'].map(theme=>({width,lang,theme}))))
 .filter(c=>(!process.env.QA_WIDTH||c.width===Number(process.env.QA_WIDTH))&&(!process.env.QA_LANG||c.lang===process.env.QA_LANG)&&(!process.env.QA_THEME||c.theme===process.env.QA_THEME));
assert.ok(cases.length,'requested QA case must exist');

for(const {width,lang,theme} of cases){
 const label=`${engine==='chromium'?'':engine+'-'}${lang}-${theme}-${width}`,result={label,engine,width,height:width<700?650:900,lang,theme,data:'synthetic fixed source facts; no production account or API'};
 const context=await browser.newContext({viewport:{width,height:result.height},colorScheme:theme,hasTouch:width<700});
 const page=await context.newPage(),errors=[],external=[];
 page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>{
  if(new URL(route.request().url()).origin!==new URL(base).origin){external.push(route.request().url());return route.abort();}
  return route.continue();
 });
 const copy=JSON.parse(readFileSync(`i18n/${lang}.json`)),txt=key=>copy['app.'+key];
 const cell=(ticker,key)=>page.locator(`tbody tr[data-reading-anchor="${ticker}"] [data-metric="${key}"]`);
 const scrollTo=async(ticker,key)=>{
  const target=cell(ticker,key);
  await target.evaluate(element=>{
   const scroller=element.closest('.watch-table-scroll'),row=element.closest('tr'),sticky=row.firstElementChild;
   const frame=scroller.getBoundingClientRect(),column=element.closest('td').getBoundingClientRect();
   const fixed=sticky.getBoundingClientRect().width;
   scroller.scrollLeft+=column.left-(frame.left+fixed+1);
   element.scrollIntoView({block:'nearest',inline:'nearest'});
   // scrollIntoView does not account for a sticky sibling; align once more afterwards.
   scroller.scrollLeft+=element.closest('td').getBoundingClientRect().left-(scroller.getBoundingClientRect().left+fixed+1);
  });
  await page.waitForTimeout(80);
  return target;
 };
 const measure=async(ticker,key)=>{
  await scrollTo(ticker,key);
  return cell(ticker,key).evaluate(element=>{
   const scroller=element.closest('.watch-table-scroll'),td=element.closest('td'),sticky=element.closest('tr').firstElementChild;
   const frame=scroller.getBoundingClientRect(),fixed=sticky.getBoundingClientRect(),column=td.getBoundingClientRect();
   const bounds={left:Math.max(frame.left,fixed.right),right:frame.right};
   const selectors='.watch-support-reference,.watch-support-kind,.watch-support-gap,.watch-range-label,.watch-range-empty,.watch-range-ends>span,.watch-wall-kind,.watch-wall .watch-metric-value,.watch-wall-gap';
   const pieces=[...element.querySelectorAll(selectors)].filter(n=>n.textContent.trim()).map(n=>{
    const box=n.getBoundingClientRect(),style=getComputedStyle(n);
    return {class:n.className,text:n.textContent.trim(),left:box.left,right:box.right,width:box.width,height:box.height,
     clipped:box.left<bounds.left-1||box.right>bounds.right+1||n.scrollWidth>n.clientWidth+1||n.scrollHeight>n.clientHeight+1,
     lineClamp:style.webkitLineClamp};
   });
   return {scrollLeft:scroller.scrollLeft,stickyWidth:fixed.width,scrollPadding:getComputedStyle(scroller).scrollPaddingLeft,
    availableWidth:bounds.right-bounds.left,columnWidth:column.width,bounds,pieces};
  });
 };
 try{
  await page.goto(`${base}/qa-frame?lang=${lang}&theme=${theme}&route=watchlist&case=wall-consistency`);
  await cell('NVDA','support').locator('.watch-range[data-range-status="missing"]').waitFor();
  assert.equal(await page.locator('tbody tr').count(),5);
  result.firstView=await page.evaluate(()=>{
   const nav=document.querySelector('.focus-nav')?.getBoundingClientRect(),head=document.querySelector('.app-top')?.getBoundingClientRect();
   const table=document.querySelector('.watch-table-scroll').getBoundingClientRect(),first=document.querySelector('tbody tr').getBoundingClientRect();
   const top=Math.max(head?.bottom||0,nav&&nav.top<innerHeight/2?nav.bottom:0),bottom=nav&&nav.top>=innerHeight/2?nav.top:innerHeight;
   return {headerBottom:head?.bottom,navTop:nav?.top,navBottom:nav?.bottom,remainingAfterNavigation:bottom-top,tableTop:table.top,firstRowTop:first.top,
    visibleRows:[...document.querySelectorAll('tbody tr')].filter(n=>{const r=n.getBoundingClientRect();return r.top<bottom&&r.bottom>Math.max(top,table.top);}).length,
    documentOverflow:document.documentElement.scrollWidth>innerWidth+1};
  });
  assert.equal(result.firstView.documentOverflow,false,'table scroll must stay inside the page');
  assert.ok(result.firstView.visibleRows>=1,'at least one useful stock row must be visible on arrival');
  assert.match(await cell('NVDA','support').locator('.watch-support-reference').innerText(),/225/);
  assert.equal(await cell('NVDA','support').locator('.watch-support-kind').innerText(),txt('watch.signal_ref_put'));
  assert.match(await cell('NVDA','support').locator('.watch-support-gap').innerText(),/2\.2/);
  assert.ok((await cell('NVDA','support').locator('.watch-range-label').innerText()).trim());
  assert.ok((await cell('NVDA','support').locator('.watch-range-empty').innerText()).trim());
  assert.equal(await cell('NVDA','support').locator('.watch-range-track,.watch-range-dot').count(),0);
  assert.equal(await cell('COIN','support').locator('.watch-support-kind').innerText(),txt('watch.signal_ref_low'));
  assert.match(await cell('COIN','support').locator('.watch-support-reference').innerText(),/146\.23/);
  assert.match(await cell('COIN','support').locator('.watch-support-gap').innerText(),/20\.8/);
  assert.equal(await cell('COIN','support').locator('.watch-range[data-range-status="ready"]').count(),1);
  assert.match(await cell('COIN','support').locator('.watch-range-ends').innerText(),/146\.23[\s\S]*192\.70/);
  assert.equal(await cell('COIN','support').locator('.watch-range-dot').count(),1);
  assert.equal(await cell('COIN','walls').getAttribute('data-status'),'none');
  assert.equal(await cell('AVGO','support').locator('.watch-range[data-range-status="ready"]').count(),1);
  assert.equal(await cell('TSLA','support').getAttribute('data-status'),'none');
  assert.equal(await cell('AMD','support').getAttribute('data-status'),'missing');
  assert.equal(await cell('AMD','support').locator('button,.watch-range-dot').count(),0);

  result.geometry=[];
  for(const [ticker,key] of [['NVDA','walls'],['NVDA','support'],['COIN','support']]){
   const geometry=await measure(ticker,key);result.geometry.push({ticker,key,...geometry});
   await page.screenshot({path:`${output}/${label}-${ticker}-${key}.png`});
   const clipped=geometry.pieces.filter(p=>p.clipped);
   assert.deepEqual(clipped,[],`${ticker} ${key} content must fit beside the sticky stock column`);
  }
  // The complete cell opens details, Escape closes them and returns focus to that exact cell.
  for(const ticker of ['NVDA','COIN']){
   const support=await scrollTo(ticker,'support'),left=await page.locator('.watch-table-scroll').evaluate(n=>n.scrollLeft);
   await support.click();await page.locator('.watch-signal-card[data-signal="support"]').waitFor();
   assert.match(await page.locator('.watch-signal-card').innerText(),ticker==='NVDA'?/225/:/146\.23/);
   await page.keyboard.press('Escape');await page.locator('#modal').waitFor({state:'hidden'});
   assert.equal(await support.evaluate(n=>document.activeElement===n),true,'signal-cell focus restored');
   assert.ok(Math.abs(await page.locator('.watch-table-scroll').evaluate(n=>n.scrollLeft)-left)<2,'details preserve horizontal scroll');
  }
  const support=await scrollTo('COIN','support');await support.click();
  await page.locator('.watch-signal-card a[href="#/evidence/COIN"]').click();
  await page.waitForURL(/#\/evidence\/COIN$/);await page.locator('.evidence-map').waitFor();
  result.mapNavigation=locationSafe(page.url());
  assert.equal(await page.locator('#modal').isHidden(),true,'navigation dismisses signal dialog');
  await page.waitForTimeout(220);
  result.fixture=await page.locator('#qa-status').evaluate(n=>JSON.parse(n.textContent));
  assert.ok(result.fixture.requests.every(r=>r.method==='GET'),'read-only fixture never writes');
  assert.deepEqual(result.fixture.errors,[]);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  result.status='passed';
 }catch(error){
  result.status='failed';result.error=String(error);result.pageErrors=errors;result.external=external;
  await page.screenshot({path:`${output}/${label}-failure.png`}).catch(()=>{});
 }
 console.log(JSON.stringify(result));results.push(result);await context.close();
}
const runName=[engine,process.env.QA_WIDTH,process.env.QA_LANG,process.env.QA_THEME].filter(Boolean).join('-');
await browser.close();await writeFile(`${output}/browser-results-${runName}.json`,JSON.stringify(results,null,2)+'\n');
if(results.some(r=>r.status!=='passed'))process.exitCode=1;
function locationSafe(url){const u=new URL(url);return u.pathname+u.search+u.hash;}
