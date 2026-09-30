import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
test('language links follow inline filter state before click or open-in-new-tab',()=>{
 const dom=new JSDOM('<a data-lang-toggle href="/en/app/">EN</a><a data-lang-toggle-footer href="/en/app/">EN footer</a>',{url:'https://ducky.test/zh/app/#/boards?board=insider',runScripts:'outside-only'});
 try{
  dom.window.eval(readFileSync('public/js/lang.js','utf8'));
  const hash='#/boards?board=insider&mode=archive&direction=-1&cap=large&purchases=all&q=issuer';
  dom.window.history.replaceState(null,'',hash);dom.window.dispatchEvent(new dom.window.Event('ducky:route-state'));
  for(const link of dom.window.document.querySelectorAll('a'))assert.equal(link.getAttribute('href'),'/en/app/'+hash);
  dom.window.history.replaceState(null,'','#/reset?token=private');dom.window.dispatchEvent(new dom.window.Event('ducky:route-state'));
  for(const link of dom.window.document.querySelectorAll('a'))assert.equal(link.getAttribute('href'),'/en/app/#/reset','new event preserves existing recovery-token redaction');
 }finally{dom.window.close();}
});
