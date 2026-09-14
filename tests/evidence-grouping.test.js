import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {groupAuthors,groupViews,sourceOccurrences,authorIdentity} from '../public/js/app/evidence-grouping.js';
import {tourReadingTarget} from '../public/js/app/tour-events.js';
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
 assert.equal(root.querySelectorAll('article.evidence-node').length,nodes.length);
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
 assert.equal(root.querySelector('.is-context .evidence-bundle-summary strong').textContent,'Recorded point cpu');
 assert.ok(root.querySelector('.is-support .evidence-node'));assert.ok(root.querySelector('.is-counter .evidence-node'));
 root.querySelector('.evidence-map-footer button').click();
 assert.equal(root.querySelector('.is-context .evidence-bundle-summary strong').textContent,'Recorded point cpu');
 assert.equal(root.querySelectorAll('article.evidence-node').length,nodes.length);
 assert.deepEqual(new Set([...root.querySelectorAll('.is-context details article')].map(n=>n.dataset.readingAnchor)),new Set([...facts,...mentions].map(n=>n.id)));
 assert.equal(JSON.stringify(nodes),before);root.dispose();root.remove();
});

test('old same-video records collapse before pagination; opposite opinions keep their own lane',()=>{
 const rows=Array.from({length:12},(_,i)=>node('same'+i,'support'));
 const opposite=node('opposite','counter'),other=node('another','support','other');
 const root=mapView({ticker:'ORCL',nodes:[...rows,opposite,other]});document.body.append(root);
 const fold=root.querySelector('.evidence-bundle');assert.equal(fold.open,false);
 assert.match(fold.querySelector('summary').textContent,/12 related points/);
 assert.equal(fold.querySelectorAll('article.evidence-node').length,12);
 assert.ok(root.querySelector('.is-counter article[data-reading-anchor="opposite"]'));
 assert.ok(root.querySelector('article[data-reading-anchor="another"]'));
 assert.match(root.querySelector('.evidence-map-footer').textContent,/14.*14/);
 root.dispose();root.remove();
});

test('reviewed cross-video groups preserve originals; malformed or mixed memberships cannot collapse',()=>{
 const a=node('a','support'),b=node('b','support');b.evidence[0].post_id='later-video';b.published_at='2026-09-10';
 const fold={id:'fold',basis:'reviewed_equivalent_thesis',node_ids:['a','b']};
 assert.equal(groupViews([a,b]).length,2);
 assert.equal(groupViews([a,b],{invalid:true}).length,2);
 assert.equal(groupViews([a,b],[null]).length,2);
 const buckets=groupViews([a,b],[fold]);assert.equal(buckets.length,1);assert.equal(buckets[0].lead,b);
 assert.deepEqual(buckets[0].nodes,[b,a]);
 for(const invalid of [{...fold,node_ids:['a','missing']},{...fold,node_ids:['a','a']},{...fold,basis:'unreviewed'}])assert.equal(groupViews([a,b],[invalid]).length,2);
 for(const changes of [{stance:'counter'},{condition_text:'If orders rise'},{horizon_text:'2028'},{intent:'mention'}]){
  assert.equal(groupViews([a,{...b,...changes}],[fold]).length,2);
 }
 const different=node('b','support','different');different.evidence[0].post_id='later-video';
 assert.equal(groupViews([a,different],[fold]).length,2);
 const incomplete=node('incomplete','support');incomplete.evidence.push({creator_id:'talk',kind:'creator'});
 assert.equal(groupViews([a,incomplete]).length,2);
});

test('expansion survives refreshed reads, keeps exact child routes, and never fetches',async()=>{
 const rows=[node('a','support'),node('b','support')];
 rows[0].evidence[0].point_id='claim:a';rows[1].evidence[0].point_id='claim:b';
 let fetches=0;globalThis.fetch=()=>{fetches++;throw Error('No model or API on fold');};
 const root=mapView({ticker:'ORCL',nodes:rows});document.body.append(root);
 const fold=root.querySelector('.evidence-bundle');fold.querySelector('summary').click();
 await new Promise(resolve=>setTimeout(resolve,5));assert.equal(fold.open,true);
 const state=root.readingState();assert.equal(state.openedGroups.length,1);
 const refreshed=mapView({ticker:'ORCL',nodes:rows},{state});document.body.append(refreshed);
 assert.equal(refreshed.querySelector('.evidence-bundle').open,true);
 refreshed.querySelector('[data-reading-anchor="b"] .evidence-node-open').click();
 assert.match(location.hash,/point=claim%3Ab/);assert.equal(fetches,0);
 const withdrawn=mapView({ticker:'ORCL',nodes:rows.slice(1)},{state});
 assert.equal(withdrawn.querySelectorAll('.evidence-bundle').length,0);
 assert.equal(withdrawn.querySelector('article').dataset.readingAnchor,'b');
 for(const r of [root,refreshed,withdrawn]){r.dispose();r.remove();}
});

test('a tour targets the closed folder before the exact child, without counting a read',()=>{
 const root=mapView({ticker:'ORCL',nodes:[node('a','support'),node('b','support')]});document.body.append(root);
 const fold=root.querySelector('.evidence-bundle'),child=fold.querySelector('[data-reading-anchor="b"] button');
 const events=[];const listener=e=>events.push(e.detail);document.addEventListener('ducky:tour-progress',listener);
 assert.equal(tourReadingTarget(child),fold.querySelector('summary'));
 fold.querySelector('summary').click();assert.equal(tourReadingTarget(child),child);assert.deepEqual(events,[]);
 document.removeEventListener('ducky:tour-progress',listener);root.dispose();root.remove();
});
