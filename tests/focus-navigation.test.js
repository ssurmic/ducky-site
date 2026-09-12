import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dom=new JSDOM(readFileSync('dist/en/app/index.html','utf8'),{url:'https://ducky.test/en/app/#/today'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const {selectNavigation}=await import('../public/js/app/navigation.js');
const active=()=>[...document.querySelectorAll('.app-nav a.on')].map(a=>a.dataset.route);

test('the five-destination bar lights the tab a route belongs to, and nothing for account pages',()=>{
 assert.ok(document.querySelector('.focus-nav'));
 selectNavigation('today');assert.deepEqual(active(),['today']);
 selectNavigation('stock',new URLSearchParams('from=today'));assert.deepEqual(active(),['today']);
 selectNavigation('stock',new URLSearchParams('from=explore'));assert.deepEqual(active(),['explore']);
 selectNavigation('stock');assert.deepEqual(active(),['watchlist']);
 for(const route of ['evidence','chart','alerts','briefing','research'])selectNavigation(route),assert.deepEqual(active(),['watchlist'],route);
 for(const route of ['boards','opportunities','vibe','market','macro','screens','reports','record'])selectNavigation(route),assert.deepEqual(active(),['explore'],route);
 selectNavigation('creators');assert.deepEqual(active(),['creators']);
 selectNavigation('calendar');assert.deepEqual(active(),['calendar']);
 for(const route of ['profile','billing','login','register','forgot','reset','oauth'])selectNavigation(route),assert.deepEqual(active(),[],route);
 assert.equal(document.querySelectorAll('.app-nav [aria-current=page]').length,0);
});
