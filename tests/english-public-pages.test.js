import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
// Keep the clock-formatting fixture fixed when the nightly source export changes.
const source={...JSON.parse(readFileSync('public/ideas.json','utf8')),generated_at:'2026-09-09T21:45:00Z'};
async function ideas(page='ideas',data=source,suffix=''){
 const dom=new JSDOM(readFileSync(`dist/en/${page}/index.html`,'utf8'),{url:`https://ducky.test/en/${page}/${suffix}`,runScripts:'outside-only'});
 dom.window.fetch=async()=>({ok:true,json:async()=>data});dom.window.eval(readFileSync('public/js/ideas.js','utf8'));
 await new Promise(r=>setTimeout(r,10));return dom;
}
test('English idea lists identify Chinese originals and keep snapshot clocks and illustrative outcomes honest',async()=>{
 const before=JSON.stringify(source),dom=await ideas(),d=dom.window.document;
 assert.equal(d.querySelector('.idea-link').textContent,'SMH research record');
 const original=d.querySelector('.idea-original-title');assert.equal(original.open,false);assert.equal(original.querySelector('p').textContent,source.ideas[0].title);
 assert.equal(original.querySelector('summary').textContent,'Original title (Chinese)');
 assert.equal(d.querySelector('.status-pill').textContent,'Position opened');
 assert.equal(d.querySelector('#ideas-generated time').getAttribute('datetime'),source.generated_at);
 assert.match(d.querySelector('#ideas-generated').textContent,/2026-09-09 21:45 UTC/);
 assert.equal(d.querySelector('#ideas-table tbody tr td:last-child').textContent,'—');assert.equal(JSON.stringify(source),before);dom.window.close();
});
test('idea list and detail prefer provided English titles without inventing translated evidence',async()=>{
 const data={...source,ideas:[{...source.ideas[0],title_en:'Semiconductor ETF research example'}]};
 const list=await ideas('ideas',data);assert.equal(list.window.document.querySelector('.idea-link').textContent,data.ideas[0].title_en);assert.equal(list.window.document.querySelector('.idea-original-title'),null);list.window.close();
 const detail=await ideas('idea',data,'#'+data.ideas[0].slug),d=detail.window.document;
 assert.equal(d.querySelector('#idea-title').textContent,data.ideas[0].title_en);assert.match(d.querySelector('#idea-head').textContent,/unverified/);
 assert.ok(d.querySelector('#idea-thesis').textContent.includes('示例记录'));detail.window.close();
});
test('an idea link with no matching record has one clear empty state',async()=>{
 const dom=await ideas('idea'),d=dom.window.document;
 assert.equal(d.querySelector('#idea-title').textContent,'Idea not found.');assert.equal(d.querySelector('#idea-error').hidden,true);
 assert.equal(d.querySelector('.idea-grid').hidden,true);assert.ok(d.querySelector('a[href="/en/ideas/"]'));dom.window.close();
});
test('English track record shows the existing English disclaimer and preserves slash-separated terms',async()=>{
 const dom=new JSDOM(readFileSync('dist/en/track-record/index.html','utf8'),{url:'https://ducky.test/en/track-record/',runScripts:'outside-only'}),d=dom.window.document,w=dom.window;
 const english='Hypothetical. Excludes fees, slippage and taxes. Data / signal / education tool. Not investment advice.';
 w.DUCKY={API_BASE:'https://api.ducky.test'};
 w.fetch=async url=>({ok:true,json:async()=>String(url).includes('scorecard')?{disclaimer:'假设性结果，不含费用、滑点和税费。 / '+english}:{rows:[]}});
 w.eval(readFileSync('public/js/track.js','utf8'));await new Promise(r=>setTimeout(r,10));
 assert.equal(d.querySelector('#score-disclaimer').textContent,english);
 assert.equal(d.querySelector('.strip-bi [lang="zh-CN"]'),null);assert.match(d.querySelector('.strip-bi').textContent,/Backtests are hypothetical/);dom.window.close();
});
