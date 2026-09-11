import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import path from 'node:path';

// Exercise the actual generated page: tests that load i18n directly cannot catch missing payload keys.
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const lang of ['zh','en'])test(`${lang}: generated app ships every translation, including alerts, creators and TA`,()=>{
 const table=JSON.parse(readFileSync(`i18n/${lang}.json`));
 const dom=new JSDOM(readFileSync(`dist/${lang==='en'?'en/':'zh/'}app/index.html`,'utf8'));
 const embedded=JSON.parse(dom.window.document.querySelector('#ducky-strings').textContent);
 const navigation=JSON.parse(readFileSync('product-navigation.json'));
 for(const {key} of navigation.radar){
  for(const prefix of key==='all'?['radar.guide_']:['radar.guide_','boards.t_'])assert.ok(embedded[prefix+key],`catalogue translation missing: ${prefix+key}`);
 }
 for(const route of [...navigation.primary,...navigation.discovery,...navigation.research,...navigation.account])assert.ok(embedded['nav.'+route],route);
 assert.equal(dom.window.document.querySelector('[data-route="ducky"]'),null);
 assert.deepEqual(embedded,Object.fromEntries(Object.entries(table).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));
 for(const k of ['creatorflow.browse_title','creatorflow.browse_hint','creatorflow.topic_ai','creatorflow.topic_portfolio','creatorflow.topic_macro','creatorflow.topic_basics','creatorflow.input_hint','alertdraft.title','alertdraft.prompt','alertdraft.review','chart.pick','chart.period_6mo']) {
  assert.ok(embedded[k]&&embedded[k]!==k,`${k} is readable in the built page`);
 }
 for(const file of files('public/js/app').filter(f=>f.endsWith('.js'))) {
  const code=readFileSync(file,'utf8');
  for(const match of code.matchAll(/\bs\(\s*["']([a-z]+\.[\w.]+)["']\s*[,)]/g)) {
   if(!match[1].endsWith('.')) assert.ok(embedded[match[1]],`${file}: missing ${match[1]}`);
  }
 }
});
