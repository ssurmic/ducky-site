import {evidenceLink} from '../evidence-link.js';
// views/creators.js — 财经博主: follow finance creators; Ducky summarises each new video. The creator grid
// has Follow toggles (POST/DELETE /kol/{id}/sub); below it, the recent summary feed. The feed is a RECORD of
// the creator's view (attributed, tickers, bull/bear), never our advice.
import { s } from "../strings.js";
import {verifiedSpans,spanSection,legacyCalls,tickerViews} from '../creator-spans.js';
import * as api from "../api.js";
import * as store from "../store.js";
import * as router from "../router.js";
import { el, clear, toast, spinner, empty } from "../ui.js";
import { mountResearch, safeSource, dateTime, metric } from './creator-research.js';

import {mountSetup,confirmCreator,avatar} from './creator-setup.js';
import {progressPoll} from './creator-progress.js';
import {mountSimulation} from './creator-simulation.js';
import {mountLeaderboard} from './creator-leaderboard.js';
import {groundedClaim,claimDetails} from './creator-claim.js';
import {renderCreatorPage} from './creator-page.js';
import {creatorRoute,creatorTarget} from '../creator-route.js';
import {matchesStocks,taggedTickers} from '../creator-match.js';
import {readingPreview} from '../reading-preview.js';

const TAKE_CLS = { bull: "cr-bull", bear: "cr-bear", neutral: "cr-neutral" };
const CALL_ARROW = { bull: "▲", bear: "▼", neutral: "•" };

function pickSummary(x, isZh) {
  if (x == null) return "";
  if (typeof x === "object") return isZh ? (x.zh || x.en || "") : (x.en || x.zh || "");
  try { const o = JSON.parse(x); return isZh ? (o.zh || o.en || "") : (o.en || o.zh || ""); } catch (e) { return String(x); }
}

// A reading preview only; the complete attributed text remains in the disclosure.
export function conciseSummary(value, isZh) {
  return readingPreview(pickSummary(value,isZh),isZh);
}

