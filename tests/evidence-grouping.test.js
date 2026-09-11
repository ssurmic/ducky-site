import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {groupAuthors,sourceOccurrences,authorIdentity} from '../public/js/app/evidence-grouping.js';
const dom=new JSDOM('<html data-lang="en"><body></body></html>',{url:'https://ducky.test/app/'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const strings=document.createElement('script');strings.id='ducky-strings';strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json'))).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));document.body.append(strings);
const {mapView}=await import('../public/js/app/views/evidence.js');
function node(id,stance='context',creator='talk'){
 return {id,kind:'creator',stance,title:{en:'Recorded point '+id},published_at:'2026-09-08',evidence:[{creator_id:creator,post_id:'post',kind:'creator',author:'Investment Talk',source_url:'https://example.com/video?t='+id,published_at:'2026-09-08',observed_at:'2026-09-09T00:00:00Z'}]};
}
test('grouping retains every point and source revision; identical names do not merge different authors',()=>{
 const nodes=[node('1'),node('2'),node('3','counter'),node('4','context','different')],before=JSON.stringify(nodes);
 const groups=groupAuthors(nodes);assert.equal(groups.length,2);assert.equal(groups[0].nodes.length,3);assert.equal(groups[0].sources.size,1);
 assert.equal(sourceOccurrences(nodes).get('talk:post'),3);assert.equal(JSON.stringify(nodes),before);
 assert.equal(authorIdentity({...nodes[0],evidence:[nodes[0].evidence[0],nodes[3].evidence[0]]}),null);
 assert.equal(authorIdentity({...nodes[0],evidence:[{author:'Same displayed name'}]}),null);
});
test('stance lanes retain opposing records and group expanded author history with repeat notices and exact links',()=>{
 let calls=0;globalThis.fetch=()=>{calls++;throw Error('No fetch during presentation');};
 const nodes=[node('bull','support'),node('bear','counter'),...Array.from({length:7},(_,i)=>node('context'+i))];
 const root=mapView({ticker:'NVDA',nodes});document.body.append(root);
 assert.deepEqual([...root.querySelectorAll('.evidence-group')].map(n=>n.className),['evidence-group is-support','evidence-group is-context','evidence-group is-counter']);
 root.querySelector('.evidence-map-footer button').click();
 assert.equal(root.querySelectorAll('.evidence-node').length,nodes.length);
 const group=root.querySelector('.is-context .evidence-author-group');assert.ok(group.querySelector('a[href*="creator=talk"]'));
 assert.match(group.textContent,/7 records.*1 original source/s);
 const more=group.querySelector('details');assert.equal(more.open,false);more.querySelector('summary').click();assert.equal(more.open,true);
 assert.match(root.querySelector('.evidence-repeat').textContent,/9 records/);
 assert.ok(root.querySelector('.is-counter .evidence-node'));assert.equal(calls,0);
 root.dispose();root.remove();
});
test('real viewpoints stay in the first map preview and author preview before generic mentions',()=>{
 const mentions=Array.from({length:4},(_,i)=>({...node('mention'+i),intent:'mention'}));
 const facts=[node('cpu'),node('customer')],nodes=[...mentions,...facts,node('bull','support'),node('bear','counter')];
 const before=JSON.stringify(nodes),root=mapView({ticker:'QCOM',nodes});document.body.append(root);
 const visible=()=>[...root.querySelectorAll('.is-context .evidence-author-group > article')].map(n=>n.dataset.readingAnchor);
 assert.deepEqual(visible(),['cpu','customer']);
 assert.ok(root.querySelector('.is-support .evidence-node'));assert.ok(root.querySelector('.is-counter .evidence-node'));
 root.querySelector('.evidence-map-footer button').click();
 assert.deepEqual(visible(),['cpu','customer']);
 assert.equal(root.querySelectorAll('.evidence-node').length,nodes.length);
 assert.deepEqual([...root.querySelectorAll('.is-context details article')].map(n=>n.dataset.readingAnchor),mentions.map(n=>n.id));
 assert.equal(JSON.stringify(nodes),before);root.dispose();root.remove();
});
