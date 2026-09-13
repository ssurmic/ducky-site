import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<html lang="en" data-lang="en"><body><main></main></body></html>',
  {url:'https://ducky.test/en/creator-analysis-preview/'});
for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
const block=document.createElement('script');block.id='ducky-strings';
block.textContent=JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(readFileSync('i18n/en.json')))
  .filter(([key])=>key.startsWith('app.')).map(([key,value])=>[key.slice(4),value])));
document.body.append(block);
const snapshot=JSON.parse(readFileSync('public/examples/video-summary.json'));
const {publicCreator,mountPublicCreator}=await import('../public/js/app/creator-analysis-preview.js');
const store=await import('../public/js/app/store.js');

test('public adapter retains the actual creator, summary text and source positions without inventing evidence',()=>{
  const before=JSON.stringify(snapshot),doc=publicCreator(snapshot);
  assert.deepEqual(doc.creator,{id:snapshot.kol_id,name:snapshot.kol_name});
  assert.equal(doc.title,snapshot.title);assert.equal(doc.url,snapshot.url);
  assert.equal(doc.published_at,snapshot.published_at);
  for(const [index,row]of doc.page.highlights.entries()){
    assert.deepEqual(row.summary,{en:snapshot.sections[index].en,zh:snapshot.sections[index].zh});
    assert.equal(row.start_seconds,snapshot.sections[index].start_seconds);
    assert.equal(row.url,snapshot.url);assert.equal(row.published_at,snapshot.published_at);
    for(const key of ['evidence','point_id','ticker','stance','observed_at','recorded_at'])assert.equal(row[key],undefined);
  }
  assert.deepEqual(Object.keys(doc.page),['highlights']);
  assert.equal(JSON.stringify(snapshot),before);
});

test('actual creator highlight UI is readable in both languages without API, account or storage writes',()=>{
  const root=document.querySelector('main'),before=JSON.stringify(store.get()),sourceBefore=JSON.stringify(snapshot);
  const priorFetch=globalThis.fetch,priorSet=window.Storage.prototype.setItem;
  let requests=0,writes=0;
  globalThis.fetch=()=>{requests++;throw Error('No API in the public creator preview');};
  window.Storage.prototype.setItem=function(){writes++;throw Error('No storage writes in the preview');};
  try{
    for(const language of ['en','zh-CN']){
      document.documentElement.lang=language;
      const view=mountPublicCreator(root,snapshot),articles=[...view.querySelectorAll('.creator-highlights>article')];
      assert.equal(view.querySelector('h1').textContent,snapshot.kol_name);
      assert.equal(view.querySelector('.cr-video-title').textContent,snapshot.title);
      assert.equal(articles.length,3);
      for(const [index,article]of articles.entries()){
        const section=snapshot.sections[index],link=article.querySelector('a');
        assert.equal(article.querySelector('p').textContent,section[language==='en'?'en':'zh']);
        assert.equal(article.querySelector('time').textContent,snapshot.published_at.slice(0,10));
        const url=new URL(link.href);
        assert.equal(url.searchParams.get('v'),new URL(snapshot.url).searchParams.get('v'));
        assert.equal(url.searchParams.get('t'),String(section.start_seconds));
        const time=Math.floor(section.start_seconds/60)+':'+String(section.start_seconds%60).padStart(2,'0');
        assert.ok(link.textContent.startsWith(time+' · '));
        assert.equal(link.target,'_blank');assert.match(link.rel,/noopener/);assert.match(link.rel,/noreferrer/);
      }
      assert.equal(view.querySelector('blockquote'),null);
      assert.equal(view.querySelector('.creator-price-chart,.creator-page-about,.evidence-controls'),null);
      assert.equal(view.querySelector('form,input,button'),null);
      assert.equal(view.querySelector('a[href^="#/"]'),null);
    }
    assert.equal(requests,0);assert.equal(writes,0);
    assert.equal(JSON.stringify(store.get()),before);assert.equal(JSON.stringify(snapshot),sourceBefore);
  }finally{
    globalThis.fetch=priorFetch;window.Storage.prototype.setItem=priorSet;
    document.documentElement.lang='en';root.replaceChildren();
  }
});

test('unsafe or incomplete source records fail before replacing the visible preview',()=>{
  const changes=[
    value=>{value.url='javascript:alert(1)';},
    value=>{value.url='https://operator:secret@www.youtube.com/watch?v=f8kUx5_1cWc';},
    value=>{value.source.summary_reviewed=false;},
    value=>{value.source.status='processing';},
    value=>{value.sections[0].start_seconds=-1;},
    value=>{value.sections[0].start_seconds=value.source.duration_seconds;},
    value=>{value.sections[1].start_seconds=value.sections[0].start_seconds;},
    value=>{value.sections[1].en='';},
    value=>{value.published_at='2026-02-30T20:02:45+00:00';},
    value=>{delete value.kol_id;},
  ];
  const root=document.querySelector('main');
  mountPublicCreator(root,snapshot);const before=root.innerHTML;
  for(const change of changes){
    const invalid=structuredClone(snapshot);change(invalid);
    assert.throws(()=>mountPublicCreator(root,invalid),/invalid_public_creator/);
    assert.equal(root.innerHTML,before);
  }
  root.replaceChildren();
});

test('extra source fields do not cross into the rendered selected summary',()=>{
  const enriched={...snapshot,private_notes:'not for presentation',source:{...snapshot.source,internal_token:'not for presentation'}};
  const root=document.querySelector('main');
  mountPublicCreator(root,enriched);
  assert.doesNotMatch(root.textContent,/not for presentation|source_hash|caption_segments/);
  root.replaceChildren();
});
