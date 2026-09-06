// views/creators.js — 财经博主: follow finance creators; Ducky summarises each new video. The creator grid
// has Follow toggles (POST/DELETE /kol/{id}/sub); below it, the recent summary feed. The feed is a RECORD of
// the creator's view (attributed, tickers, bull/bear), never our advice.
import { s } from "../strings.js";
import * as api from "../api.js";
import * as store from "../store.js";
import * as router from "../router.js";
import { el, clear, toast, spinner, empty } from "../ui.js";
import { mountResearch, safeSource, dateTime, metric } from './creator-research.js';

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
  const posts = (doc && doc.posts) || [];
  let archive = false;
  let mine = true;
  let query = "";
  let selected='', tab='feed', shown=30;
  render();

  function render() {
    clear(card);
    card.append(el('div.evidence-page-head',el('div',el("h1", s("creators.h1")), el("p.muted", s("creators.sub"))),
      el('p.muted.small',s('creators.feed_asof')+' '+dateTime(doc.as_of || doc.generated_at))));

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
    const isPro = store.isPro();
    const available=kols.filter(k=>!mine || following.has(k.id));
    const stats=posts.filter(p=>(!mine || following.has(p.kol_id)) && (!selected || p.kol_id===selected));
    content.append(el('div.evidence-metrics',metric(s('creators.sources'),available.length),
      metric(s('creators.records'),stats.length),metric(s('creators.summary_ready'),stats.filter(hasReviewedSummary).length),
      metric(s('creators.awaiting_source'),stats.filter(p=>!hasReviewedSummary(p)).length)));
    const grid = el("div.creator-directory");
    for (const k of available) {
      const on = following.has(k.id);
      const profile=k.profile || {};
      const tile=el('article.creator-profile',{class:selected===k.id?'selected':''});
      const title=el('button.creator-name',{type:'button','aria-pressed':String(selected===k.id),onclick:()=>{selected=selected===k.id?'':k.id;shown=30;renderContent();}},k.name || k.id);
      tile.append(el('div.creator-identity',el('span.creator-monogram',{'aria-hidden':'true'},(k.name || k.id).slice(0,1)),el('div',title,el('p.muted.small',(profile.handle || k.handle || '')+' · '+(k.platform==='youtube'?'YouTube':k.platform || '')+' · '+(k.lang || '—')))));
      const details=el('details.creator-about',el('summary',s('creators.about')),el('p',profile.description || k.descr || s('creators.profile_pending')));
      if(profile.subscribers) details.append(el('p.muted.small',s('creators.subscriber_count',{n:Number(profile.subscribers).toLocaleString()})));
      if(profile.as_of) details.append(el('p.muted.small',s('creators.profile_asof')+' '+dateTime(profile.as_of)));
      if(safeSource(k.url)) details.append(el('a',{href:k.url,target:'_blank',rel:'noopener noreferrer'},s('creators.channel')+' ↗'));
      tile.append(details);
      const label = isPro ? (on ? s("creators.following") : s("creators.follow")) : s("creators.follow");
      const chip = el("button.cr-chip" + (on && isPro ? ".on" : ""), { type: "button",'aria-label':label+' '+k.name }, label);
      chip.addEventListener("click", () => { if (isPro) toggle(k.id, chip); else router.go("#/billing"); });
      tile.append(chip);grid.append(tile);
    }
    content.appendChild(grid);

    if(!mine) content.append(el('details.creator-x',el('summary',s('creators.x_title')),el('p.muted',s('creators.x_plan'))));
    const tabs=el('div.evidence-controls');
    for(const [value,key] of [['feed','creators.feed_h'],['research','creators.research']]) tabs.append(el('button.btn.btn-ghost',{type:'button','aria-pressed':String(tab===value),onclick:()=>{tab=value;renderContent();}},s(key)));
    if(selected) tabs.append(el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>{selected='';renderContent();}},s('creators.clear_creator')));
    content.append(tabs);
    if(tab==='research') {const target=el('section.creator-studies');content.append(target);mountResearch(target,{kolId:selected,query,allowedIds:mine?[...following]:null});return;}
    const archiveBtn = el("button.btn.btn-ghost.btn-sm", { type: "button", "aria-pressed": String(archive), onclick: () => { archive = !archive; render(); } }, s(archive ? "creators.only_grounded" : "creators.show_archive"));
    content.appendChild(archiveBtn);
    if (mine && !following.size) {content.appendChild(empty(s("creators.no_following")));return;}
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
        art.appendChild(el("p.muted.small", s(status === "too_long" ? "creators.too_long" : status === "too_dense" ? "creators.too_dense" : "creators.archive_hint")));
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
      if(grounded) actions.append(el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>{selected=p.kol_id;tab='research';renderContent();}},s('creators.research')));
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

  return () => {};
}
