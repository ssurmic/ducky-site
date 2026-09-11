// Separate EN/ZH test processes load the actual modules with their own static
// string table. The mocked HTTP boundary represents shared, already reviewed data.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

export async function registerDiscoveryChain(lang) {
  const dom=new JSDOM(`<html lang="${lang}" data-lang="${lang}"><body></body></html>`,
    {url:'https://ducky.test/'+(lang==='en'?'en/':'zh/')+'app/#/creators?scope=discover'});
  for(const key of ['window','document','Node','location','history'])globalThis[key]=dom.window[key];
  globalThis.requestAnimationFrame=fn=>fn();
  dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
  const copy=JSON.parse(readFileSync(`i18n/${lang}.json`));
  const strings=document.createElement('script');strings.id='ducky-strings';
  strings.textContent=JSON.stringify(Object.fromEntries(Object.entries(copy).filter(([k])=>k.startsWith('app.')).map(([k,v])=>[k.slice(4),v])));
  document.body.append(strings);
  const store=await import('../../public/js/app/store.js');
  const {mount}=await import('../../public/js/app/views/creators.js');
  const tick=()=>new Promise(resolve=>setImmediate(resolve));
  const settle=async()=>{for(let i=0;i<3;i++)await tick();};
  const documentOf=items=>({status:'ready',items});
  const entry=(id,ticker='NVDA',stance='support')=>({creator:{id,name:'历史博主 Historical '+id,lang,platform:'youtube',profile:{}},
    status:'available',latest_view:{creator_id:id,post_id:'archive0001',point_id:'claim:'+id,ticker,stance,
      published_at:new Date(Date.now()-2*86400000).toISOString(),
      source_url:'https://www.youtube.com/watch?v=archive0001&t=91',
      text:{zh:'作者看好现金流改善 '+id,en:'The creator expects stronger cash flow '+id}}});
  function backend(items,watch=['NVDA'],feedCreators=[]) {
    const state={items,watch,feedCreators,requests:[],discovery:null,sources:{}};
    globalThis.fetch=async(url,options)=>{
      const parsed=new URL(url,'https://ducky.test');
      const req={path:parsed.pathname,params:parsed.searchParams,method:options.method,user:store.get('me')?.user_id,signal:options.signal};
      state.requests.push(req);assert.equal(req.method,'GET','discovery and refresh are read-only');
      if(['/kol/feed','/kol/trial-feed'].includes(req.path))return Response.json({kols:state.feedCreators,posts:[],pages:{}});
      if(req.path==='/me/kols')return Response.json({subs:[],creators:[],cap:2,analysis:{}});
      if(req.path==='/watchlist')return Response.json({items:state.watch.map(ticker=>({ticker}))});
      if(req.path==='/kol/lookups'||req.path==='/kol/suggest')return Response.json({items:[]});
      if(req.path==='/kol/discover'){
        assert.equal(req.params.get('lang'),lang);
        if(state.discovery)return state.discovery(req);
        const wanted=req.params.get('ticker')?.split(',')||req.params.get('tickers')?.split(',');
        return Response.json(documentOf(wanted?state.items.filter(row=>wanted.includes(row.latest_view.ticker)):state.items));
      }
      if(state.sources[req.path])return Response.json(state.sources[req.path]);
      if(/^\/kol\/[^/]+\/page$/.test(req.path))return Response.json({kol_id:req.path.split('/')[2],status:'ready',coverage:{reviewed:1}});
      assert.fail('Unexpected endpoint '+req.path);
    };
    return state;
  }
  async function view(t,{user=1,tier='free',query='scope=discover'}={}) {
    store.bumpEpoch();store.set('me',{tier,user_id:user});
    history.replaceState(null,'','#/creators'+(query?'?'+query:''));
    const root=document.createElement('main');document.body.append(root);
    const dispose=await mount(root,{query:new URLSearchParams(query)});await settle();
    const close=()=>{dispose();root.remove();};t.after(close);
    return {root,close};
  }
  const cards=root=>[...root.querySelectorAll('.creator-discovery-directory .creator-name')].map(n=>n.textContent);
  const scope=root=>root.querySelector(`[aria-label="${copy['app.creatordiscovery.scope']}"]`);
  const refresh=root=>[...root.querySelectorAll('.creator-page-actions button')].find(b=>b.textContent===copy['app.creatorflow.refresh']).click();
  async function search(root,text) {
    const input=root.querySelector('input[type=search]');assert.ok(input);
    input.value=text;input.dispatchEvent(new window.Event('input'));
    root.querySelector('.creator-discovery-search').dispatchEvent(new window.Event('submit',{cancelable:true}));await settle();
  }

  test(`${lang}: two unfollowing users discover the same historical creator absent from the recent feed`,async t=>{
    const row=entry('archive');const state=backend([row]);
    for(const user of [101,202]){
      const {root,close}=await view(t,{user});
      assert.deepEqual(cards(root),[row.creator.name]);
      assert.equal(root.querySelector('.creator-recent-feed'),null);
      assert.ok(root.querySelector('.creator-discovery-preview').textContent.includes(row.latest_view.text[lang]));
      assert.ok(root.querySelector('.creator-discovery-badge.is-bull'));
      assert.equal(root.querySelector('[role=combobox]'),null);
      const link=root.querySelector('.creator-discovery-links a[href^="#/creators"]');
      assert.equal(link.getAttribute('href'),'#/creators?scope=discover&creator=archive&post=archive0001&point=claim%3Aarchive');
      assert.equal(root.querySelector('.creator-discovery-links a[target=_blank]').href,row.latest_view.source_url);
      assert.ok(state.requests.some(req=>req.user===user&&req.path==='/kol/discover'&&req.params.get('tickers')==='NVDA'));
      close();
    }
    assert.ok(state.requests.every(req=>req.method==='GET'&&!/resolve|lookups|\/sub$/.test(req.path)));
  });

  test(`${lang}: discovery source link opens exactly its historical post and highlighted point`,async t=>{
    const row=entry('archive','ORCL');const state=backend([row],['ORCL']);
    const first=await view(t);const href=first.root.querySelector('.creator-discovery-links a').getAttribute('href');first.close();
    state.sources['/kol/archive/posts/archive0001']={creator:row.creator,post:{id:40,kol_id:'archive',kol_name:row.creator.name,
      platform_post_id:'archive0001',title:'Exact historical source',published_at:row.latest_view.published_at,tickers:['ORCL'],calls:[],
      url:'https://www.youtube.com/watch?v=archive0001',summary:{quality:'no_call',zh:'作者讨论公司现金流。',en:'The creator discusses company cash flow.',
        source:{kind:'transcript',status:'ready',summary_reviewed:true}},
      reviewed_spans:[{...row.latest_view,basis:'attributed_opinion',title:row.latest_view.text,start_seconds:91,evidence:'Recorded source excerpt.'}]}};
    const start=state.requests.length;const {root}=await view(t,{query:href.split('?')[1]});
    assert.equal(root.querySelectorAll('.cr-post').length,1);
    const focus=root.querySelector('[data-point-id="claim:archive"].is-focused');assert.ok(focus);
    assert.ok(focus.classList.contains('is-support'));assert.ok(focus.textContent.includes(row.latest_view.text[lang]));
    assert.equal(focus.querySelector('a[target=_blank]').href,row.latest_view.source_url);
    assert.equal(root.querySelector('.cr-sections').open,true);
    assert.ok(state.requests.slice(start).some(req=>req.path==='/kol/archive/posts/archive0001'));
    assert.ok(!state.requests.slice(start).some(req=>/feed|discover|resolve/.test(req.path)));
    assert.equal(location.hash,href);
  });

  test(`${lang}: directly opening or reloading a historical creator route retains the discovery-only author`,async t=>{
    const row=entry('historical');const state=backend([row]);
    const query='scope=discover&creator=historical';
    for(let reload=0;reload<2;reload++){
      const {root,close}=await view(t,{tier:'pro',query});
      assert.equal(root.querySelector('.creator-selected-heading h1')?.textContent,row.creator.name);
      assert.equal(location.hash,'#/creators?'+query);
      assert.equal(root.querySelector('.creator-video-archive')?.open,true);
      assert.ok(!state.feedCreators.some(c=>c.id==='historical'));
      close();
    }
  });

  for(const entrance of ['add','empty-following'])test(`${lang}: Following → ${entrance} fetches watchlist-scoped discovery before showing its results`,async t=>{
    const relevant=entry('relevant','NVDA'),unrelated=entry('unrelated','ORCL');
    const state=backend([relevant,unrelated]);const {root}=await view(t,{tier:'pro',query:'scope=following'});
    assert.ok(!state.requests.some(req=>req.path==='/kol/discover'&&req.params.has('tickers')));
    const button=entrance==='add'
      ?[...root.querySelectorAll('.creator-page-actions button')].find(b=>b.textContent===copy['app.creatorflow.add'])
      :[...root.querySelectorAll('.creator-recent-feed button')].find(b=>b.textContent===copy['app.creators.discover']);
    assert.ok(button);button.click();await settle();
    assert.equal(scope(root)?.value,'watchlist');assert.deepEqual(cards(root),[relevant.creator.name]);
    assert.ok(state.requests.some(req=>req.path==='/kol/discover'&&req.params.get('tickers')==='NVDA'));
    assert.equal(Boolean(root.querySelector('.creator-add-panel')),entrance==='add');
    assert.ok(!state.requests.some(req=>req.path==='/kol/resolve'));
  });

  test(`${lang}: returning from a search-selected creator reloads the directory after clearing the query`,async t=>{
    const alpha=entry('Alpha'),beta=entry('Beta');const state=backend([alpha,beta]);
    const {root}=await view(t,{tier:'pro'});
    state.discovery=req=>Response.json(documentOf(req.params.get('q')==='Alpha'?[alpha]:[alpha,beta]));
    await search(root,'Alpha');assert.deepEqual(cards(root),[alpha.creator.name]);
    root.querySelector('.creator-discovery-directory .creator-name').click();await settle();
    assert.equal(root.querySelector('.creator-selected-heading h1').textContent,alpha.creator.name);
    assert.equal(root.querySelector('input[type=search]').value,'');
    const count=state.requests.filter(req=>req.path==='/kol/discover').length;
    [...root.querySelectorAll('button')].find(b=>b.textContent==='← '+copy['app.creatorpage.all']).click();await settle();
    assert.equal(root.querySelector('input[type=search]').value,'');
    assert.deepEqual(new Set(cards(root)),new Set([alpha.creator.name,beta.creator.name]));
    const queries=state.requests.filter(req=>req.path==='/kol/discover');
    assert.equal(queries.length,count+1);assert.equal(queries.at(-1).params.has('q'),false);
    assert.equal(queries.at(-1).params.get('tickers'),'NVDA');
  });

  test(`${lang}: refreshing rereads newly watched tickers and an empty watchlist remains empty until All is explicit`,async t=>{
    const old=entry('old','NVDA'),fresh=entry('fresh','ORCL');const state=backend([old,fresh]);
    const {root}=await view(t);assert.equal(scope(root).value,'watchlist');assert.deepEqual(cards(root),[old.creator.name]);
    state.watch=['NVDA','ORCL'];refresh(root);await settle();
    assert.deepEqual(new Set(cards(root)),new Set([old.creator.name,fresh.creator.name]));
    assert.ok(state.requests.some(req=>req.path==='/kol/discover'&&req.params.get('tickers')==='NVDA,ORCL'));
    assert.equal(state.requests.filter(req=>req.path==='/watchlist').length,2);
    state.watch=[];refresh(root);await settle();
    assert.equal(scope(root).value,'watchlist');assert.deepEqual(cards(root),[]);
    assert.ok(root.textContent.includes(copy['app.creatordiscovery.empty_watchlist']));
    assert.equal(root.querySelector('.creator-starters'),null);
    scope(root).value='all';scope(root).dispatchEvent(new window.Event('change'));await settle();
    assert.deepEqual(new Set(cards(root)),new Set([old.creator.name,fresh.creator.name]));
    scope(root).value='watchlist';const count=state.requests.length;
    scope(root).dispatchEvent(new window.Event('change'));await settle();
    assert.deepEqual(cards(root),[]);assert.equal(state.requests.length,count,'empty watchlist is not an unfiltered request');
  });

  test(`${lang}: name, ticker and bilingual opinion queries intersect the selected stocks using GET only`,async t=>{
    const nvda=entry('unrelated','NVDA'),orcl=entry('oracle','ORCL');const state=backend([nvda,orcl],['ORCL']);
    const {root}=await view(t);
    for(const query of ['历史博主','Historical oracle','ORCL','现金流','cash flow']){
      state.discovery=req=>{
        assert.equal(req.params.get('q'),query);assert.equal(req.params.get('tickers'),'ORCL');
        return Response.json(documentOf([orcl]));
      };
      await search(root,query);
      assert.deepEqual(cards(root),[orcl.creator.name]);assert.equal(root.querySelector('input[type=search]').value,query);
      assert.ok(!location.hash.includes('q='),'search text is not published in a shareable route');
    }
    const filter=root.querySelector(`[aria-label="${copy['app.creatordiscovery.filter']}"]`);
    state.discovery=req=>{assert.equal(req.params.get('stance'),'counter');assert.equal(req.params.get('q'),'cash flow');
      assert.equal(req.params.get('tickers'),'ORCL');return Response.json(documentOf([{...orcl,latest_view:{...orcl.latest_view,stance:'counter'}}]));};
    filter.value='counter';filter.dispatchEvent(new window.Event('change'));await settle();
    assert.ok(root.querySelector('.creator-discovery-badge.is-bear'));
    assert.ok(state.requests.every(req=>req.method==='GET'&&!/resolve|lookups|suggest/.test(req.path)));
  });

  test(`${lang}: an obsolete search response cannot replace the newer query or survive unmount`,async t=>{
    const initial=entry('initial'),old=entry('old'),fresh=entry('fresh');const state=backend([initial]);
    const {root,close}=await view(t);let resolveOld,resolveGone;const signals=[];
    state.discovery=req=>{
      signals.push(req.signal);
      if(req.params.get('q')==='old')return new Promise(resolve=>resolveOld=resolve);
      if(req.params.get('q')==='gone')return new Promise(resolve=>resolveGone=resolve);
      assert.equal(req.params.get('q'),'fresh');return Response.json(documentOf([fresh]));
    };
    await search(root,'old');assert.ok(resolveOld);await search(root,'fresh');
    assert.equal(signals[0].aborted,true);assert.deepEqual(cards(root),[fresh.creator.name]);
    resolveOld(Response.json(documentOf([old])));await settle();
    assert.deepEqual(cards(root),[fresh.creator.name]);assert.equal(root.querySelector('input[type=search]').value,'fresh');
    await search(root,'gone');const frozen=root.innerHTML;close();
    resolveGone(Response.json(documentOf([old])));await settle();assert.equal(root.innerHTML,frozen);
  });

  test(`${lang}: refresh removes withdrawn views even when the recent creator catalogue still contains the author`,async t=>{
    const row=entry('withdrawn');const state=backend([row],['NVDA'],[row.creator]);
    const {root}=await view(t);assert.deepEqual(cards(root),[row.creator.name]);
    state.items=[];refresh(root);await settle();
    assert.deepEqual(cards(root),[]);assert.equal(root.querySelector('.creator-starters'),null);
    assert.ok(root.textContent.includes(copy['app.creatordiscovery.no_match']));
    assert.equal(root.querySelector('.creator-discovery-links'),null);
    assert.ok(state.requests.every(req=>req.method==='GET'));
  });
}
