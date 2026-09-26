import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
// An English page (/app/) for a reader whose account says Chinese: the app follows the account.
const dom=new JSDOM('<html data-lang="en"><body><main id="view"></main></body></html>',{url:'https://ducky.test/app/?tab=x#/today'});
for(const key of ['window','document','Node','location','history','localStorage','sessionStorage'])globalThis[key]=dom.window[key];
const copy=JSON.parse(readFileSync('i18n/en.json'));
const strings=document.createElement('script');strings.id='ducky-strings';
strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));
document.body.append(strings);
const auth=await import('../public/js/app/auth.js');

function fakeLocation(url){const u=new URL(url);const calls=[];return {loc:{pathname:u.pathname,search:u.search,hash:u.hash,protocol:u.protocol,replace:t=>calls.push(t)},calls};}

test('accountLanguage reads ui_lang first, then the sign-up language, and ignores others',()=>{
 assert.equal(auth.accountLanguage({ui_lang:'zh',lang:'en'}),'zh');
 assert.equal(auth.accountLanguage({lang:'en-US'}),'en');
 assert.equal(auth.accountLanguage({lang:'zh-hans'}),'zh');
 assert.equal(auth.accountLanguage({lang:'fr'}),null);
 assert.equal(auth.accountLanguage(null),null);
});

test('a signed-in reader is moved to the account language once, with the cookie saved, keeping route and query',()=>{
 window.sessionStorage.clear();
 const {loc,calls}=fakeLocation('https://ducky.test/app/?tab=x#/today');
 assert.equal(auth.followAccountLanguage({ui_lang:'zh'},{lang:'en',loc}),'/zh/app/?tab=x#/today');
 assert.deepEqual(calls,['/zh/app/?tab=x#/today']);
 assert.match(document.cookie,/ducky_lang=zh/);
 // the same hop is not repeated in this tab (no loop even if the served page disagreed)
 assert.equal(auth.followAccountLanguage({ui_lang:'zh'},{lang:'en',loc}),null);
 assert.equal(calls.length,1);
});

test('no move when the page already matches, when the account has no language, or from a Chinese page to English',()=>{
 window.sessionStorage.clear();
 const same=fakeLocation('https://ducky.test/zh/app/#/watchlist');
 assert.equal(auth.followAccountLanguage({ui_lang:'zh'},{lang:'zh',loc:same.loc}),null);
 assert.equal(auth.followAccountLanguage({},{lang:'zh',loc:same.loc}),null);
 assert.equal(same.calls.length,0);
 const toEnglish=fakeLocation('https://ducky.test/zh/app/#/watchlist');
 assert.equal(auth.followAccountLanguage({lang:'en'},{lang:'zh',loc:toEnglish.loc}),'/en/app/#/watchlist');
});
