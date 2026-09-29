import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('public/js/language-preference.js','utf8');
function enter({path='/',token=null,cookie='',loggedOut=false,blocked=false,languages=['en-US']}={}) {
 const url=new URL(path,'https://ducky.test'),redirects=[];
 const context={URL,document:{cookie,addEventListener(){}},navigator:{languages},
  location:{href:url.href,pathname:url.pathname,hash:url.hash,search:url.search,origin:url.origin,protocol:url.protocol,
   replace:to=>redirects.push(to)},localStorage:{getItem:key=>{
    if(blocked)throw new Error('blocked');
    return key==='ducky.token'?token:key==='ducky.logged-out'&&loggedOut?'1':null;
   }},fetch:()=>assert.fail('Landing must not make authentication requests')};
 context.window=context;vm.runInNewContext(source,context);return redirects;
}
test('returning homepage opens Today directly with explicit or selected locale',()=>{
 for(const [path,cookie,languages,want] of [
  ['/','',['en-US'],'en'],['/','ducky_lang=zh',['en-US'],'zh'],
  ['/','',['zh-TW'],'zh'],['/en/','ducky_lang=zh',['zh-CN'],'en'],
  ['/zh/','ducky_lang=en',['en-US'],'zh'],['/zh/index.html','',['en-US'],'zh'],
  ['/index.html','',['en-US'],'en'],['/en','',['zh-CN'],'en'],
 ])assert.deepEqual(enter({path,cookie,languages,token:'saved-expired-or-valid-hint'}),['/'+want+'/app/#/today']);
});
test('cookie-only remembered browser can enter with unavailable token storage',()=>{
 assert.deepEqual(enter({path:'/zh/',cookie:'ducky_entry=1',blocked:true}),['/zh/app/#/today']);
 assert.deepEqual(enter({path:'/en/',cookie:'ducky_entry=0'}),[]);
 assert.deepEqual(enter({path:'/en/',cookie:'other_ducky_entry=1'}),[]);
});
test('anonymous, explicitly logged-out and inaccessible-storage visitors keep the introduction',()=>{
 assert.deepEqual(enter(),[]);
 assert.deepEqual(enter({blocked:true}),[]);
 assert.deepEqual(enter({token:'stale',cookie:'ducky_entry=1',loggedOut:true}),[]);
});
test('explicit marketing anchors and intro opt-out remain accessible',()=>{
 for(const path of ['/en/#pricing','/zh/#top','/en/?intro=1','/zh/?intro=1&utm_source=example'])
  assert.deepEqual(enter({path,token:'present'}),[]);
 assert.deepEqual(enter({path:'/#pricing',token:'present',languages:['zh-CN']}),['/zh/#pricing']);
});
test('app deep links, recovery callbacks and non-home public pages are not replaced',()=>{
 for(const path of ['/en/app/#/stock/MU?tab=evidence','/zh/app/#/oauth?provider=google',
  '/app/#/reset?token=fixture','/app/#/oauth?code=fixture','/en/privacy/','/zh/track-record/',
  '/enindex.html','/en/ideas/NVDA/'])assert.deepEqual(enter({path,token:'present'}),[]);
});
test('arbitrary destination parameters cannot control the returning route',()=>{
 assert.deepEqual(enter({path:'/?next=https://other.test&utm_source=example',token:'present'}),['/en/app/#/today']);
});
test('routing runs synchronously before the homepage body and app module loading',()=>{
 for(const path of ['dist/index.html','dist/en/index.html','dist/zh/index.html']) {
  const html=readFileSync(path,'utf8');
  assert.ok(html.indexOf('/js/language-preference.js')<html.indexOf('<body'));
 }
});
