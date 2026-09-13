// Verification evidence only. Reads an independently built snapshot; no server or browser.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {JSDOM} from 'jsdom';
const root=resolve(process.argv[2]);
const dist=resolve(root,'dist');
const release=JSON.parse(readFileSync(resolve(dist,'app-release.json'),'utf8'));
const prefix='/app-assets/'+release.version+'/';
const outcomes=[];
for (const lang of ['','en/']) {
  const html=readFileSync(resolve(dist,lang+'app/index.html'),'utf8');
  const doc=new JSDOM(html).window.document;
  assert.equal(doc.querySelector('[data-route="research-brief"]'),null);
  assert.equal(doc.querySelector('a[href="#/research-brief"]'),null);
  assert.equal(doc.querySelector('link[href*="research-brief"]'),null);
  assert.equal(doc.querySelector('script[src*="research-brief"]'),null);
  assert.ok(doc.querySelector('script[src="'+prefix+'main.js"]'));
  const home=new JSDOM(readFileSync(resolve(dist,lang+'index.html'),'utf8')).window.document;
  const designs=[...home.querySelectorAll('a[data-home-design]')].map(a=>({mode:a.dataset.homeDesign,href:a.getAttribute('href')}));
  for(const mode of ['focus','flow','brief']) assert.ok(designs.some(a=>a.mode===mode&&a.href.includes('?design='+mode)));
  outcomes.push({language:lang||'zh',briefNavigation:false,briefStylesheet:false,immutableEntrypoint:true,homepageDesigns:designs});
}
const dom=new JSDOM('<div id="view"></div>',{url:'https://ducky.test/app/#/watchlist',runScripts:'outside-only'});
dom.window.eval(readFileSync(resolve(dist,'config.js'),'utf8'));
assert.equal(dom.window.DUCKY.RESEARCH_BRIEF_ENABLED,false);
for(const key of ['window','document','Node','location','history']) globalThis[key]=dom.window[key];
const calls=[];globalThis.fetch=async(...args)=>{calls.push(String(args[0]));throw Error('No requests authorized in module-import check');};
const router=await import(pathToFileURL(resolve(dist,'app-assets',release.version,'router.js')).href);
const login=await import(pathToFileURL(resolve(dist,'app-assets',release.version,'login-target.js')).href);
assert.equal(router.parse('#/research-brief').name,'watchlist');
assert.equal(login.safeTarget('#/research-brief?token=should-never-be-saved'),null);
assert.equal(login.takeTarget(),'#/watchlist');
assert.equal(calls.length,0);
assert.equal(document.querySelector('link[href*="research-brief"]'),null);
const routerSource=readFileSync(resolve(dist,'app-assets',release.version,'router.js'),'utf8');
assert.match(routerSource,/RESEARCH_BRIEF_ENABLED === true \? \{ 'research-brief': \(\) => import\('\.\/views\/research-brief\.js'\)/);
const seen=new Set(),queue=[resolve(dist,'app-assets',release.version,'main.js')];
while(queue.length){
  const path=queue.pop();if(seen.has(path))continue;seen.add(path);
  const source=readFileSync(path,'utf8');
  for(const match of source.matchAll(/\bfrom\s+["'](\.{1,2}\/[^"']+\.js)["']|\bimport\s+["'](\.{1,2}\/[^"']+\.js)["']/g)){
    const dependency=resolve(dirname(path),match[1]||match[2]);
    assert.ok(dependency.startsWith(resolve(dist,'app-assets',release.version)+'/'));
    queue.push(dependency);
  }
}
assert.ok(![...seen].some(path=>path.includes('research-brief')));
for(const file of ['templates/_partials/homepage-hero.html','public/js/homepage.js']){
  const baseline=execFileSync('git',['show','HEAD:'+file],{cwd:root});
  assert.deepEqual(readFileSync(resolve(root,file)),baseline);
}
console.log(JSON.stringify({snapshot:root,moduleVersion:release.version,defaultFlag:false,defaultRoute:router.parse('#/research-brief').name,defaultLoginTarget:login.takeTarget(),moduleImportRequests:calls,cssAfterImport:0,eagerModuleCount:seen.size,eagerModules:[...seen].map(p=>relative(dist,p)).sort(),previewModuleReachableByStaticImport:false,conditionalDynamicImportVerified:true,homepageSourceMatchesBaseline:true,languages:outcomes,limitation:'Node DOM and static graph checks; no HTTP authentication, browser request trace, or real-data entitlement validation.'},null,2));
