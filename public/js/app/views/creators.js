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
  return meta.quality === "grounded" && meta.source?.kind === "transcript" && (post.calls || []).some(c => typeof c.evidence === "string" && c.evidence.length >= 12);
}

export function hasReviewedSummary(post) {
  const m = evidenceMeta(post);
  return hasGroundedCalls(post) || (["short-video-v2","short-video-v3"].includes(m.source?.version) && m.source.status === "ready" && m.source.kind === "transcript" && ["grounded", "no_call"].includes(m.quality));
}
function atTime(url, seconds) {
  try { const u = new URL(url); if (!["www.youtube.com", "youtube.com", "youtu.be"].includes(u.hostname) || !Number.isFinite(seconds) || seconds < 0 || seconds > 1200) return url;
    u.searchParams.set("t", String(Math.floor(seconds))); return u.href;
  } catch { return url; }
}
export function filterPosts(posts, { following, mine, archive, query = "" }) {
  const needle = query.trim().toLocaleLowerCase();
  return posts.filter(p => (!mine || following.has(p.kol_id)) && (archive || hasReviewedSummary(p)) &&
    (!needle || [p.kol_name, p.title, ...(p.tickers || [])].join(" ").toLocaleLowerCase().includes(needle)));
}
export function videoDate(value, lang) {
  if (!value) return s("creators.date_unknown");
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? s("creators.date_unknown") :
    new Intl.DateTimeFormat(lang, {dateStyle:"medium", timeStyle:"short", timeZone:"UTC"}).format(d) + " UTC";
}

function callChips(calls, isZh, url) {
  // per-ticker gist Ducky dug out of the video: $SYM ▲/▼ + the target the CREATOR stated (attributed,
  // never our own) + their one-line point. Compact chips so a promo/title-only video still yields signal.
  const wrap = el("div.cr-calls");
  for (const c of calls.slice(0, 6)) {
    const st = (c.stance === "bull" || c.stance === "bear") ? c.stance : "neutral";
    if (!c.evidence) continue;
    const chip = el("div.cr-call.cr-call-" + st);
    chip.appendChild(el("b.cr-call-sym.mono", "$" + String(c.sym || "").toUpperCase()));
    chip.appendChild(el("span.cr-call-arrow", s("creators.take_" + st)));
    const note = pickSummary(c.note, isZh);
    if (note) chip.appendChild(el("span.cr-call-note", note));
    chip.append(el('p.muted.small',s('creators.stated_horizon')+' '+(c.horizon_text || s('creators.not_stated'))));
    if(c.condition_text) chip.append(el('p.muted.small',s('creators.stated_condition')+' '+c.condition_text));
    chip.appendChild(el("details.cr-evidence", el("summary", s("creators.evidence")), el("blockquote", c.evidence)));
    if (safeSource(url) && Number.isFinite(c.start_seconds)) chip.appendChild(el("a", {href:atTime(url,c.start_seconds),target:"_blank",rel:"noopener noreferrer"}, `${Math.floor(c.start_seconds/60)}:${String(c.start_seconds%60).padStart(2,"0")} ↗`));
    chip.append(el('a.btn.btn-ghost.btn-sm',{href:'#/chart/'+encodeURIComponent(c.sym)},s('creators.chart')));
    wrap.appendChild(chip);
  }
  return wrap;
}

