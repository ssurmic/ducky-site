// views/creators.js — 财经博主: follow finance creators; Ducky summarises each new video. The creator grid
// has Follow toggles (POST/DELETE /kol/{id}/sub); below it, the recent summary feed. The feed is a RECORD of
// the creator's view (attributed, tickers, bull/bear), never our advice.
import { s } from "../strings.js";
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

const TAKE_CLS = { bull: "cr-bull", bear: "cr-bear", neutral: "cr-neutral" };
const CALL_ARROW = { bull: "▲", bear: "▼", neutral: "•" };

function pickSummary(x, isZh) {
  if (x == null) return "";
  if (typeof x === "object") return isZh ? (x.zh || x.en || "") : (x.en || x.zh || "");
  try { const o = JSON.parse(x); return isZh ? (o.zh || o.en || "") : (o.en || o.zh || ""); } catch (e) { return String(x); }
}

export function evidenceMeta(post) {
  let data = post.summary;
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
function atTime(url, seconds) {
  try { const u = new URL(url); if (!["www.youtube.com", "youtube.com", "youtu.be"].includes(u.hostname) || !Number.isFinite(seconds) || seconds < 0 || seconds > 5400) return url;
    u.searchParams.set("t", String(Math.floor(seconds))); return u.href;
  } catch { return url; }
}
export function filterPosts(posts, { following, mine, archive, query = "", tickers=null }) {
  const needle = query.trim().toLocaleLowerCase();
  return posts.filter(p => (!mine || following.has(p.kol_id)) && matchesStocks(p,tickers) && (archive || hasReviewedSummary(p)) &&
    (!needle || [p.kol_name, p.title, ...(p.tickers || [])].join(" ").toLocaleLowerCase().includes(needle)));
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
    chip.append(el('a.btn.btn-ghost.btn-sm',{href:'#/chart/'+encodeURIComponent(c.sym)},s('creators.chart')));
    chip.append(el('a.btn.btn-ghost.btn-sm',{href:creatorTarget({tab:'research',selected:kolId,ticker:c.sym,mine:false})},s('creatorclaim.price_title')));
    wrap.appendChild(chip);
  }
  return wrap;
}

