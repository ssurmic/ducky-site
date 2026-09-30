import {el,clear,spinner,toast} from '../ui.js';
import {s} from '../strings.js';
import * as api from '../api.js';
import * as store from '../store.js';
import {analysisPanel,detail,mapView} from './evidence.js';
import {pick,compactPrice,dayWindow,localTime,researchError,replaceReading,syncSourceDialog,noteCard} from '../stock-reading.js';
import {closingChart} from '../stock-price-chart.js';
import {stockMetrics,priceReferencePlan} from '../stock-metrics.js';
import {stockDisclosureLinks} from '../stock-disclosures.js';
import {unpackSnapshot} from '../snapshot-model.js';
import {changeCard} from './today.js';
import {mountCreatorOpinions} from '../creator-opinions.js';
import {mountMapOpinions} from '../evidence-opinions.js';

export async function mount(root,{ticker,signal,returnTo,query=new URLSearchParams()}={}){
  if(!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker||'')){location.hash='#/explore';return;}
  let disposed=false,followingBusy=false,lastEvidence=null,currentMap=null;
  const account=()=>[store.get('token'),store.get('me')?.user_id??store.get('me')?.id];
  const epoch=store.epoch(),identity=account(),current=()=>!disposed&&!signal?.aborted&&store.epoch()===epoch&&account().every((value,i)=>value===identity[i]);
  const chartHead=()=>el('div.focus-chart-head',el('h2',s('focus.price_history')),
    el('a.stock-open',{href:'#/chart/'+encodeURIComponent(ticker),'data-stock-tool':'kline'},s('focus.open_kline')+' →'));
  const shell=el('article.focus-stock'),body=el('div'),chart=el('section.focus-chart',chartHead(),spinner());
  const from=['today','explore','creators','calendar','boards'].includes(query.get('from'))?query.get('from'):'watchlist';
  let tab=['overview','metrics','evidence','history'].includes(query.get('tab'))?query.get('tab'):'overview';
  let snapshot=null,snapshotBusy=false,snapshotRead=false,snapshotError=false,snapshotPending=false,hardDenied=false,snapshotRequest=0;
  const overviewPanel=el('section.stock-overview-panel'),mapPanel=el('section.stock-map-panel'),metricsPanel=el('section.stock-metrics-panel'),historyPanel=el('section.stock-history-panel');
  const panels={overview:overviewPanel,metrics:metricsPanel,evidence:mapPanel,history:historyPanel};
  const tabs=el('nav.stock-workspace-tabs',{'aria-label':s('stockux.workspace')});
  for(const key of Object.keys(panels))tabs.append(el('a',{href:'#/stock/'+ticker+'?'+new URLSearchParams({from,tab:key}),'data-stock-tab':key},s('stockux.'+key)));
  function showTab(){
    for(const [key,panel]of Object.entries(panels))panel.hidden=key!==tab;
    tabs.querySelectorAll('a').forEach(a=>a.setAttribute('aria-current',a.dataset.stockTab===tab?'page':'false'));
    if(tab==='metrics')loadSnapshot();
    if(tab==='history'){details.open=true;if(!historyLoaded)loadHistory();}
    currentMap?.refresh?.();
  }
  function paintMetrics(){
    replaceReading(metricsPanel,stockMetrics(ticker,lastEvidence?.price,snapshot,{pending:snapshotBusy||snapshotPending,queued:snapshotPending,error:snapshotError,onRetry:loadSnapshot}));
  }
  async function loadSnapshot(){
    if(snapshotRead||snapshotBusy||hardDenied)return;
    const request=++snapshotRequest;
    snapshotBusy=true;snapshotPending=false;paintMetrics();
    try{const result=await api.get('/snapshot/'+ticker,{signal});if(!current()||hardDenied||request!==snapshotRequest)return;
      if(api.isAccepted(result)){snapshot=null;snapshotRead=false;snapshotPending=true;}
      else if(result?.ticker===ticker&&result.snapshot&&typeof result.snapshot==='object'){snapshot=unpackSnapshot(result);snapshotRead=true;}
      else throw new api.ApiError(502,{error:'invalid_snapshot_response'});
      snapshotError=false;
    }catch(error){if(current()&&!hardDenied&&request===snapshotRequest){snapshot=null;snapshotError=true;}}
    finally{if(current()&&request===snapshotRequest){snapshotBusy=false;if(!hardDenied)paintMetrics();}}
  }
  const company=el('p.small.muted',{hidden:true});
  const head=el('header.focus-heading',el('div',el('a.small.muted',{href:returnTo||'#/'+from},'← '+s('nav.'+from)),el('h1',el('span.ticker-symbol',ticker)),company));
  const follow=el('button.btn.btn-ghost',{type:'button','data-stock-watch':ticker});
  const membershipNotice=el('div.stock-watch-feedback',{hidden:true,role:'status','aria-live':'polite'});
  const clearMembershipNotice=()=>{clear(membershipNotice);membershipNotice.hidden=true;};
  const sync=()=>{
    if(!current()){clearMembershipNotice();follow.disabled=true;return;}
    const watched=(store.get('watchlist')||[]).includes(ticker);
    follow.textContent=s(watched?'focus.unfollow_stock':'focus.follow_stock');follow.disabled=followingBusy;
    if(!watched)clearMembershipNotice();
  };
  sync();follow.addEventListener('click',async()=>{
    if(followingBusy||!current())return;followingBusy=true;clearMembershipNotice();sync();
    const watched=(store.get('watchlist')||[]).includes(ticker);
    try{await (watched?api.watchlist.remove(ticker,{signal}):api.watchlist.add(ticker,{signal}));if(!current())return;
      store.set('watchlist',watched?(store.get('watchlist')||[]).filter(t=>t!==ticker):[...new Set([...(store.get('watchlist')||[]),ticker])]);
      if(!watched){membershipNotice.append(el('span',s('focus.watch_added',{ticker})),
        el('a.btn.btn-ghost.btn-sm',{href:'#/watchlist'},s('focus.view_watchlist')));membershipNotice.hidden=false;}}
    catch(error){if(current()){toast(s('common.error',{msg:error.message}),'err');follow.disabled=false;}}
    finally{followingBusy=false;if(current())sync();}
  });
  // Every core surface for this stock is one tap from its heading: the map, the K-line, the
  // history, the creators, the calendar and the alert (owner, 2026-09-24: "K 线要能找到").
  const directTools=el('nav.stock-core-actions',{'aria-label':s('focus.deeper_research')},
    ...[['evidence/','evidence'],['chart/','chart_short'],['research/','history_short'],['creators?scope=discover&ticker=','creators_short'],['calendar?ticker=','calendar_short'],['alerts?ticker=','alert_short']].map(([route,key])=>
      el('a.btn.btn-ghost',{href:'#/'+route+encodeURIComponent(ticker),'data-stock-tool':key},s('focus.'+key))));
  head.append(follow);
  const opinionsHost=el('div.stock-opinions-host');
  overviewPanel.append(body,opinionsHost,priceReferencePlan(ticker,from),chart);
  const opinions=tab==='overview'?mountCreatorOpinions(opinionsHost,{signal,ticker,from}):null;
  const mapBody=el('div'),mapOpinionsHost=el('div');mapPanel.append(mapBody,mapOpinionsHost);
  const mapOpinions=tab==='evidence'?mountMapOpinions(mapOpinionsHost,{signal,ticker,from}):null;
  const tools=el('details.stock-extra-tools',el('summary',s('focus.deeper_research')),directTools);
  head.append(el('a.btn.btn-ghost',{href:'#/chart/'+ticker,'data-stock-tool':'kline'},s('focus.chart_short')));
  shell.append(head,membershipNotice,tabs,stockDisclosureLinks(ticker),overviewPanel,metricsPanel,mapPanel,historyPanel,tools);root.append(shell);
  const off=store.subscribe('*',sync);
  signal?.addEventListener('abort',sync,{once:true});
  const details=el('details.focus-history',el('summary',s('focus.research_history'))),historyBody=el('div');details.append(historyBody);historyPanel.append(details);
  let historyCursor=null,historyLoaded=false,historyLoading=false;
  async function loadHistory(){
    if(historyLoading)return;historyLoading=true;
    const params=new URLSearchParams({...dayWindow(new Date(),365),scope:'all',ticker,limit:'10',...(historyCursor?{before:historyCursor}:{})});
    const progress=spinner();historyBody.append(progress);
    try{
      const response=await api.get('/me/research-changes?'+params,{signal});
      if(!current()||hardDenied)return;
      if(!Array.isArray(response?.items))throw new api.ApiError(502,{error:'invalid_research_response'});
      progress.remove();historyLoaded=true;historyCursor=response.next_cursor;
      if(!response.items?.length)historyBody.append(el('p.muted',s('focus.history_empty')));
      for(const item of response.items||[])historyBody.append(changeCard(item,{from}));
      if(historyCursor){const more=el('button.btn.btn-ghost',{type:'button',onclick:()=>{more.remove();loadHistory();}},s('focus.more_changes'));historyBody.append(more);}
    }catch(error){if(current()){progress.remove();historyBody.append(researchError(error,loadHistory));}}
    finally{historyLoading=false;}
  }
  details.addEventListener('toggle',()=>{if(details.open&&!historyLoaded)loadHistory();});
  // The heading already carries the map, chart, history, calendar and alert; only the archive stays here.
  historyPanel.append(el('p.focus-tool-links',el('a.btn.btn-ghost',{href:'#/briefing?archive=1&ticker='+ticker},s('focus.past_stock_briefs'))));
  function renderEvidence(result){
    if(result?.ticker!==ticker||!Object.hasOwn(result,'evidence')||(result.evidence&&!Array.isArray(result.evidence.nodes)))throw new api.ApiError(502,{error:'invalid_research_response'});
    const recoveredAccess=hardDenied;
    hardDenied=false;lastEvidence=result;
    company.textContent=typeof result.price?.company==='string'?result.price.company:'';company.hidden=!company.textContent||company.textContent===ticker;
    const doc=result.evidence?{ticker,...result.evidence}:{ticker,nodes:[],analysis_status:'pending'};
    const available=(doc.nodes||[]).filter(n=>n.intent!=='mention');
    const direct=available.filter(n=>n.priority==='direct'),important=direct.length?direct:available;
    const refs=doc.analysis?.overview?.citations||[];
    const cited=refs.map(id=>available.find(n=>n.id===id)).filter(Boolean);
    const selected=[...new Map([...cited,...important].map(n=>[n.id,n])).values()].slice(0,3);
    // A short preview must not make a two-sided record look unanimous. Keep the
    // earliest cited sources, reserving one slot for each available important side.
    // The analysis above retains every original inline citation.
    for(const stance of ['support','counter']){
      const representative=important.find(n=>n.stance===stance);
      if(!representative||selected.some(n=>n.stance===stance))continue;
      if(selected.length<3){selected.push(representative);continue;}
      const replace=selected.findLastIndex(n=>!['support','counter'].includes(n.stance)||selected.filter(other=>other.stance===n.stance).length>1);
      if(replace>=0)selected[replace]=representative;
    }
    const sources=el('section.stock-key-evidence',el('h2',s('focus.key_sources')));
    if(!selected.length)sources.append(el('p.muted',s('focus.no_research')));
    for(const node of selected){
      const authors=node.kind==='creator'?[...new Set((node.evidence||[]).map(e=>e.author).filter(Boolean))].join(' · '):'';
      const kind=s(node.stance==='counter'?(node.kind==='creator'?'focus.counter_view':'focus.counter_record'):node.kind==='creator'?'focus.creator_view':node.kind==='fact'?'focus.market_data':'focus.source_record');
      const at=node.published_at?localTime(node.published_at):s('focus.source_recorded',{date:localTime(node.observed_at||node.evidence?.[0]?.observed_at)});
      sources.append(el('button.stock-source-card',{type:'button','data-reading-key':`${ticker}:source:${node.id}`,
        class:'is-'+node.stance,'data-reading-anchor':node.id,onclick:()=>detail(node,{readingTicker:ticker})},
        el('span.small.muted',[authors,kind,at].filter(Boolean).join(' · ')),el('strong',pick(node.title)),el('span.small',s('focus.read_source')+' →')));
    }
    syncSourceDialog(ticker,[...(doc.analysis_nodes||[]),...(doc.nodes||[])]);
    const mapState=currentMap?.readingState?.();currentMap?.dispose?.();
    currentMap=mapView(doc,{showAnalysis:false,state:mapState});
    const mapSection=el('section.stock-information-map',el('header.focus-heading',el('div',el('h2',s('focus.evidence')),el('p.small.muted',s('focus.map_intro'))),
      el('a.stock-open',{href:'#/evidence/'+ticker},s('focus.open_full_map')+' →')),currentMap);
    replaceReading(body,compactPrice(result.price),analysisPanel(doc,{formatTime:localTime}),...(noteCard(result.price?.digest?.views)?[noteCard(result.price.digest.views)]:[]),sources);
    replaceReading(mapBody,...(mapOpinions?[mapOpinions.entry]:[]),mapSection);paintMetrics();
    api.readDiagnostic('render',{resource:'stock_research',items:doc.nodes.length,readable:doc.analysis?1:0});
    currentMap.refresh?.();
    if(recoveredAccess&&tab==='metrics')loadSnapshot();
  }
  async function loadEvidence(){
    if(!lastEvidence){clear(body);body.append(spinner());}
    try{
      const result=await api.get('/stock-research/'+encodeURIComponent(ticker),{signal});
      if(!current())return;
      renderEvidence(result);
      const requested=query.get('source'),node=(result.evidence?.nodes||[]).find(n=>n.id===requested);
      if(node)detail(node,{readingTicker:ticker});
    }catch(error){if(current()){
      if([401,402,403,404,410].includes(error.status))syncSourceDialog(ticker,[]);
      if(!lastEvidence||[401,402,403,404,410].includes(error.status)){lastEvidence=null;currentMap?.dispose?.();currentMap=null;clear(body);clear(mapBody);paintMetrics();}
      if([401,402,403].includes(error.status)){hardDenied=true;snapshotRequest++;snapshot=null;snapshotBusy=false;snapshotRead=false;snapshotPending=false;snapshotError=false;clear(chart);clear(metricsPanel);clear(mapBody);clear(historyBody);
        for(const panel of [metricsPanel,mapBody,historyBody])panel.append(researchError(error,loadEvidence));}
      body.prepend(researchError(error,loadEvidence));
    }}
  }
  function renderPrices(response){
    if(!Array.isArray(response)&&!Array.isArray(response?.bars)&&!Array.isArray(response?.items)&&!api.isAccepted(response))throw new api.ApiError(502,{error:'invalid_price_response'});
    const selected=chart.querySelector('.stock-chart-scrub[data-scrubbed]')?.getAttribute('aria-valuetext')?.slice(0,10);
    const focus=chart.contains(document.activeElement);
    clear(chart);chart.append(chartHead());
    if(api.isAccepted(response)){chart.append(el('p.muted',s('focus.chart_pending')));return;}
    const figure=closingChart(response,{selectedDate:selected});chart.append(figure);
    if(focus)figure.querySelector('input')?.focus({preventScroll:true});
  }
  const updates=event=>{
    const update=event.detail;
    if(!current()||hardDenied||!update)return;
    try{
      if(update.path==='/stock-research/'+ticker)renderEvidence(update.value);
      else if(update.path==='/bars/'+ticker+'?period=6mo')renderPrices(update.value);
      else if(update.path==='/snapshot/'+ticker&&update.value?.ticker===ticker&&update.value.snapshot){snapshot=unpackSnapshot(update.value);snapshotRead=true;snapshotError=false;paintMetrics();}
      else return;
      update.accepted=true;
    }catch{} // Malformed updates stay under the existing explicit reload/error flow.
  };
  root.addEventListener('ducky:shared-read',updates);
  const saved=api.peek('/stock-research/'+ticker);
  if(saved)renderEvidence(saved);
  const priceTask=api.get('/bars/'+encodeURIComponent(ticker)+'?period=6mo',{signal}).then(response=>{
    if(current()&&!hardDenied)renderPrices(response);
  }).catch(error=>{if(current()&&!hardDenied){clear(chart);chart.append(chartHead(),el('p.muted',s('focus.chart_unavailable')));}});
  showTab();
  await Promise.all([loadEvidence(),priceTask]);
  return()=>{disposed=true;clearMembershipNotice();off();signal?.removeEventListener('abort',sync);opinions?.dispose();mapOpinions?.dispose();currentMap?.dispose?.();root.removeEventListener('ducky:shared-read',updates);};
}