export async function mount(root) {
  const epoch = store.epoch();
  const isZh = (document.documentElement.lang || "zh").slice(0, 2) !== "en";
  const card = el("section.card.creators-view");
  root.appendChild(card);
  card.append(el("h1", s("creators.h1")), el("p.muted", s("creators.sub")));
  card.appendChild(spinner());

  let doc, subs;
  try {
    [doc, subs] = await Promise.all([api.kol.feed(), api.kol.mine()]);
  } catch (e) {
    clear(card); card.append(el("h1", s("creators.h1")), el("p.err", s("creators.load_error")));
    return () => {};
  }
  const following = new Set((subs && subs.subs) || []);
  if (epoch !== store.epoch()) return () => {};
  const kols = (doc && doc.kols) || [];
  for(const c of subs?.creators || [])if(!kols.some(k=>k.id===c.kol_id))kols.push({...c,id:c.kol_id});
  let analysis=subs?.analysis || {},setupCleanup=()=>{},showSetup=!following.size,disposed=false,notice='',refreshing=false;
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
  let mine = true;
  let query = "";
  let selected='', tab='feed', shown=30;
  render();progress.schedule();

  function render() {
    setupCleanup();clear(card);
    card.append(el('div.evidence-page-head',el('div',el("h1", s("creators.h1")), el("p.muted", s("creators.sub"))),
      el('p.muted.small',s('creators.feed_asof')+' '+dateTime(doc.as_of || doc.generated_at))));

    card.append(el('ol.creator-journey',...['creatorflow.journey1','creatorflow.journey2','creatorflow.journey3'].map((key,i)=>el('li',el('span',String(i+1)),s(key)))));
    const actions=el('div.evidence-controls',el('button.btn.btn-primary.btn-sm',{type:'button','aria-expanded':String(showSetup),onclick:()=>{showSetup=!showSetup;render();}},s('creatorflow.add')),
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
    for (const [value,key] of [[true,"creators.mine"],[false,"creators.discover"]]) {
      controls.appendChild(el("button.btn.btn-ghost.btn-sm", {type:"button", "aria-pressed":String(mine===value), onclick:()=>{mine=value;selected='';shown=30;render();}},s(key)));
    }
    const search=el("input.input", {type:"search",value:query,"aria-label":s("creators.search"),placeholder:s("creators.search")});
    search.addEventListener("input",()=>{query=search.value;shown=30;renderContent();});
    controls.appendChild(search);card.appendChild(controls);
    card.appendChild(el("div.creators-content"));
    renderContent();
  }

  function renderContent() {
    const content = card.querySelector(".creators-content");
    clear(content);
    const outerControls=card.querySelector('.creators-controls');
    outerControls.style.display=tab==='rank'?'none':'';
    outerControls.querySelector('input').style.display=tab==='lab'?'none':'';
    const isPro = store.isPro();
    const available=kols.filter(k=>!mine || following.has(k.id));
    const tabs=el('nav.creator-workspace-tabs',{'aria-label':s('creatorflow.workspace')});
    for(const [value,key] of [['feed','creators.feed_h'],['research','creators.research'],['lab','creatorlab.tab'],['rank','creatorrank.tab']])tabs.append(el('button',{type:'button','aria-pressed':String(tab===value),onclick:()=>{tab=value;renderContent();}},s(key)));
    content.append(tabs);
    if(tab!=='feed'){
      if(tab!=='rank'){
        const selector=el('select.input',{'aria-label':s('creatorflow.creator')},el('option',{value:'',selected:!selected},s('creatorflow.all_creators')),...available.map(k=>el('option',{value:k.id,selected:selected===k.id},k.name)));
        selector.addEventListener('change',()=>{selected=selector.value;renderContent();});content.append(el('div.evidence-controls',selector));
      }
      const target=el('section.creator-workspace');content.append(target);
      if(tab==='research')mountResearch(target,{kolId:selected,query,allowedIds:mine?[...following]:null});
      if(tab==='lab')mountSimulation(target,{kolId:selected,allowedIds:mine?[...following]:null});
      if(tab==='rank')mountLeaderboard(target,{onSelect:id=>{selected=id;mine=false;tab='research';render();}});
      return;
    }
    const stats=posts.filter(p=>(!mine || following.has(p.kol_id)) && (!selected || p.kol_id===selected));
    content.append(el('div.evidence-metrics',metric(s('creators.sources'),available.length),
      metric(s('creators.records'),stats.length),metric(s('creators.summary_ready'),stats.filter(hasReviewedSummary).length),
      metric(s('creators.awaiting_source'),stats.filter(p=>!hasReviewedSummary(p)).length)));
    const grid = el("div.creator-directory");
    for (const k of available.filter(k=>!query || [k.name,k.handle,k.profile?.title].join(' ').toLowerCase().includes(query.toLowerCase()))) {
      const on = following.has(k.id);
      const profile=k.profile || {};
      const tile=el('article.creator-profile',{class:selected===k.id?'selected':''});
      const title=el('button.creator-name',{type:'button','aria-pressed':String(selected===k.id),onclick:()=>{selected=selected===k.id?'':k.id;shown=30;renderContent();}},k.name || k.id);
      tile.append(el('div.creator-identity',avatar(k),el('div',title,el('p.muted.small',(profile.handle || k.handle || '')+' · '+(k.platform==='youtube'?'YouTube':k.platform || '')+' · '+(k.lang || '—')))));
      const details=el('details.creator-about',el('summary',s('creators.about')),el('p',profile.description || k.descr || s('creators.profile_pending')));
      if(profile.subscribers) details.append(el('p.muted.small',s('creators.subscriber_count',{n:Number(profile.subscribers).toLocaleString()})));
      if(profile.as_of) details.append(el('p.muted.small',s('creators.profile_asof')+' '+dateTime(profile.as_of)));
      if(safeSource(k.url)) details.append(el('a',{href:k.url,target:'_blank',rel:'noopener noreferrer'},s('creators.channel')+' ↗'));
      tile.append(details);
      const creatorPosts=posts.filter(p=>p.kol_id===k.id);
      tile.append(el('p.creator-card-coverage',s('creatorflow.card_coverage',{ready:creatorPosts.filter(hasReviewedSummary).length,total:creatorPosts.length})));
      if(analysis[k.id])tile.append(el('p.creator-analysis-state',{role:'status'},s('creatorflow.analysis_'+analysis[k.id].status)));

      if(on&&isPro&&['error','needs_review','needs_source','no_recent_content'].includes(analysis[k.id]?.status))tile.append(el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:async e=>{e.target.disabled=true;try{const r=await api.post('/kol/'+encodeURIComponent(k.id)+'/analyze');if(epoch!==store.epoch()||disposed)return;analysis[k.id]=r.analysis;renderContent();progress.schedule();}catch{toast(s('creatorflow.retry_later'),'err');}finally{e.target.disabled=false;}}},s('creatorflow.retry_analysis')));
      const label = isPro ? (on ? s("creators.following") : s("creators.follow")) : s("creators.follow");
      const chip = el("button.cr-chip" + (on && isPro ? ".on" : ""), { type: "button",'aria-label':label+' '+k.name }, label);
      chip.addEventListener("click", () => { if (isPro) {if(on)toggle(k.id,chip);else confirmCreator({...k,recent:creatorPosts.slice(0,3)},()=>api.kol.sub(k.id),followed,()=>!disposed&&epoch===store.epoch());} else router.go("#/billing"); });
      tile.append(chip);grid.append(tile);
    }
    content.appendChild(grid);

    if(!mine) content.append(el('details.creator-x',el('summary',s('creators.x_title')),el('p.muted',s('creators.x_plan'))));
    if(selected)content.append(el('p.creator-selected',s('creatorflow.viewing',{name:kols.find(k=>k.id===selected)?.name || selected}),el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>{selected='';renderContent();}},s('creators.clear_creator'))));
    const archiveBtn = el("button.btn.btn-ghost.btn-sm", { type: "button", "aria-pressed": String(archive), onclick: () => { archive = !archive; render(); } }, s(archive ? "creators.only_grounded" : "creators.show_archive"));
    content.appendChild(archiveBtn);
    if (mine && !following.size) {content.appendChild(empty(s("creators.no_following")));content.append(el('button.btn.btn-ghost',{type:'button',onclick:()=>{mine=false;render();}},s('creators.discover')));return;}
    const visiblePosts = filterPosts(posts, {following,mine,archive,query}).filter(p=>!selected || p.kol_id===selected);
    if (!visiblePosts.length) { content.appendChild(empty(s("creators.feed_empty"))); return; }
    const feed = el("div.cr-feed");
    for (const p of visiblePosts.slice(0, shown)) {
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
      art.appendChild(el("time.muted.small", { datetime: p.published_at || "" }, s("creators.published") + " " + videoDate(p.published_at,isZh ? "zh-CN" : "en-US")));
      const source=meta.source || {};
      const sourceFacts=el('div.creator-source-facts');
      if(source.duration_seconds) sourceFacts.append(el('span',s('creators.duration')+' '+Math.floor(source.duration_seconds/60)+':'+String(source.duration_seconds%60).padStart(2,'0')));
      if(source.caption_language) sourceFacts.append(el('span',source.caption_language+' · '+s(source.caption_generated?'creators.auto_captions':'creators.manual_captions')));
      if(Number.isFinite(source.caption_coverage_pct)) sourceFacts.append(el('span',s('creators.coverage',{n:source.caption_coverage_pct})));
      art.append(sourceFacts);
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
        const statusKey = {too_long:'too_long',too_dense:'too_dense',review_unavailable:'review_pending',model_unavailable:'review_pending',source_unavailable:'source_pending'}[status] || 'archive_hint';
        art.appendChild(el("p.muted.small", s('creators.'+statusKey)));
      }
      if (grounded && p.calls && p.calls.length) art.appendChild(callChips(p.calls, isZh, p.url));
      const audit=el('details.creator-audit',el('summary',s('creators.source_details')),
        el('p.muted.small',s('creators.first_seen')+' '+dateTime(p.first_seen_at)),
        el('p.muted.small',s('creators.analysis_updated')+' '+dateTime(p.fetched_at)));
      if(source.caption_segments) audit.append(el('p.muted.small',s('creators.caption_scope',{n:source.caption_segments})));
      if(source.source_hash) audit.append(el('code',source.source_hash));
      art.append(audit);
      const actions=el('div.evidence-controls');
      if (safeSource(p.url)) actions.appendChild(el("a.cr-orig", { href: p.url, target: "_blank", rel: "noopener noreferrer" }, s("creators.orig") + " ↗"));
      if(grounded) actions.append(el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>{selected=p.kol_id;tab='research';renderContent();}},s('creators.research')),el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>{selected=p.kol_id;tab='lab';renderContent();}},s('creatorlab.tab')));
      art.append(actions);
      feed.appendChild(art);
    }
    content.appendChild(feed);
    if(visiblePosts.length>shown) content.append(el('button.btn.btn-ghost',{type:'button',onclick:()=>{shown+=30;renderContent();}},s('creators.load_more')));
    content.append(el('p.muted.small',s('creators.feed_limit',{n:posts.length})));
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
  return () => {disposed=true;progress.stop();setupCleanup();document.querySelector('dialog.creator-confirm')?.remove();};
}