export async function mount(root, {query:routeQuery=new URLSearchParams()} = {}) {
  const epoch = store.epoch();
  const isZh = (document.documentElement.lang || "zh").slice(0, 2) !== "en";
  const card = el("section.card.creators-view");
  root.appendChild(card);
  card.append(el("h1", s("creators.h1")), el("p.muted", s("creators.sub")));
  card.appendChild(spinner());

  let doc, subs, watches;
  try {
    [doc, subs, watches] = await Promise.all([api.kol.feed(), api.kol.mine(), api.watchlist.list().catch(()=>null)]);
  } catch (e) {
    clear(card); card.append(el("h1", s("creators.h1")), el("p.err", s("creators.load_error")));
    return () => {};
  }
  const following = new Set((subs && subs.subs) || []);
  if (epoch !== store.epoch()) return () => {};
  const kols = (doc && doc.kols) || [];
  for(const c of subs?.creators || [])if(!kols.some(k=>k.id===c.kol_id))kols.push({...c,id:c.kol_id});
  const initial=creatorRoute(routeQuery);
  const watchRows=Array.isArray(watches)?watches:(watches?.items || watches?.tickers || watches?.watchlist || []);
  const watchedTickers=watchRows.map(t=>typeof t==='string'?t:t?.ticker || t?.symbol).filter(t=>typeof t==='string').map(t=>t.toUpperCase());
  let analysis=subs?.analysis || {},setupCleanup=()=>{},showSetup=!following.size&&initial.tab==='feed'&&!initial.ticker&&!initial.watched,disposed=false,notice='',refreshing=false;
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
  let archive = false;
  let mine = initial.ticker ? false : initial.mine, watched=initial.watched, stockTicker=initial.ticker;
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

    const actions=el('div.evidence-controls.creator-page-actions',el('button.btn.btn-primary.btn-sm',{type:'button','aria-expanded':String(showSetup),onclick:()=>{showSetup=!showSetup;render();}},s('creatorflow.add')),
      el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:refresh},s('creatorflow.refresh')));
    card.append(actions);
    if(notice)card.append(el('p.creator-follow-success',{role:'status'},notice));
    if(pending())card.append(el('p.creator-sync-note.small.muted',{role:'status'},s('creatorflow.analysis_auto')));
    if(showSetup){const setup=el('div');card.append(setup);setupCleanup=mountSetup(setup,{onFollow:followed,state:setupState});}
    const isPro = store.isPro();
    if (!isPro) {
      const banner = el("div.cr-pro-banner",
        el("span.cr-pro-badge", s("creators.pro_badge")),
        el("span", " " + s("creators.pro_hint") + " "),
        el("a.btn.btn-primary.btn-sm", { href: "#/billing" }, s("creators.upgrade")));
      card.appendChild(banner);
    }

    const controls = el("div.creators-controls");
    for (const [value,key] of [['following',"creators.mine"],['watchlist','creatorstocks.watchlist'],['discover',"creators.discover"]]) {
      controls.appendChild(el("button.btn.btn-ghost.btn-sm", {type:"button", "aria-pressed":String(value==='watchlist'?watched:value==='following'?mine:!mine&&!watched), onclick:()=>{mine=value==='following';watched=value==='watchlist';if(watched)showSetup=false;stockTicker='';selected='';shown=30;render();}},s(key)));
    }
    const stock=el('input.input.mono',{type:'search',value:stockTicker,maxlength:10,placeholder:s('creatorstocks.placeholder'),'aria-label':s('creatorstocks.label')});
    const stockForm=el('form.creator-stock-filter',el('label',el('span.small',s('creatorstocks.label')),stock),el('button.btn.btn-ghost.btn-sm',{type:'submit'},s('creatorstocks.apply')));
    stockForm.addEventListener('submit',e=>{e.preventDefault();const value=stock.value.trim().replace(/^\$/,'').toUpperCase();if(value&&!/^[A-Z][A-Z0-9.-]{0,9}$/.test(value)){toast(s('creatorstocks.invalid'),'err');return;}stockTicker=value;mine=false;watched=false;showSetup=false;selected='';shown=30;render();});
    const search=el("input.input", {type:"search",value:query,"aria-label":s("creators.search"),placeholder:s("creators.search")});
    search.addEventListener("input",()=>{query=search.value;shown=30;renderContent();});
    controls.append(search,stockForm);card.appendChild(controls);
    card.appendChild(el("div.creators-content"));
    renderContent();
  }

  function renderContent() {
    if(selected&&!kols.some(k=>k.id===selected))selected='';
    syncRoute();pageProgress.schedule();
    const content = card.querySelector(".creators-content");
    clear(content);
    const outerControls=card.querySelector('.creators-controls');
    outerControls.style.display=tab==='rank'||(selected&&tab==='feed')?'none':'';
    outerControls.querySelector('input').style.display=tab==='lab'?'none':'';
    card.querySelector('.evidence-page-head').hidden=!!selected&&tab==='feed';
    card.querySelector('.creator-page-actions').hidden=!!selected&&tab==='feed';
    const isPro = store.isPro();
    const stockFilter=stockTicker?[stockTicker]:watched?watchedTickers:null;
    const stockPosts=posts.filter(p=>matchesStocks(p,stockFilter));
    const available=kols.filter(k=>(!mine || following.has(k.id))&&(!stockFilter||stockPosts.some(p=>p.kol_id===k.id)));
    const tabs=el('nav.creator-workspace-tabs',{'aria-label':s('creatorflow.workspace')});
    for(const [value,key] of [['feed','creators.feed_h'],['research','creators.research'],['lab','creatorlab.tab'],['rank','creatorrank.tab']])tabs.append(el('button',{type:'button','aria-pressed':String(tab===value),onclick:()=>{tab=value;renderContent();}},s(key)));
    content.append(tabs);
    if(tab!=='rank'&&stockFilter){
      content.append(el('p.muted.small',s('creatorstocks.coverage')));
      if(watched&&watches===null)content.append(el('p.err',s('creatorstocks.load_failed')));
      else if(watched&&!watchedTickers.length)content.append(el('p.empty',s('creatorstocks.empty_watchlist')),el('a.btn.btn-ghost.btn-sm',{href:'#/watchlist'},s('creatorstocks.open_watchlist')));
      else if(stockTicker)content.append(el('p.creator-stock-context',el('b','$'+stockTicker+' '),el('a',{href:'#/chart/'+stockTicker},s('creators.chart')), ' · ', el('a',{href:'#/boards?ticker='+stockTicker},s('creatorstocks.radar'))));
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
      const title=el('button.creator-name',{type:'button','aria-pressed':String(selected===k.id),onclick:()=>{selected=selected===k.id?'':k.id;shown=30;renderContent();}},k.name || k.id);
      tile.append(el('div.creator-identity',avatar(k),el('div',title,el('p.muted.small',(profile.handle || k.handle || '')+' · '+(k.platform==='youtube'?'YouTube':k.platform || '')+' · '+(k.lang || '—')))));
      const creatorPosts=posts.filter(p=>p.kol_id===k.id);
      const page=doc.pages?.[k.id];
      const ready=page?.coverage?.reviewed ?? creatorPosts.filter(hasReviewedSummary).length;
      tile.append(el('p.creator-card-coverage',s('creatorpage.card_ready',{n:ready})));
      const highlight=page?.highlights?.[0];
      if(highlight)tile.append(el('p.creator-card-gist',pickSummary(highlight.summary,isZh)));
      else tile.append(el('p.small.muted',s(page?.backfill?'creatorpage.preparing':'creatorpage.no_summary')));
      const label = isPro ? (on ? s("creators.following") : s("creators.follow")) : s("creators.follow");
      const chip = el("button.cr-chip" + (on && isPro ? ".on" : ""), { type: "button",'aria-label':label+' '+k.name }, label);
      chip.addEventListener("click", () => { if (isPro) {if(on)toggle(k.id,chip);else confirmCreator({...k,recent:creatorPosts.slice(0,3)},()=>api.kol.sub(k.id),followed,()=>!disposed&&epoch===store.epoch());} else router.go("#/billing"); });
      tile.append(chip);grid.append(tile);
    }
    content.appendChild(grid);


    if(selected){
      const creator=kols.find(k=>k.id===selected);
      content.append(el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>{selected='';renderContent();}},'← '+s('creatorpage.all')));
      const overview=el('section.creator-page');content.append(overview);
      renderCreatorPage(overview,{creator,page:doc.pages?.[selected]||{},tickers:stockFilter,onTab:value=>{tab=value;renderContent();}});
    }
    const feedContent=selected?el('details.creator-video-archive',{open:archiveOpen.has(selected)},el('summary',s('creatorpage.all_videos',{n:doc.pages?.[selected]?.coverage?.indexed ?? stats.length}))):el('section.creator-recent-feed');
    if(selected){const kid=selected;feedContent.addEventListener('toggle',()=>{if(feedContent.open){archiveOpen.add(kid);if(!histories[kid])loadHistory(kid);}else archiveOpen.delete(kid);});}
    content.append(feedContent);
    const archiveBtn = el("button.btn.btn-ghost.btn-sm", { type: "button", "aria-pressed": String(archive), onclick: () => { archive = !archive; render(); } }, s(archive ? "creators.only_grounded" : "creators.show_archive"));
    feedContent.appendChild(archiveBtn);
    if (mine && !following.size) {feedContent.appendChild(empty(s("creators.no_following")));feedContent.append(el('button.btn.btn-ghost',{type:'button',onclick:()=>{mine=false;render();}},s('creators.discover')));return;}
    const history=selected?histories[selected]:null;
    if(history?.loading)feedContent.append(el('p.small.muted',{role:'status'},s('common.loading')));
    if(history?.error)feedContent.append(el('p.err',s('creators.load_error')));
    if(history&&!history.loading&&(history.error||history.next_cursor))feedContent.append(el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>loadHistory(selected)},s(history.error?'creatorflow.refresh':'creators.load_more')));
    const visiblePosts = filterPosts(history?.items || posts, {following,mine,archive,query,tickers:stockFilter}).filter(p=>!selected || p.kol_id===selected);
    if (!visiblePosts.length) { feedContent.appendChild(empty(s("creators.feed_empty"))); return; }
    const feed = el("div.cr-feed");
    for (const p of visiblePosts.slice(0, history?.items?visiblePosts.length:shown)) {
      const grounded = hasGroundedCalls(p);
      const reviewed = hasReviewedSummary(p);
      const meta = evidenceMeta(p);
      const stance = grounded && ["bull", "bear"].includes(p.take) ? p.take : "neutral";
      const art = el("article.cr-post");
      const head = el("div.cr-post-head",
        el("b.cr-who", (p.kol_name || p.kol_id || "")),
        el("span.cr-take." + TAKE_CLS[stance], grounded ? s("creators.take_" + stance) : s(reviewed ? "creators.summary_ready" : "creators.unverified")));
      if (grounded && p.tickers && p.tickers.length) head.appendChild(el("span.cr-tks.mono", p.tickers.slice(0, 4).map((t) => "$" + t).join(" · ")));
      art.appendChild(head);
      if(stockFilter){const matched=taggedTickers(p).filter(t=>stockFilter.includes(t));art.append(el('p.small',s('creatorstocks.matched')+' ',...matched.flatMap((t,i)=>[i?' · ':'',el('a.mono',{href:'#/chart/'+t},'$'+t)])));}
      art.appendChild(el("time.muted.small", { datetime: p.published_at || "" }, s("creators.published") + " " + videoDate(p.published_at,isZh ? "zh-CN" : "en-US")));
      const source=meta.source || {};
      const sourceFacts=el('div.creator-source-facts');
      if(source.duration_seconds) sourceFacts.append(el('span',s('creators.duration')+' '+Math.floor(source.duration_seconds/60)+':'+String(source.duration_seconds%60).padStart(2,'0')));
      if(source.caption_language) sourceFacts.append(el('span',source.caption_language+' · '+s(source.caption_source==='local_asr'?'creatorclaim.local_asr':source.caption_generated?'creators.auto_captions':'creators.manual_captions')));
      if(Number.isFinite(source.caption_coverage_pct)) sourceFacts.append(el('span',s('creators.coverage',{n:source.caption_coverage_pct})));

      if (p.title) art.appendChild(el("h3.cr-video-title", p.title));
      if (reviewed) {
        art.appendChild(el("p.cr-attribution.muted.small", s("creators.attribution", { name: p.kol_name || p.kol_id || "—" })));
        const sections = meta.source?.sections || [];
        art.appendChild(el("p.cr-sum", pickSummary(sections[0] || p.summary, isZh)));
        if (sections.length) {
          const detail = el("details.cr-sections", el("summary", s("creators.sections")));
          for (const section of sections) detail.appendChild(el("div", safeSource(p.url)?el("a", {href:atTime(p.url,section.start_seconds),target:"_blank",rel:"noopener noreferrer"}, `${Math.floor(section.start_seconds/60)}:${String(section.start_seconds%60).padStart(2,"0")} ↗`):null, el("p", pickSummary(section,isZh))));
          art.appendChild(detail);
        }
      } else {
        const status = meta.source?.status;
        const statusKey = {too_long:'too_long',too_dense:'too_dense',processing:'review_pending',review_unavailable:'review_pending',model_unavailable:'review_pending',source_unavailable:'source_pending',asr_unavailable:'source_pending',asr_timeout:'source_pending'}[status] || 'archive_hint';
        art.appendChild(el("p.muted.small", s('creators.'+statusKey)));
        if(status==='processing')art.append(el('p.small.muted',s('creatorclaim.progress',{done:source.reviewed_chunks||0,total:source.total_chunks||0})));
      }
      if (grounded && p.calls && p.calls.length) art.appendChild(callChips(p.calls, isZh, p.url,p.kol_id));
      const audit=el('details.creator-audit',el('summary',s('creators.source_details')),
        el('p.muted.small',s('creators.first_seen')+' '+dateTime(p.first_seen_at)),
        el('p.muted.small',s('creators.analysis_updated')+' '+dateTime(p.fetched_at)));
      if(source.caption_segments) audit.append(el('p.muted.small',s('creators.caption_scope',{n:source.caption_segments})));
      if(source.source_hash) audit.append(el('code',source.source_hash));
      audit.append(sourceFacts);art.append(audit);
      const actions=el('div.evidence-controls.creator-page-actions');
      if (safeSource(p.url)) actions.appendChild(el("a.cr-orig", { href: p.url, target: "_blank", rel: "noopener noreferrer" }, s("creators.orig") + " ↗"));
      if(grounded) actions.append(el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>{selected=p.kol_id;tab='research';renderContent();}},s('creators.research')),el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>{selected=p.kol_id;tab='lab';renderContent();}},s('creatorlab.tab')));
      art.append(actions);
      feed.appendChild(art);
    }
    feedContent.appendChild(feed);
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
      const target=creatorTarget({tab,mine,watched,ticker:stockTicker,selected,demo:labState.demo});
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
    following.add(response.kol_id);selected=response.kol_id;mine=true;showSetup=false;tab='feed';
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
