import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
for(const lang of ['zh','en'])for(const example of [true,false])for(const view of ['ideas','idea'])test(`${lang} ${view}: ${example?'format examples have no performance':'paper losses remain visible'}`,async()=>{
 const slug=example?'example-smh-format':'actual-paper';
 const dom=new JSDOM(readFileSync(`dist/${lang==='en'?'en/':'zh/'}${view}/index.html`,'utf8'),{url:`https://ducky.test/${lang==='en'?'en/':'zh/'}ideas/${view==='idea'?slug+'/':''}`,runScripts:'outside-only'});
 const data={ideas:[{slug,ticker:'SMH',title:'Preserved source',book:'paper',status:'opened',lang:'zh',entry_px:100,last_px:90.123456,last_px_d:'2026-09-04',thesis_md:'Original historical illustration',events:[]}]};
 const before=JSON.stringify(data);dom.window.fetch=async()=>({ok:true,json:async()=>data});
 dom.window.eval(readFileSync('public/js/ideas.js','utf8'));await new Promise(r=>setTimeout(r,5));
 const text=dom.window.document.querySelector('main').textContent;
 if(example){assert.doesNotMatch(text,/-9\.9%|90\.123456/);assert.match(text,lang==='en'?/Format (example|illustration)/:/格式/);}
 else assert.match(text,/-9\.9%/);
 assert.equal(JSON.stringify(data),before);dom.window.close();
});
