import {tourEvent,tourTarget} from '../tour-events.js';
import {discoveryPreview} from './creator-discovery.js';
import {creatorStarters} from './creator-starters.js';
import {quotaNote} from '../experience.js';
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
import {progressPoll,renderProgress} from './creator-progress.js';
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
    chip.append(el('a.btn.btn-ghost.btn-sm',{href:creatorTarget({tab:'research',selected:kolId,ticker:c.sym,point:c.point_id||c.claim_id,mine:false})},s('creatorclaim.price_title')));
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
  const sourceOnly=!!(initial.post&&initial.selected&&initial.tab==='feed');
  let doc, subs, watches,linkedSource=null,linkFailed=false;
  let discovery={items:[],status:'unavailable'},discoveryStance='all',discoveryRequest=0,directoryLimit=6,discoveryTimer=null,discoveryController=null;
  try {
    if(sourceOnly){
      // An exact source should not depend on loading the whole recent catalogue.
      [linkedSource,subs,watches]=await Promise.all([
        api.get('/kol/'+encodeURIComponent(initial.selected)+'/posts/'+encodeURIComponent(initial.post),{signal,silent402:true}),
        api.kol.mine(),api.watchlist.list().catch(()=>null)]);
      if(!linkedSource?.creator||!linkedSource?.post)throw Error('source_unavailable');
      doc={kols:[],posts:[],pages:{}};
    }else [doc, subs, watches, discovery] = await Promise.all([api.kol.feed(), api.kol.mine(), api.watchlist.list().catch(()=>null),
      api.get('/kol/discover?lang='+(isZh?'zh':'en'),{signal}).catch(()=>({items:[],status:'unavailable'}))]);
    if(!sourceOnly&&initial.post&&initial.selected){
      try{linkedSource=await api.get('/kol/'+encodeURIComponent(initial.selected)+'/posts/'+encodeURIComponent(initial.post));}
      catch{linkFailed=true;}
    }
  } catch (e) {
    if (epoch !== store.epoch() || signal?.aborted) return () => {};
    if(sourceOnly&&e.status===402){
      clear(card);card.append(el('h1',s('creators.h1')),el('div.cr-pro-banner',
        el('span.cr-pro-badge',s('creators.pro_badge')),el('span',s('experience.creator_hint')),
        el('a.btn.btn-primary.btn-sm',{href:'#/billing'},s('creators.upgrade'))));
      return () => {};
    }
    const retry=el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>{
      if(retry.disabled || !root.isConnected || epoch!==store.epoch() || signal?.aborted)return;
      retry.disabled=true;router.go(location.hash);
    }},s('common.retry'));
    clear(card); card.append(el("h1", s("creators.h1")), el("p.err", {role:'alert'},s("creators.load_error")),retry);
    return () => {};
  }
  const following = new Set((subs && subs.subs) || []);
  let starterDiscovery=discovery;
  const starterState={};
  const canRead = id => (sourceOnly&&id===initial.selected&&!!linkedSource?.post) || store.isPro() || [...following].slice(0,subs?.cap ?? 2).includes(id);
  if (epoch !== store.epoch() || signal?.aborted) return () => {};
  const kols = (doc && doc.kols) || [];
  for(const c of subs?.creators || [])if(!kols.some(k=>k.id===c.kol_id))kols.push({...c,id:c.kol_id});
  if(linkedSource?.creator&&!kols.some(k=>k.id===linkedSource.creator.id))kols.push(linkedSource.creator);
  const watchRows=Array.isArray(watches)?watches:(watches?.items || watches?.tickers || watches?.watchlist || []);
  let watchedTickers=watchRows.map(t=>typeof t==='string'?t:t?.ticker || t?.symbol).filter(t=>typeof t==='string').map(t=>t.toUpperCase());
  let analysis=subs?.analysis || {},setupCleanup=()=>{},showSetup=false,disposed=false,notice='',refreshing=false;
  const setupState={};
  const pending=()=>Object.values(analysis).some(x=>['queued','running'].includes(x.status));
  const progress=progressPoll({active:()=>!sourceOnly&&!disposed&&epoch===store.epoch()&&root.isConnected&&pending(),read:()=>api.kol.mine(),
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
  // Explicit stock links retain their ticker; discovery can also use current watchlist symbols.
  // A channel lookup is independent from these read-only content filters.
  let stockTicker=initial.watched?'':initial.ticker;
  let mine = stockTicker?false:initial.mine, watched=false;
  let query = "", discoveryScope=watchedTickers.length?'watchlist':'all';
  mergeDiscovery();
  let selected=kols.some(k=>k.id===initial.selected)?initial.selected:'', tab=initial.tab, shown=30;
  const labState={demo:initial.demo}, histories={}, archiveOpen=new Set();
  const pageProgress=progressPoll({interval:30000,active:()=>!sourceOnly&&!disposed&&canRead(selected)&&epoch===store.epoch()&&root.isConnected&&!!selected&&tab==='feed',
    read:()=>api.get('/kol/'+encodeURIComponent(selected)+'/page'),
    onValue:page=>{if(page.kol_id!==selected)return;const old=doc.pages?.[selected];if(page.content_hash===old?.content_hash&&page.status===old?.status)return;
      doc.pages={...(doc.pages||{}),[selected]:page};renderContent();}});
  if(!sourceOnly&&!mine&&!selected&&(stockTicker||discoveryScope==='watchlist'))await loadDiscovery(false);
  if(disposed||epoch!==store.epoch()||signal?.aborted)return ()=>{};
  mergeDiscovery();render();progress.schedule();

  function render() {
    setupCleanup();clear(card);
    card.append(el('div.evidence-page-head',el('div',el("h1", s("creators.h1")), el("p.muted", s("creators.sub"))),
      el('span')));

    const actions=el('div.evidence-controls.creator-page-actions',el('button.btn.btn-primary.btn-sm',{type:'button',onclick:()=>{mine=false;selected='';tab='feed';showSetup=!showSetup;render();loadDiscovery();if(showSetup)card.querySelector('[role=combobox]')?.focus();}},s('creatorflow.add')),
      el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:refresh},s('creatorflow.refresh')));
    card.querySelector('.evidence-page-head').append(actions);
    if(!store.isPro()&&Number.isFinite(subs?.cap))card.append(quotaNote("creators",following.size,subs.cap));
    if(notice)card.append(el('p.creator-follow-success',{role:'status'},notice));
    if(pending())card.append(el('p.creator-sync-note.small.muted',{role:'status'},s('creatorflow.analysis_auto')));
    const isPro = store.isPro();
    if (!isPro) {
      const banner = el("div.cr-pro-banner",
        el("span.cr-pro-badge", s("experience.plan_free")),
        el("span", " " + s("experience.creator_hint") + " "),
        el("a.btn.btn-primary.btn-sm", { href: "#/billing" }, s("creators.upgrade")));
      card.appendChild(banner);
    }

    card.append(el('div.creator-starters-host'));
    const controls = el("div.creators-controls");
    for (const [value,key] of [['following',"creators.mine"],['discover',"creators.discover"]]) {
      controls.appendChild(el("button.btn.btn-ghost.btn-sm", {type:"button",'data-creator-scope':value, "aria-pressed":String(value==='following'?mine:!mine), onclick:()=>{mine=value==='following';stockTicker='';selected='';query='';showSetup=false;shown=30;render();if(!mine)loadDiscovery();}},s(key)));
    }
    card.appendChild(controls);
    const search=el('div.creator-person-search');controls.append(search);
    const field=el('input.input',{type:'search',maxlength:100,value:query,
      'aria-label':s('creatordiscovery.search'),placeholder:s('creatordiscovery.search'),autocomplete:'off'});
    const form=el('form.creator-discovery-search',field,el('button.btn.btn-ghost',{type:'submit'},s('creatordiscovery.search_button')));
    field.addEventListener('input',()=>{query=field.value.trim();directoryLimit=6;queueDiscovery();});
    form.addEventListener('submit',e=>{e.preventDefault();query=field.value.trim();loadDiscovery();});
    search.append(form);
    if(showSetup){
      const setup=el('div.creator-add-panel',el('div.creator-add-heading',el('h2',s('creatorflow.add')),
        el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>{showSetup=false;render();}},s('common.close'))));
      card.append(setup);
      setupCleanup=mountSetup(setup,{onFollow:followed,state:setupState,compact:true,restore:true});
    }
    card.appendChild(el("div.creators-content"));
    renderContent();
  }

  function renderContent() {
    // Leaving the focused source mounts the normal workspace and its full data.
    // Never present this one-post response as a complete directory or history.
    if(sourceOnly&&(!focusedPost||selected!==initial.selected||tab!=='feed')){
      router.go(creatorTarget({tab,mine,selected,ticker:stockTicker,demo:labState.demo}));return;
    }
    if(focusedPost&&(selected!==initial.selected||tab!=='feed')){focusedPost='';focusedPoint='';linkFailed=false;}
    if(selected&&!kols.some(k=>k.id===selected))selected='';
    syncRoute();pageProgress.schedule();
    const content = card.querySelector(".creators-content");
    clear(content);
    const startersHost=card.querySelector('.creator-starters-host');clear(startersHost);
    if(!sourceOnly&&tab==='feed'&&!selected&&!query&&!stockTicker&&!showSetup&&(!mine||!following.size)){
      const starters=creatorStarters(mine?starterDiscovery:discovery,{following,state:starterState,onFollow:async(creator,button,view)=>{
        if(button.disabled||disposed||epoch!==store.epoch()||signal?.aborted)return;
        button.disabled=true;
        try{const response=await api.kol.sub(creator.id);
          if(!disposed&&epoch===store.epoch()&&!signal?.aborted){
            followed(response);
            // The selected source can be older than the bounded global feed.
            // A successful follow opens the very view that made this creator eligible.
            if(response?.subscribed===true)router.go(creatorTarget({tab:'feed',mine:false,
              selected:creator.id,post:view.post_id,point:view.point_id}));
          }
        }catch{if(!disposed&&epoch===store.epoch())toast(s('creatorflow.follow_error'),'err');}
        finally{button.disabled=false;}
      }});
      if(starters)startersHost.append(starters);
    }
    const outerControls=card.querySelector('.creators-controls');
    outerControls.style.display=tab==='rank'||(selected&&tab==='feed')?'none':'';
    outerControls.querySelector('.creator-person-search').hidden=tab!=='feed'||mine;
    for(const button of outerControls.querySelectorAll('[data-creator-scope]'))button.setAttribute('aria-pressed',String(button.dataset.creatorScope==='following'?mine:!mine));
    card.querySelector('.evidence-page-head').hidden=!!selected&&tab==='feed';
    card.querySelector('.creator-page-actions').hidden=!!selected&&tab==='feed';
    const isPro = store.isPro();
    const stockFilter=tab!=='rank'&&stockTicker?[stockTicker]:null;
    const stockPosts=posts.filter(p=>matchesStocks(p,stockFilter));
    const previews=new Map((discovery.items||[]).filter(r=>r.creator?.id).map(r=>[r.creator.id,r]));
    const available=mine?kols.filter(k=>following.has(k.id)):tab==='feed'&&!selected?(discovery.items||[]).map(r=>r.creator).filter(k=>k?.id):[...kols];
    if(!mine)available.sort((a,b)=>(Date.parse(previews.get(b.id)?.latest_view?.published_at)||0)-(Date.parse(previews.get(a.id)?.latest_view?.published_at)||0));
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
      if(tab==='research')mountResearch(target,{kolId:selected,query,tickers:stockFilter,following:mine,allowedIds:mine?[...following]:null,point:initial.tab==='research'?initial.point:''});
      if(tab==='lab')mountSimulation(target,{kolId:selected,tickers:stockFilter,allowedIds:mine?[...following]:null,state:labState,onStateChange:syncRoute});
      if(tab==='rank')mountLeaderboard(target,{onSelect:id=>{selected=id;mine=false;watched=false;stockTicker='';tab='research';render();}});
      return;
    }
    const stats=stockPosts.filter(p=>(!mine || following.has(p.kol_id)) && (!selected || p.kol_id===selected));

    if(!mine&&!selected){
      const filter=el('select.input',{'aria-label':s('creatordiscovery.filter')},
        ...['all','support','counter'].map(value=>el('option',{value,selected:value===discoveryStance},s('creatordiscovery.'+value))));
      filter.addEventListener('change',()=>{discoveryStance=filter.value;directoryLimit=6;loadDiscovery();});
      const scope=el('select.input',{'aria-label':s('creatordiscovery.scope')},
        ...(stockTicker?[el('option',{value:'stock',selected:true},'$'+stockTicker)]:[]),
        el('option',{value:'watchlist',selected:!stockTicker&&discoveryScope==='watchlist'},s('creatordiscovery.watchlist')),
        el('option',{value:'all',selected:!stockTicker&&discoveryScope==='all'},s('creatordiscovery.everyone')));
      scope.addEventListener('change',()=>{if(scope.value!=='stock'){stockTicker='';discoveryScope=scope.value;}directoryLimit=6;loadDiscovery();});
      content.append(el('div.creator-discovery-controls',
        el('label',el('span',s('creatordiscovery.scope')),scope),
        el('label',el('span',s('creatordiscovery.filter')),filter)),el('p.creator-discovery-basis',s('creatordiscovery.basis')));
      if(discovery.coverage?.truncated||discovery.coverage?.scan_limited)content.append(el('p.small.muted',s('creatordiscovery.result_limit')));
    }
    const grid = el("div.creator-directory");
    if(!mine)grid.classList.add('creator-discovery-directory');
    const directory=selected?[]:available;
    for (const k of mine?directory:directory.slice(0,directoryLimit)) {
      const entry=previews.get(k.id);
      if(!mine&&discoveryStance!=='all'&&!entry?.latest_view)continue;
      const on = following.has(k.id);
      const profile=k.profile || {};
      const tile=el('article.creator-profile',{class:selected===k.id?'selected':''});
      const title=el('button.creator-name',{type:'button','aria-pressed':String(selected===k.id),onclick:()=>{selected=k.id;query='';showSetup=false;setupState.input='';shown=30;render();}},k.name || k.id);
      tile.append(el('div.creator-identity',avatar(k),el('div',title,el('p.muted.small',[
        profile.handle || k.handle,k.platform==='youtube'?'YouTube':k.platform,
        k.lang==='en'?'English':k.lang==='zh'?'中文':s('creatordiscovery.language_unknown')].filter(Boolean).join(' · ')))));
      const creatorPosts=posts.filter(p=>p.kol_id===k.id);
      const page=doc.pages?.[k.id];
      const ready=page?.coverage?.reviewed ?? (creatorPosts.length?creatorPosts.filter(hasReviewedSummary).length:null);
      if(!mine)tile.append(discoveryPreview(entry,discovery.status));
      const coverageText=!canRead(k.id)?s(on?'experience.creator_outside_trial':'experience.not_followed_data'):
        ready!==null?s('creatorpage.card_ready',{n:ready}):entry?.latest_view?s('creatorstart.eyebrow'):'';
      const metadata=el('div.creator-profile-meta',coverageText?el('p.creator-card-coverage',coverageText):null);
      const newest=[...creatorPosts].sort((a,b)=>(Date.parse(b.published_at)||0)-(Date.parse(a.published_at)||0))[0];
      if(discoveredSource(newest))metadata.append(el('p.creator-profile-pending',s('creators.new_source_pending',{date:String(newest.published_at||'').slice(0,10)})));
      const highlight=[...(page?.highlights || [])].sort((a,b)=>(Date.parse(b.published_at)||0)-(Date.parse(a.published_at)||0))[0];
      if(highlight&&mine)tile.append(el('p.creator-card-gist',conciseSummary(highlight.summary,isZh)));
      else if(canRead(k.id)&&mine)tile.append(el('p.small.muted',s(page?.backfill?'creatorpage.preparing':'creatorpage.no_summary')));
      const label = on ? s("creators.following") : s("creators.follow");
      const chip = el("button.cr-chip" + (on ? ".on" : ""), { type: "button",'aria-label':label+' '+k.name }, label);
      chip.addEventListener("click", () => { if(on)toggle(k.id,chip);else confirmCreator({...k,recent:creatorPosts.slice(0,3)},()=>api.kol.sub(k.id),followed,()=>!disposed&&epoch===store.epoch()); });
      tile.append(el('footer.creator-profile-footer',metadata,chip));grid.append(tile);
    }
    if (!selected && mine) content.append(el('details.creator-directory-picker',el('summary',s('creators.directory_short')),grid));
    else content.appendChild(grid);
    if(!mine&&!selected&&directory.length>directoryLimit)content.append(el('button.btn.btn-ghost.creator-directory-more',
      {type:'button',onclick:()=>{directoryLimit+=6;renderContent();}},s('creatorstart.more',{n:directory.length-directoryLimit})));
    if(!selected&&!mine&&!grid.childElementCount){
      const message=discovery.status==='loading'?'common.loading':discovery.status==='empty_watchlist'?'creatordiscovery.empty_watchlist':discovery.status==='unavailable'?'creatordiscovery.unavailable':'creatordiscovery.no_match';
      content.append(el('p.empty',{role:'status'},s(message)));
      if(discovery.status==='unavailable')content.append(el('button.btn.btn-ghost',{type:'button',onclick:()=>loadDiscovery()},s('common.retry')));
    }
    // Discovery results come from the shared index, including authors outside the recent feed.
    if(!selected&&!mine&&!stockTicker)return;
    if(query&&!selected)return;


    if(selected){
      const creator=kols.find(k=>k.id===selected);
      content.append(el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>{selected='';renderContent();if(!mine)loadDiscovery();}},'← '+s('creatorpage.all')));
      content.append(el('header.creator-selected-heading',el('h1',creator.name)));
      if(!canRead(selected)){
        content.append(el('div.card',el('p',s(following.has(selected)?'experience.creator_outside_trial':'experience.follow_to_read')),
          following.has(selected)?el('button.btn.btn-ghost',{type:'button',onclick:event=>toggle(selected,event.currentTarget)},s('creators.following')):
          el('button.btn.btn-primary',{type:'button',onclick:()=>confirmCreator(creator,()=>api.kol.sub(selected),followed,()=>!disposed&&epoch===store.epoch())},s('creators.follow'))));
        return;
      }
      if(!sourceOnly){
        const delivery=renderProgress(analysis[selected]?.progress);if(delivery)content.append(delivery);
        const overview=el('section.creator-page');content.append(el('details.creator-overview',el('summary',s('creators.overview_short')),overview));
        renderCreatorPage(overview,{creator,page:doc.pages?.[selected]||{},tickers:stockFilter,onTab:value=>{tab=value;renderContent();}});
      }
    }
    const feedContent=selected?el('details.creator-video-archive',{open:true},el('summary',s('creators.latest'))):el('section.creator-recent-feed');
    if(selected){const kid=selected;feedContent.addEventListener('toggle',()=>{if(feedContent.open){archiveOpen.add(kid);}else archiveOpen.delete(kid);});}
    content.append(feedContent);
    const archiveBtn = el("button.btn.btn-ghost.btn-sm", { type: "button", "aria-pressed": String(archive), onclick: () => { archive = !archive; render(); } }, s(archive ? "creators.only_grounded" : "creators.show_archive"));
    if(!selected)feedContent.append(el('header.creator-feed-heading',el('h2.creator-latest-title',s('creators.latest')),archiveBtn));
    else feedContent.appendChild(archiveBtn);
    if(selected&&!focusedPost&&!histories[selected])feedContent.append(el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>loadHistory(selected)},s('creatorpage.video_archive')));
    if (mine && !following.size) {feedContent.appendChild(empty(s("creators.no_following")));feedContent.append(el('button.btn.btn-ghost',{type:'button',onclick:()=>{mine=false;render();loadDiscovery();}},s('creators.discover')));return;}
    const history=selected?histories[selected]:null;
    if(history?.loading)feedContent.append(el('p.small.muted',{role:'status'},s('common.loading')));
    if(history?.error)feedContent.append(el('p.err',s('creators.load_error')));
    if(history&&!history.loading&&(history.error||history.next_cursor))feedContent.append(el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>loadHistory(selected)},s(history.error?'creatorflow.refresh':'creators.load_more')));
    if(focusedPost){
      feedContent.append(el('p.small.muted',{role:'status'},s(linkFailed?'evidence.source_unavailable':'evidence.source_located')),
        el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>{focusedPost='';focusedPoint='';linkFailed=false;renderContent();}},s('evidence.creator_all_posts')));
    }
    const candidates=focusedPost?posts.filter(p=>p.kol_id===initial.selected&&p.platform_post_id===focusedPost):(history?.items||posts);
    const visiblePosts = filterPosts(candidates, {following,mine:focusedPost?false:mine,archive:archive||!!focusedPost,query:'',tickers:focusedPost?null:stockFilter}).filter(p=>!selected || p.kol_id===selected);
    if (!visiblePosts.length) { feedContent.appendChild(empty(s(!store.isPro()&&!following.size?'experience.follow_to_read':'creators.feed_empty'))); return; }
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
        if(fullSummary)art.appendChild(el("p.cr-sum", conciseSummary(fullSummary,isZh)));
        const detail = el("details.cr-sections",el("summary",s(fullSummary?"creators.read_summary":"creatordiscovery.excerpts")),el("p.cr-attribution.muted.small", s("creators.attribution", { name: p.kol_name || p.kol_id || "—" })),el("p",fullSummary));
        if(focusedPost){detail.open=true;if(fullSummary||points.length)queueMicrotask(()=>{if(detail.isConnected)tourEvent('source',{post:p.platform_post_id,sourceHash:source.source_hash||points[0]?.source_hash});});}
        const spans=spanSection(points,null,focusedPoint,{inline:true,preferredTickers:stockFilter});if(spans)detail.append(spans);
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
      const focusedSeconds=points.find(v=>v.point_id===focusedPoint)?.start_seconds;
      if (safeSource(p.url)) actions.appendChild(el("a.cr-orig", { href: Number.isFinite(focusedSeconds)?atTime(p.url,focusedSeconds):p.url, target: "_blank", rel: "noopener noreferrer",'data-tour':(reviewed||points.length)&&p.platform==='youtube'?'video.open':null,'data-post':p.platform_post_id,onclick:()=>{if(p.platform==='youtube')tourEvent('video',{outcome:'external_link_opened',post:p.platform_post_id,sourceHash:source.source_hash||points[0]?.source_hash});} }, s("creators.orig") + " ↗"));
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
    if(!focusedPost)feedContent.append(el('p.muted.small',s('creators.feed_limit',{n:history?.items?.length ?? posts.length})));
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
      const target=creatorTarget({tab,mine,watched,ticker:stockTicker,selected,demo:labState.demo,post:focusedPost,point:tab==='research'&&initial.tab==='research'?initial.point:focusedPoint});
      if(location.hash!==target)history.replaceState(null,'',location.pathname+location.search+target);
      document.querySelectorAll('[data-lang-toggle], [data-lang-toggle-footer]').forEach(link=>link.setAttribute('href',link.getAttribute('href').split('#')[0]+target));
    }
  }

  async function toggle(id, chip) {
    chip.disabled = true;
    const on = following.has(id);
    try {
      if (on) { await api.kol.unsub(id); following.delete(id); if(!store.isPro()){posts.splice(0,posts.length,...posts.filter(p=>p.kol_id!==id));delete doc.pages?.[id];delete histories[id];if(selected===id)selected='';} }
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
    render();progress.schedule();if(!store.isPro())refresh({automatic:true});
  }
  function mergeDiscovery(){
    for(const entry of discovery.items||[]){const c=entry.creator;if(c?.id&&!kols.some(k=>k.id===c.id))kols.push(c);}
  }
  function queueDiscovery(){
    clearTimeout(discoveryTimer);discoveryRequest++;discoveryController?.abort();
    discovery={items:[],status:'loading'};renderContent();
    discoveryTimer=setTimeout(()=>loadDiscovery(),250);
  }
  async function loadDiscovery(paint=true){
    clearTimeout(discoveryTimer);const request=++discoveryRequest;discoveryController?.abort();
    const ctl=new AbortController();discoveryController=ctl;
    const abort=()=>ctl.abort();signal?.addEventListener('abort',abort,{once:true});
    const params=new URLSearchParams({stance:discoveryStance,lang:isZh?'zh':'en'});
    if(stockTicker)params.set('ticker',stockTicker);
    else if(discoveryScope==='watchlist')params.set('tickers',[...new Set(watchedTickers)].slice(0,100).join(','));
    if(query)params.set('q',query.slice(0,100));
    discovery={items:[],status:'loading'};if(paint)renderContent();
    try{
      const next=!stockTicker&&discoveryScope==='watchlist'&&!watchedTickers.length?{items:[],status:'empty_watchlist'}:
        await api.get('/kol/discover?'+params,{signal:ctl.signal});
      if(disposed||epoch!==store.epoch()||signal?.aborted||request!==discoveryRequest)return;
      discovery=next;mergeDiscovery();
    }catch{
      if(disposed||epoch!==store.epoch()||signal?.aborted||request!==discoveryRequest)return;
      discovery={items:[],status:'unavailable'};
    }finally{signal?.removeEventListener('abort',abort);}
    if(paint)renderContent();
  }
  async function refresh({automatic=false}={}){
    if(sourceOnly){router.go(location.hash);return;}
    if(refreshing)return;refreshing=true;
    try{const [feed,mineDoc,readyDoc,watchDoc]=await Promise.all([api.kol.feed(),api.kol.mine(),
      api.get('/kol/discover?lang='+(isZh?'zh':'en'),{signal}).catch(()=>({items:[],status:'unavailable'})),api.watchlist.list().catch(()=>null)]);
      if(disposed||epoch!==store.epoch())return;
      starterDiscovery=readyDoc;
      if(watchDoc){const rows=Array.isArray(watchDoc)?watchDoc:(watchDoc.items||watchDoc.tickers||watchDoc.watchlist||[]);watchedTickers=rows.map(x=>typeof x==='string'?x:x?.ticker||x?.symbol).filter(x=>typeof x==='string').map(x=>x.toUpperCase());}
      doc=feed;posts.splice(0,posts.length,...(feed.posts||[]));kols.splice(0,kols.length,...(feed.kols||[]));
      for(const c of mineDoc.creators||[])if(!kols.some(k=>k.id===c.kol_id))kols.push({...c,id:c.kol_id});
      analysis=mineDoc.analysis||{};following.clear();for(const id of mineDoc.subs||[])following.add(id);await loadDiscovery(false);if(disposed||epoch!==store.epoch())return;render();progress.schedule();
    }catch{if(!disposed&&!automatic)toast(s('creators.load_error'),'err');}finally{refreshing=false;}
  }
  return () => {disposed=true;clearTimeout(discoveryTimer);discoveryController?.abort();progress.stop();pageProgress.stop();setupCleanup();document.querySelector('dialog.creator-confirm')?.remove();};
}