// Remove trailing promotion tags from the reading title, retaining the source title below.
export function previewTitle(value) {
  const original = String(value || '').trim();
  return original.replace(/(?:\s*[#＃][\p{L}\p{N}_]+)+\s*$/u, '')
    .replace(/[✨🌟⭐]\s*\d{8}\s*$/u, '').replace(/^[✨🌟⭐]\s*/u, '').trim() || original;
}

export function evidenceMeta(post) {
  let data = post?.summary;
  if (typeof data === "string") { try { data = JSON.parse(data); } catch { data = {}; } }
  return data && typeof data === "object" ? data : {};
}
export function hasGroundedCalls(post) {
  const meta = evidenceMeta(post);
  return meta.quality === "grounded" && meta.source?.kind === "transcript" && (post.calls || []).some(groundedClaim);
}

export function hasReviewedSummary(post) {
  const m = evidenceMeta(post);
  return hasGroundedCalls(post) || ((m.source?.summary_reviewed===true || ["short-video-v2","short-video-v3","creator-video-v4"].includes(m.source?.version)) && m.source.status === "ready" && m.source.kind === "transcript" && ["grounded", "no_call"].includes(m.quality));
}
export function discoveredSource(post){
  const source=evidenceMeta(post).source;
  return source?.kind==='metadata'&&source.status==='discovered'&&source.discovery_version==='creator-discovery-v1'&&Boolean(source.channel_id);
}
function atTime(url, seconds) {
  try { const u = new URL(url); if (!["www.youtube.com", "youtube.com", "youtu.be"].includes(u.hostname) || !Number.isFinite(seconds) || seconds < 0 || seconds > 5400) return url;
    u.searchParams.set("t", String(Math.floor(seconds))); return u.href;
  } catch { return url; }
}
export function filterPosts(posts, { following, mine, archive, query = "", tickers=null }) {
  const needle = query.trim().toLocaleLowerCase();
  return posts.filter(p => (!mine || following.has(p.kol_id)) && matchesStocks(p,tickers) && (archive || hasReviewedSummary(p) || verifiedSpans(p).length || discoveredSource(p)) &&
    (!needle || [p.kol_name, p.title, ...(p.tickers || []), pickSummary(p.summary,true), pickSummary(p.summary,false)].join(" ").toLocaleLowerCase().includes(needle)))
    .sort((a,b)=>(Date.parse(b.published_at)||0)-(Date.parse(a.published_at)||0));
}
export function videoDate(value, lang) {
  if (!value) return s("creators.date_unknown");
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? s("creators.date_unknown") :
    new Intl.DateTimeFormat(lang, {dateStyle:"medium", timeStyle:"short", timeZone:"UTC"}).format(d) + " UTC";
}

function callChips(calls, isZh, url,kolId) {
  // per-ticker gist Ducky dug out of the video: $SYM ▲/▼ + the target the CREATOR stated (attributed,
  // never our own) + their one-line point. Compact chips so a promo/title-only video still yields signal.
  const wrap = el("div.cr-calls");
  for (const c of calls) {
    const st = (c.stance === "bull" || c.stance === "bear") ? c.stance : "neutral";
    if (!groundedClaim(c)) continue;
    const chip = el("div.cr-call.cr-call-" + st);
    chip.appendChild(el("b.cr-call-sym.mono", "$" + String(c.sym || "").toUpperCase()));
    chip.appendChild(el("span.cr-call-arrow", s("creators.take_" + st)));
    const note = pickSummary(c.note, isZh);
    if (note) chip.appendChild(el("span.cr-call-note", note));
    chip.append(claimDetails(c));
    chip.appendChild(el("details.cr-evidence", el("summary", s("creators.evidence")), c.evidence?el("blockquote", c.evidence):el('p.small.muted',s('creatorclaim.source_link'))));
    const sourceSeconds=c.action_start_seconds??c.start_seconds;
    if (safeSource(url) && Number.isFinite(sourceSeconds)) chip.appendChild(el("a", {href:atTime(url,sourceSeconds),target:"_blank",rel:"noopener noreferrer"}, `${Math.floor(sourceSeconds/60)}:${String(Math.floor(sourceSeconds)%60).padStart(2,"0")} ↗`));
    chip.append(evidenceLink(c.sym,c.point_id||c.claim_id),el('a.btn.btn-ghost.btn-sm',{href:'#/chart/'+encodeURIComponent(c.sym)},s('creators.chart')));
    chip.append(el('a.btn.btn-ghost.btn-sm',{href:creatorTarget({tab:'research',selected:kolId,ticker:c.sym,mine:false})},s('creatorclaim.price_title')));
    wrap.appendChild(chip);
  }
  return wrap;
}

export async function mount(root, {query:routeQuery=new URLSearchParams(),signal} = {}) {
  const epoch = store.epoch();
  const isZh = (document.documentElement.lang || "zh").slice(0, 2) !== "en";
  const card = el("section.card.creators-view");
  root.appendChild(card);
  card.append(el("h1", s("creators.h1")), el("p.muted", s("creators.sub")));
  card.appendChild(spinner());

  const initial=creatorRoute(routeQuery);
  let doc, subs, watches,linkedSource=null,linkFailed=false;
  try {
    [doc, subs, watches] = await Promise.all([api.kol.feed(), api.kol.mine(), api.watchlist.list().catch(()=>null)]);
    if(initial.post&&initial.selected){
      try{linkedSource=await api.get('/kol/'+encodeURIComponent(initial.selected)+'/posts/'+encodeURIComponent(initial.post));}
      catch{linkFailed=true;}
    }
  } catch (e) {
    if (epoch !== store.epoch() || signal?.aborted) return () => {};
    const retry=el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>{
      if(retry.disabled || !root.isConnected || epoch!==store.epoch() || signal?.aborted)return;
      retry.disabled=true;router.go(location.hash);
    }},s('common.retry'));
    clear(card); card.append(el("h1", s("creators.h1")), el("p.err", {role:'alert'},s("creators.load_error")),retry);
    return () => {};
  }
  const following = new Set((subs && subs.subs) || []);
  if (epoch !== store.epoch() || signal?.aborted) return () => {};
  const kols = (doc && doc.kols) || [];
  for(const c of subs?.creators || [])if(!kols.some(k=>k.id===c.kol_id))kols.push({...c,id:c.kol_id});
  if(linkedSource?.creator&&!kols.some(k=>k.id===linkedSource.creator.id))kols.push(linkedSource.creator);
  const watchRows=Array.isArray(watches)?watches:(watches?.items || watches?.tickers || watches?.watchlist || []);
  const watchedTickers=watchRows.map(t=>typeof t==='string'?t:t?.ticker || t?.symbol).filter(t=>typeof t==='string').map(t=>t.toUpperCase());
  let analysis=subs?.analysis || {},setupCleanup=()=>{},showSetup=!following.size&&initial.tab==='feed'&&!initial.ticker&&!initial.watched&&!initial.post,disposed=false,notice='',refreshing=false;
  const setupState={};
  const pending=()=>Object.values(analysis).some(x=>['queued','running'].includes(x.status));
  const progress=progressPoll({active:()=>!disposed&&epoch===store.epoch()&&root.isConnected&&pending(),read:()=>api.kol.mine(),
    onValue:next=>{
      const changed=JSON.stringify(analysis)!==JSON.stringify(next.analysis||{});
      const ready=Object.entries(next.analysis||{}).find(([id,x])=>x.status==='ready'&&analysis[id]?.status!=='ready');
      const completed=Object.entries(analysis).some(([id,x])=>['queued','running'].includes(x.status)&&!['queued','running'].includes(next.analysis?.[id]?.status));
      analysis=next.analysis||{};
      if(ready){notice=s('creatorflow.analysis_complete',{name:kols.find(k=>k.id===ready[0])?.name||next.creators?.find(k=>k.kol_id===ready[0])?.name||''});}
      if(completed)refresh({automatic:true});else if(changed)renderContent();
    },onError:()=>{const node=card.querySelector('.creator-sync-note');if(node)node.textContent=s('creatorflow.reconnecting');}});
  const posts = (doc && doc.posts) || [];
  if(linkedSource?.post){const i=posts.findIndex(p=>p.kol_id===initial.selected&&p.platform_post_id===initial.post);if(i<0)posts.push(linkedSource.post);else posts[i]=linkedSource.post;}
  let focusedPost=initial.post,focusedPoint=initial.point;
  let archive = false;
  // Legacy stock-entry URLs must not hide creators. A stock can still locate a
  // particular selected creator's research claim, after their identity is selected.
  let mine = initial.mine, watched=false, stockTicker=initial.selected&&initial.tab==='research'?initial.ticker:'';
  let query = "";
  let selected=kols.some(k=>k.id===initial.selected)?initial.selected:'', tab=initial.tab, shown=30;
  const labState={demo:initial.demo}, histories={}, archiveOpen=new Set();
  const pageProgress=progressPoll({interval:30000,active:()=>!disposed&&store.isPro()&&epoch===store.epoch()&&root.isConnected&&!!selected&&tab==='feed',
    read:()=>api.get('/kol/'+encodeURIComponent(selected)+'/page'),
    onValue:page=>{if(page.kol_id!==selected)return;const old=doc.pages?.[selected];if(page.content_hash===old?.content_hash&&page.status===old?.status)return;
      doc.pages={...(doc.pages||{}),[selected]:page};renderContent();}});
  render();progress.schedule();

  function render() {
    setupCleanup();clear(card);
    card.append(el('div.evidence-page-head',el('div',el("h1", s("creators.h1")), el("p.muted", s("creators.sub"))),
      el('span')));

    const actions=el('div.evidence-controls.creator-page-actions',el('button.btn.btn-primary.btn-sm',{type:'button',onclick:()=>{mine=false;selected='';tab='feed';render();card.querySelector('[role=combobox]')?.focus();}},s('creatorflow.add')),
      el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:refresh},s('creatorflow.refresh')));
    card.querySelector('.evidence-page-head').append(actions);
    if(notice)card.append(el('p.creator-follow-success',{role:'status'},notice));
    if(pending())card.append(el('p.creator-sync-note.small.muted',{role:'status'},s('creatorflow.analysis_auto')));
    const isPro = store.isPro();
    if (!isPro) {
      const banner = el("div.cr-pro-banner",
        el("span.cr-pro-badge", s("creators.pro_badge")),
        el("span", " " + s("creators.pro_hint") + " "),
        el("a.btn.btn-primary.btn-sm", { href: "#/billing" }, s("creators.upgrade")));
      card.appendChild(banner);
    }

    const controls = el("div.creators-controls");
    for (const [value,key] of [['following',"creators.mine"],['discover',"creators.discover"]]) {
      controls.appendChild(el("button.btn.btn-ghost.btn-sm", {type:"button",'data-creator-scope':value, "aria-pressed":String(value==='following'?mine:!mine), onclick:()=>{mine=value==='following';stockTicker='';selected='';query='';setupState.input='';setupState.doc=null;shown=30;render();}},s(key)));
    }
    card.appendChild(controls);
    const search=el('div.creator-person-search');controls.append(search);
    setupCleanup=mountSetup(search,{onFollow:followed,state:setupState,compact:true,restore:!mine&&!selected&&tab==='feed',onQuery:value=>{
      query=value.trim();mine=false;selected='';stockTicker='';tab='feed';shown=30;renderContent();
    }});
    card.appendChild(el("div.creators-content"));
    renderContent();
  }

  function renderContent() {
    if(focusedPost&&(selected!==initial.selected||tab!=='feed')){focusedPost='';focusedPoint='';linkFailed=false;}
    if(selected&&!kols.some(k=>k.id===selected))selected='';
    syncRoute();pageProgress.schedule();
    const content = card.querySelector(".creators-content");
    clear(content);
    const outerControls=card.querySelector('.creators-controls');
    outerControls.style.display=tab==='rank'||(selected&&tab==='feed')?'none':'';
    outerControls.querySelector('.creator-person-search').hidden=tab!=='feed'||mine;
    for(const button of outerControls.querySelectorAll('[data-creator-scope]'))button.setAttribute('aria-pressed',String(button.dataset.creatorScope==='following'?mine:!mine));
    card.querySelector('.evidence-page-head').hidden=!!selected&&tab==='feed';
    card.querySelector('.creator-page-actions').hidden=!!selected&&tab==='feed';
    const isPro = store.isPro();
    const stockFilter=selected&&tab==='research'&&stockTicker?[stockTicker]:null;
    const stockPosts=posts.filter(p=>matchesStocks(p,stockFilter));
    const available=kols.filter(k=>(!mine || following.has(k.id)));
    const tabs=el('nav.creator-workspace-tabs',{'aria-label':s('creatorflow.workspace')});
    for(const [value,key] of [['feed','creators.feed_h'],['research','creators.research'],['lab','creatorlab.tab'],['rank','creatorrank.tab']])tabs.append(el('button',{type:'button','aria-pressed':String(tab===value),onclick:()=>{tab=value;renderContent();}},s(key)));
    content.append(tabs);
    if(tab!=='rank'&&stockFilter){
      content.append(el('p.muted.small',s('creatorstocks.coverage')));
      if(stockTicker)content.append(el('p.creator-stock-context',el('b','$'+stockTicker+' '),el('a',{href:'#/chart/'+stockTicker},s('creators.chart')), ' · ', el('a',{href:'#/boards?ticker='+stockTicker},s('creatorstocks.radar'))));
    }
    if(tab!=='feed'){
      if(tab!=='rank'){
        const selector=el('select.input',{'aria-label':s('creatorflow.creator')},el('option',{value:'',selected:!selected},s('creatorflow.all_creators')),...available.map(k=>el('option',{value:k.id,selected:selected===k.id},k.name)));
        selector.addEventListener('change',()=>{selected=selector.value;renderContent();});content.append(el('div.evidence-controls',selector));
      }
      const target=el('section.creator-workspace');content.append(target);
      if(tab==='research')mountResearch(target,{kolId:selected,query,tickers:stockFilter,allowedIds:mine?[...following]:null});
      if(tab==='lab')mountSimulation(target,{kolId:selected,tickers:stockFilter,allowedIds:mine?[...following]:null,state:labState,onStateChange:syncRoute});
      if(tab==='rank')mountLeaderboard(target,{onSelect:id=>{selected=id;mine=false;watched=false;stockTicker='';tab='research';render();}});
      return;
    }
    const stats=stockPosts.filter(p=>(!mine || following.has(p.kol_id)) && (!selected || p.kol_id===selected));

    const grid = el("div.creator-directory");
    for (const k of (selected?[]:available).filter(k=>!query || [k.name,k.handle,k.profile?.title].join(' ').toLowerCase().includes(query.toLowerCase()))) {
      const on = following.has(k.id);
      const profile=k.profile || {};
      const tile=el('article.creator-profile',{class:selected===k.id?'selected':''});
      const title=el('button.creator-name',{type:'button','aria-pressed':String(selected===k.id),onclick:()=>{selected=k.id;query='';setupState.input='';shown=30;render();}},k.name || k.id);
      tile.append(el('div.creator-identity',avatar(k),el('div',title,el('p.muted.small',(profile.handle || k.handle || '')+' · '+(k.platform==='youtube'?'YouTube':k.platform || '')+' · '+(k.lang || '—')))));
      const creatorPosts=posts.filter(p=>p.kol_id===k.id);
      const page=doc.pages?.[k.id];
      const ready=page?.coverage?.reviewed ?? creatorPosts.filter(hasReviewedSummary).length;
      tile.append(el('p.creator-card-coverage',s('creatorpage.card_ready',{n:ready})));
      const newest=[...creatorPosts].sort((a,b)=>(Date.parse(b.published_at)||0)-(Date.parse(a.published_at)||0))[0];
      if(discoveredSource(newest))tile.append(el('p.data-notice.small',s('creators.new_source_pending',{date:String(newest.published_at||'').slice(0,10)})));
      const highlight=[...(page?.highlights || [])].sort((a,b)=>(Date.parse(b.published_at)||0)-(Date.parse(a.published_at)||0))[0];
      if(highlight)tile.append(el('p.creator-card-gist',conciseSummary(highlight.summary,isZh)));
      else tile.append(el('p.small.muted',s(page?.backfill?'creatorpage.preparing':'creatorpage.no_summary')));
      const label = isPro ? (on ? s("creators.following") : s("creators.follow")) : s("creators.follow");
      const chip = el("button.cr-chip" + (on && isPro ? ".on" : ""), { type: "button",'aria-label':label+' '+k.name }, label);
      chip.addEventListener("click", () => { if (isPro) {if(on)toggle(k.id,chip);else confirmCreator({...k,recent:creatorPosts.slice(0,3)},()=>api.kol.sub(k.id),followed,()=>!disposed&&epoch===store.epoch());} else router.go("#/billing"); });
      tile.append(chip);grid.append(tile);
    }
    if (!selected && mine) content.append(el('details.creator-directory-picker',el('summary',s('creators.directory_short')),grid));
    else content.appendChild(grid);
    // Search is for people, not the subset that happens to have reviewed stock posts.
    // The same visible input searches the shared directory and submits a channel lookup.
    if(query&&!selected)return;


    if(selected){
      const creator=kols.find(k=>k.id===selected);
      content.append(el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>{selected='';renderContent();}},'← '+s('creatorpage.all')));
      content.append(el('header.creator-selected-heading',el('h1',creator.name)));
      const overview=el('section.creator-page');content.append(el('details.creator-overview',el('summary',s('creators.overview_short')),overview));
      renderCreatorPage(overview,{creator,page:doc.pages?.[selected]||{},tickers:stockFilter,onTab:value=>{tab=value;renderContent();}});
    }
    const feedContent=selected?el('details.creator-video-archive',{open:true},el('summary',s('creators.latest'))):el('section.creator-recent-feed');
    if(selected){const kid=selected;feedContent.addEventListener('toggle',()=>{if(feedContent.open){archiveOpen.add(kid);}else archiveOpen.delete(kid);});}
    content.append(feedContent);
    const archiveBtn = el("button.btn.btn-ghost.btn-sm", { type: "button", "aria-pressed": String(archive), onclick: () => { archive = !archive; render(); } }, s(archive ? "creators.only_grounded" : "creators.show_archive"));
    if(!selected)feedContent.append(el('header.creator-feed-heading',el('h2.creator-latest-title',s('creators.latest')),archiveBtn));
    else feedContent.appendChild(archiveBtn);
    if(selected&&!histories[selected])feedContent.append(el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>loadHistory(selected)},s('creatorpage.all_videos',{n:doc.pages?.[selected]?.coverage?.indexed ?? stats.length})));
    if (mine && !following.size) {feedContent.appendChild(empty(s("creators.no_following")));feedContent.append(el('button.btn.btn-ghost',{type:'button',onclick:()=>{mine=false;render();}},s('creators.discover')));return;}
    const history=selected?histories[selected]:null;
    if(history?.loading)feedContent.append(el('p.small.muted',{role:'status'},s('common.loading')));
    if(history?.error)feedContent.append(el('p.err',s('creators.load_error')));
    if(history&&!history.loading&&(history.error||history.next_cursor))feedContent.append(el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>loadHistory(selected)},s(history.error?'creatorflow.refresh':'creators.load_more')));
    if(focusedPost){
      feedContent.append(el('p.small.muted',{role:'status'},s(linkFailed?'evidence.source_unavailable':'evidence.source_located')),
        el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>{focusedPost='';focusedPoint='';linkFailed=false;renderContent();}},s('evidence.creator_all_posts')));
    }
    const candidates=focusedPost?posts.filter(p=>p.kol_id===initial.selected&&p.platform_post_id===focusedPost):(history?.items||posts);
    const visiblePosts = filterPosts(candidates, {following,mine:focusedPost?false:mine,archive:archive||!!focusedPost,query:'',tickers:null}).filter(p=>!selected || p.kol_id===selected);
    if (!visiblePosts.length) { feedContent.appendChild(empty(s("creators.feed_empty"))); return; }
    const feed = el("div.cr-feed");
    for (const p of visiblePosts.slice(0, history?.items?visiblePosts.length:shown)) {
      const grounded = hasGroundedCalls(p);
      const reviewed = hasReviewedSummary(p);
      const meta = evidenceMeta(p);
      const points=verifiedSpans(p);
      const art = el("article.cr-post");
      if(focusedPost)art.classList.add('is-focused-source');
      const head = el("div.cr-post-head",el("b.cr-who", (p.kol_name || p.kol_id || "")));
      const identities=tickerViews(p);
      const shownTickers=new Set(identities.map(row=>row.ticker));
      for(const ticker of reviewed?taggedTickers(p):[])if(!shownTickers.has(ticker))identities.push({ticker,stance:'neutral'});
      const badges=el('div.creator-ticker-views');
      for(const row of identities){
        const label='$'+row.ticker+(['bull','bear'].includes(row.stance)?' '+s('creators.take_'+row.stance):row.stance==='mixed'?' '+s('creators.mixed_views'):'');
        const link=evidenceLink(row.ticker,row.pointId||'');link.textContent=label;
        link.classList.add('cr-take',TAKE_CLS[row.stance]||'cr-neutral');badges.append(link);
      }
      if(identities.length)head.append(badges);
      else head.append(el('span.cr-take.cr-neutral',s(reviewed?'creators.summary_ready':'creators.unverified')));
      art.appendChild(head);
      const matched=identities.map(row=>row.ticker).filter(t=>watchedTickers.includes(t));
      if(matched.length)art.append(el('p.creator-watch-match.small',s('creatorstocks.matched')+' ',...matched.flatMap((t,i)=>[i?' · ':'',el('a.mono',{href:'#/chart/'+t},'$'+t)])));
      art.appendChild(el("time.muted.small", { datetime: p.published_at || "" }, s("creators.published") + " " + videoDate(p.published_at,isZh ? "zh-CN" : "en-US")));
      const source=meta.source || {};
      const sourceFacts=el('div.creator-source-facts');
      if(source.duration_seconds) sourceFacts.append(el('span',s('creators.duration')+' '+Math.floor(source.duration_seconds/60)+':'+String(source.duration_seconds%60).padStart(2,'0')));
      if(source.caption_language) sourceFacts.append(el('span',source.caption_language+' · '+s(source.caption_source==='local_asr'?'creatorclaim.local_asr':source.caption_generated?'creators.auto_captions':'creators.manual_captions')));
      if(Number.isFinite(source.caption_coverage_pct)) sourceFacts.append(el('span',s('creators.coverage',{n:source.caption_coverage_pct})));

      if (p.title) art.appendChild(el("h3.cr-video-title", {title:p.title}, previewTitle(p.title)));
      if (reviewed || points.length) {
        if(meta.source?.corrections?.length)art.appendChild(el('p.small',s('creatorclaim.corrected')));
        const sections = meta.source?.sections || [];
        const fullSummary = reviewed?(pickSummary(p.summary,isZh) || pickSummary(sections[0],isZh)):'';
        art.appendChild(el("p.cr-sum", conciseSummary(fullSummary,isZh)));
        const detail = el("details.cr-sections",el("summary",s("creators.read_summary")),el("p.cr-attribution.muted.small", s("creators.attribution", { name: p.kol_name || p.kol_id || "—" })),el("p",fullSummary));
        if(focusedPost)detail.open=true;
        const spans=spanSection(points,null,focusedPoint,{inline:true});if(spans)detail.append(spans);
        if (grounded && legacyCalls(p).length) detail.append(callChips(legacyCalls(p),isZh,p.url,p.kol_id));
        if (reviewed && sections.length) {

          for (const section of sections) detail.appendChild(el("div", safeSource(p.url)?el("a", {href:atTime(p.url,section.start_seconds),target:"_blank",rel:"noopener noreferrer"}, `${Math.floor(section.start_seconds/60)}:${String(Math.floor(section.start_seconds)%60).padStart(2,"0")} ↗`):null, el("p", pickSummary(section,isZh))));
        }
        art.appendChild(detail);
      } else {
        const status = meta.source?.status;
        const statusKey = {discovered:'source_pending',too_long:'too_long',too_dense:'too_dense',processing:'review_pending',review_unavailable:'review_pending',model_unavailable:'review_pending',source_unavailable:'source_pending',asr_unavailable:'source_pending',asr_timeout:'source_pending'}[status] || 'archive_hint';
        art.appendChild(el("p.muted.small", discoveredSource(p)?s('creators.new_source_pending',{date:String(p.published_at||'').slice(0,10)}):s('creators.'+statusKey)));
      }

      if(focusedPost&&focusedPoint&&!p.reviewed_spans?.some(v=>v.point_id===focusedPoint))art.append(el('p.data-notice',s('evidence.point_changed')));
      const audit=el('details.creator-audit',el('summary',s('creators.source_details')),
        el('p.muted.small',s('creators.first_seen')+' '+dateTime(p.first_seen_at)),
        el('p.muted.small',s('creators.analysis_updated')+' '+dateTime(p.fetched_at)));
      if(p.title)audit.append(el('p.creator-original-title',p.title));
      audit.append(sourceFacts);(art.querySelector(".cr-sections") || art).append(audit);
      const actions=el('div.evidence-controls.creator-page-actions');
      if (safeSource(p.url)) actions.appendChild(el("a.cr-orig", { href: p.url, target: "_blank", rel: "noopener noreferrer" }, s("creators.orig") + " ↗"));
      if(grounded) actions.append(el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>{selected=p.kol_id;tab='research';renderContent();}},s('creators.research')),el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>{selected=p.kol_id;tab='lab';renderContent();}},s('creatorlab.tab')));
      art.append(actions);
      feed.appendChild(art);
    }
    feedContent.appendChild(feed);
    if(focusedPost)requestAnimationFrame(()=>{
      if(disposed||!root.isConnected)return;
      const target=[...feed.querySelectorAll('[data-point-id]')].find(n=>n.dataset.pointId===focusedPoint)||feed.querySelector('.cr-post');
      target?.scrollIntoView({block:'center',behavior:'instant'});
      if(target?.hasAttribute('tabindex'))target.focus({preventScroll:true});
    });
    if(!history?.items&&visiblePosts.length>shown) feedContent.append(el('button.btn.btn-ghost',{type:'button',onclick:()=>{shown+=30;renderContent();}},s('creators.load_more')));
    feedContent.append(el('p.muted.small',s('creators.feed_limit',{n:history?.items?.length ?? posts.length})));
  }

  async function loadHistory(kid){
    const old=histories[kid]||{};if(old.loading)return;
    histories[kid]={...old,loading:true,error:false};renderContent();
    try{const data=await api.get('/kol/'+encodeURIComponent(kid)+'/history'+(old.next_cursor?'?before='+old.next_cursor:''));
      if(disposed||epoch!==store.epoch())return;
      const merged=new Map([...(old.items||[]),...(data.items||[])].map(p=>[p.id,p]));
      histories[kid]={items:[...merged.values()],next_cursor:data.next_cursor,loading:false};
    }catch{if(!disposed&&epoch===store.epoch())histories[kid]={...old,loading:false,error:true};}
    if(!disposed&&selected===kid&&epoch===store.epoch())renderContent();
  }

  function syncRoute() {
    if(!disposed&&epoch===store.epoch()&&location.hash.split('?')[0]==='#/creators') {
      const target=creatorTarget({tab,mine,watched,ticker:stockTicker,selected,demo:labState.demo,post:focusedPost,point:focusedPoint});
      if(location.hash!==target)history.replaceState(null,'',location.pathname+location.search+target);
      document.querySelectorAll('[data-lang-toggle], [data-lang-toggle-footer]').forEach(link=>link.setAttribute('href',link.getAttribute('href').split('#')[0]+target));
    }
  }

  async function toggle(id, chip) {
    chip.disabled = true;
    const on = following.has(id);
    try {
      if (on) { await api.kol.unsub(id); following.delete(id); }
      else { await api.kol.sub(id); following.add(id); }
      render();
    } catch (err) { toast(s("common.error", { msg: err.message }), "err"); }
    finally { chip.disabled = false; }
  }

  function followed(response){
    if(response?.subscribed!==true){toast(s('creatorflow.follow_error'),'err');return;}
    const name=response.creator?.name||kols.find(k=>k.id===response.kol_id)?.name||'';
    notice=s(response.already_following?'creatorflow.already_added':'creatorflow.added',{name});
    following.add(response.kol_id);selected=response.kol_id;mine=true;showSetup=false;tab='feed';query='';setupState.input='';
    if(response.creator&&!kols.some(k=>k.id===response.kol_id))kols.push({...response.creator,id:response.kol_id});
    if(response.analysis)analysis[response.kol_id]=response.analysis;
    render();progress.schedule();
  }
  async function refresh({automatic=false}={}){
    if(refreshing)return;refreshing=true;
    try{const [feed,mineDoc]=await Promise.all([api.kol.feed(),api.kol.mine()]);
      if(disposed||epoch!==store.epoch())return;
      doc=feed;posts.splice(0,posts.length,...(feed.posts||[]));kols.splice(0,kols.length,...(feed.kols||[]));
      for(const c of mineDoc.creators||[])if(!kols.some(k=>k.id===c.kol_id))kols.push({...c,id:c.kol_id});
      analysis=mineDoc.analysis||{};following.clear();for(const id of mineDoc.subs||[])following.add(id);render();progress.schedule();
    }catch{if(!disposed&&!automatic)toast(s('creators.load_error'),'err');}finally{refreshing=false;}
  }
  return () => {disposed=true;progress.stop();pageProgress.stop();setupCleanup();document.querySelector('dialog.creator-confirm')?.remove();};
}
