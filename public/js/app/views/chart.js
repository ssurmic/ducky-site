import { companyContext } from "../company-context.js";
import { symbolPicker } from "../symbol-picker.js";
// views/chart.js — Lightweight Charts 5 candlesticks from /bars + RSI(14) pane; Pro overlays via overlays.js.
import { s } from "../strings.js";
import * as api from "../api.js";
import * as store from "../store.js";
import * as overlays from "../overlays.js";
import { el, clear, spinner, errorBox, lock, px, num } from "../ui.js";
import { normalizeList } from "./watchlist.js";
import { unpackSnapshot, reusableSnapshot } from "../snapshot-model.js";
import {aggregateBars,selectedSnapshot,optionScope,wallPosition,optionHelp,candleHelp,expiryTable,expiryKind} from '../chart-context.js';
import { observeTheme } from "../theme.js";
import {chartPalette,candleStyle,referenceScale} from '../chart-style.js';

const PERIODS = ["3mo", "6mo", "1y", "2y"];
// server truth (app.py PERIOD_BARS / BARS_PERIOD): free→6mo, paid→1y, pro→2y. Used to gate the period
// buttons to the viewer's tier so the UI can't show '2y' selected over 6mo of clamped data (finding chart.js:364).
const PERIOD_BARS = { "1mo": 22, "3mo": 66, "6mo": 126, "1y": 252, "2y": 504 };
const TICKER_RE = /^[A-Z][A-Z0-9.\-]{0,9}$/;

export function normalizeBars(resp) {
  const arr = Array.isArray(resp) ? resp : (resp && (resp.bars || resp.items)) || [];
  const out = [];
  for (const b of arr) {
    let t = b.t ?? b.time ?? b.date;
    if (typeof t === "number") t = t > 1e12 ? Math.floor(t / 1000) : Math.floor(t);
    else if (typeof t === "string") t = /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : Math.floor(Date.parse(t) / 1000);
    if (t === undefined || t === null || Number.isNaN(t)) continue;
    const o = Number(b.o ?? b.open), h = Number(b.h ?? b.high), l = Number(b.l ?? b.low), c = Number(b.c ?? b.close);
    if ([b.o ?? b.open, b.h ?? b.high, b.l ?? b.low, b.c ?? b.close].some(v => v == null) ||
        [o, h, l, c].some(v => !Number.isFinite(v) || v <= 0)) continue;
    out.push({ time: t, open: o, high: h, low: l, close: c, volume: Number(b.v ?? b.volume ?? 0) });
  }
  out.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
  return out.filter((b, i) => i === 0 || b.time !== out[i - 1].time);
}

// API expected_last_d is the last completed session, not the latest bar date.
// Prefer the producer-bound state: advancing the clock cannot finalize an
// older intraday cache. Legacy rows equal to the last completed session remain
// unverified, since the response does not say when those values were collected.
export function lastBarState(payload, time) {
  let day=time;
  if(typeof time==='number'){
    const date=new Date(time*1000);day=Number.isFinite(date.getTime())?date.toISOString().slice(0,10):'';
  }
  const dateOnly=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'));
  if(!dateOnly(day))return 'unverified';
  if(payload?.last_d===day&&['complete','in_progress','unverified'].includes(payload?.last_bar_state))return payload.last_bar_state;
  const market=/^(\d{4}-\d{2}-\d{2}):(RTH|CLOSED)$/.exec(payload?.market_epoch||'');
  if(market?.[2]==='RTH'&&market[1]===day)return 'in_progress';
  return dateOnly(payload?.expected_last_d)&&day<payload.expected_last_d?'complete':'unverified';
}

export async function mount(root, params) {
  let ticker = (params && params.ticker) || "";
  // finding chart.js:364 — gate periods to the tier the server enforces (me.gates.bars_period).
  const maxPeriod = (((store.get("me") || {}).gates || {}).bars_period) || "6mo";
  const allowed = (p) => PERIOD_BARS[p] <= (PERIOD_BARS[maxPeriod] || PERIOD_BARS["6mo"]);
  // finding chart.js:63 — drawSeq is a per-draw token; candles/rsiSeries are hoisted so a Telegram theme flip
  // can re-apply their colors without a full refetch (finding tg.js:65).
  let period = allowed("6mo") ? "6mo" : maxPeriod, chart = null, ro = null, ovl = null, alive = true, drawSeq = 0, candles = null, rsiSeries = null, macdHist = null, macdLineS = null, macdSig = null;
  let histogram = [], referenceLines = [], overlaySnapshot = null, interval='day', expiry='combined', extras=false, fitReferences=false;
  const barCache=new Map();

  const input = el("input.input.mono", { type: "text", value: ticker, placeholder: s("chart.pick"), autocomplete: "off", autocapitalize: "characters", spellcheck: "false", maxlength: "80", "aria-label": s("chart.pick") });
  const picker = symbolPicker(input);
  const form = el("form.add-row.chart-search", { id:'chart-search',hidden:!!ticker, onsubmit: (e) => { e.preventDefault(); const t = input.value.trim().toUpperCase().replace(/^\$/, ""); if (TICKER_RE.test(t)) location.hash = "#/chart/" + t; } },
    picker.wrap, el("button.btn.btn-primary", { type: "submit" }, s("chart.go")));
  const periodRow = el("div.seg.mono", { role: "group", "aria-label": s("chart.period") },
    PERIODS.map((p) => { const lk = !allowed(p); return el("button", { type: "button", "data-period": p, disabled: lk ? "" : null, "data-locked": lk ? "" : null, "aria-disabled": lk ? "true" : null, 'aria-pressed':String(p===period),'aria-label':s('chart.period_'+p), title: lk ? s("chart.lock") : s('chart.period_'+p), class: p === period ? "on" : "", onclick: lk ? null : () => { period = p; periodRow.querySelectorAll("button").forEach((b) => {b.classList.toggle("on", b.dataset.period === p);b.setAttribute('aria-pressed',String(b.dataset.period===p));}); draw(); } }, s("chart.period_short_" + p) + (lk ? " 🔒" : "")); }));
  const intervalRow=el('div.seg.chart-interval',{role:'group','aria-label':s('chart.interval')},
    ['day','week','month'].map(k=>el('button',{type:'button','data-interval':k,'aria-label':s('chart.'+k),'aria-pressed':String(k===interval),class:k===interval?'on':'',onclick:()=>{
      interval=k;intervalRow.querySelectorAll('button').forEach(b=>{b.classList.toggle('on',b.dataset.interval===k);b.setAttribute('aria-pressed',String(b.dataset.interval===k));});draw();
    }},s('chart.short_'+k))));
  const controls=el('div.chart-controls',el('div.chart-control',el('span.small.muted',s('chart.period')),periodRow),
    el('div.chart-control',el('span.small.muted',s('chart.interval')),intervalRow),
    el('button.chart-help-button.chart-reading-help',{type:'button','aria-label':s('chart.range_help'),onclick:candleHelp},s('chart.guide')));
  const companyName=el('p.chart-company-name.muted.small');
  const changeSymbol=el('button.btn.btn-ghost.chart-change',{type:'button','aria-expanded':'false','aria-controls':'chart-search',onclick:()=>{
    form.hidden=!form.hidden;changeSymbol.setAttribute('aria-expanded',String(!form.hidden));if(!form.hidden)input.focus();
  }},s('chart.change'));
  const head = el("div.view-head.chart-heading", el('div.chart-identity',el("h1", ticker || s("chart.title"))), el("span.spot", { id: "chart-spot" }),ticker?changeSymbol:null,companyName);
  const legendRow = el("div.legend", { id: "chart-legend" });
  const host = el("div.chart-host", { id: "chart-host" });
  const status = el("div", { id: "chart-status" });
  const ohlc=el('div.chart-ohlc',{'aria-label':s('chart.candle_note')});
  const zoomButtons = ['out','in','reset'].map(action=>el('button.btn.btn-ghost.btn-sm',{
    type:'button',disabled:true,'data-chart-zoom':action,'aria-label':s('chart.zoom_'+action),title:s('chart.zoom_'+action),
    onclick:()=>{
      if(!chart)return;
      const scale=chart.timeScale();
      if(action==='reset'){fitReferences=false;paintOverlays();scale.fitContent();chart.applyOptions({rightPriceScale:{autoScale:true}});return;}
      const range=scale.getVisibleLogicalRange();
      if(!range||!Number.isFinite(range.from)||!Number.isFinite(range.to))return;
      const center=(range.from+range.to)/2,span=Math.max(5,Math.min(10000,(range.to-range.from)*(action==='in'?.75:4/3)));
      scale.setVisibleLogicalRange({from:center-span/2,to:center+span/2});
    }
  },action==='in'?'+':action==='out'?'−':s('chart.zoom_reset')));
  const zoomControls=el('div.chart-zoom',{role:'group','aria-label':s('chart.zoom')},zoomButtons);
  const optionControls=el('div.chart-option-controls');
  const optionNotes=el('div.chart-option-notes');
  const wallNotes=el('div.chart-wall-notes');
  const showOptionHelp=()=>{if(overlaySnapshot)optionHelp({...overlaySnapshot,gamma:selectedSnapshot(overlaySnapshot,expiry,true).gamma});};
  const compactLayout=window.matchMedia?.('(max-width: 900px)');
  const referenceDetails=el('details.chart-reference-details',{open:!compactLayout?.matches},
    el('summary',s('chart.reference_details')),wallNotes);
  const references=el('aside.chart-references',{hidden:true,'aria-label':s('chart.reference_levels')},
    el('div.chart-reference-values',el('h2',s('chart.reference_levels')),legendRow),referenceDetails);
  // Resize only changes the disclosure's default; repainting levels preserves
  // the reader's open/closed choice and never reconstructs the chart.
  const onLayout=()=>{referenceDetails.open=!compactLayout.matches;};
  compactLayout?.addEventListener?.('change',onLayout);
  const axes=el('p.chart-axes.small.muted',s('chart.axes'),el('span',s('chart.close_note')));
  const companyHost = el("div.company-host");
  const overlayStatus=el('div.chart-overlay-status');
  const workspace=el('div.chart-workspace',{hidden:!ticker},ohlc,
    el('div.chart-main',host,el('div.chart-tools',axes,zoomControls)),references,
    el('div.chart-reference-settings',optionControls,optionNotes),overlayStatus);
  root.append(head, form, controls, workspace, status, companyHost);
  const showCompany=(p,rs)=>{companyHost.replaceChildren(companyContext(p,rs));companyName.textContent=p?.company||'';};
  if (ticker) api.company(ticker).then(p=>{if(alive) showCompany(p);}).catch(()=>{if(alive) showCompany(null);});
  if (ticker) companyHost.before(el('div.chips',
    el('a.chip',{href:'#/evidence/'+encodeURIComponent(ticker)},s('evidence.title')),
    el('a.chip',{href:'#/creators?ticker='+encodeURIComponent(ticker)},s('watch.creator_mentions')),
    el('a.chip',{href:'#/boards?mode=archive&ticker='+encodeURIComponent(ticker)},s('watch.radar_records')),
    el('a.chip',{href:'#/calendar?ticker='+encodeURIComponent(ticker)},s('nav.calendar'))));

  if (!ticker) {
    host.hidden = true; zoomControls.hidden = true; legendRow.hidden = true; controls.hidden = true; axes.hidden = true;
    const wl = store.get("watchlist") || [];
    const chips = el("div.chips", wl.map((t) => el("a.chip.mono", { href: "#/chart/" + t }, "$" + t)));
    status.append(el("p.muted", s("chart.pick_hint")), chips);
    if (!wl.length) { try { store.set("watchlist", normalizeList(await api.watchlist.list())); clear(chips); for (const t of store.get("watchlist")) chips.appendChild(el("a.chip.mono", { href: "#/chart/" + t }, "$" + t)); } catch (e) { /* ignore */ } }
    return () => { picker.dispose(); alive = false; compactLayout?.removeEventListener?.('change',onLayout); };
  }

  let refreshTimer = null;
  function destroy() { clearTimeout(refreshTimer); refreshTimer = null; if (ovl) { ovl.remove(); ovl = null; } if (ro) { ro.disconnect(); ro = null; } if (chart) { try { chart.remove(); } catch (e) { /* ignore */ } chart = null; } candles = rsiSeries = macdHist = macdLineS = macdSig = null; histogram = []; referenceLines = []; overlaySnapshot = null; clear(host); }

  function paintOverlays() {
    if (!candles || !overlaySnapshot) return;
    const p=chartPalette(),colors = {call:p.amber,put:p.up,flip:p.text,exp:p.blue,band:p.text};
    const focused=optionControls.contains(document.activeElement)?document.activeElement.dataset.chartControl:null;
    if (ovl) ovl.remove();
    const selected=selectedSnapshot(overlaySnapshot,expiry,extras);
    ovl = overlays.apply(candles, selected, colors);
    clear(legendRow);clear(optionControls);clear(optionNotes);clear(wallNotes);
    const entries=overlays.legend(selected,colors);
    references.hidden=!entries.length;workspace.classList.toggle('has-references',!!entries.length);
    clear(overlayStatus);
    const built = new Date(overlaySnapshot.gamma?.scope?.retrieved_at || overlaySnapshot.built_at || '');
    const expirySelect=el('select.input',{'data-chart-control':'expiry','aria-label':s('chart.option_expiry'),onchange:()=>{expiry=expirySelect.value;paintOverlays();}},
      el('option',{value:'combined'},s('chart.combined')),
      (overlaySnapshot.gamma?.by_expiry||[]).map(r=>el('option',{value:r.expiry},r.expiry+' · '+expiryKind(r))));
    expirySelect.value=expiry;
    optionControls.append(el('label',el('span.small.muted',s('chart.option_expiry')),expirySelect),
      el('button.chart-help-button',{type:'button','aria-label':s('chart.help_title'),'aria-haspopup':'dialog',onclick:showOptionHelp},s('chart.guide')),
      el('label.chart-extra-toggle',el('input',{type:'checkbox','data-chart-control':'extras',checked:extras,onchange:e=>{extras=e.target.checked;paintOverlays();}}),s('chart.extra_lines')),
      el('label.chart-extra-toggle',el('input',{type:'checkbox','data-chart-control':'fit',checked:fitReferences,onchange:e=>{fitReferences=e.target.checked;paintOverlays();chart.applyOptions({rightPriceScale:{autoScale:true}});}}),s('chart.fit_references')));
    for (const it of entries) {
      const range=typeof it.value==='string'?it.value.split('–'):[];
      const value=range.length===2?el('b.chart-reference-range',el('span',range[0]+'–'),el('span',range[1])):
        el('b',typeof it.value==='number'?num(it.value,2):String(it.value));
      legendRow.appendChild(el('div.legend-item',el('i',{'aria-hidden':'true',style:{background:it.color}}),
        el('button.chart-reference-label.chart-reference-help',{type:'button',
          'aria-label':s('chart.level_help',{level:it.label}),'aria-haspopup':'dialog',onclick:showOptionHelp},
          el('span',it.label),el('span.chart-question',{'aria-hidden':'true'},'?')),value));
    }
    if (!entries.length) overlayStatus.appendChild(el('span.muted.small',s('chart.no_overlays')));
    wallNotes.append(
      // The header is the last recorded daily bar; wall distances use the
      // separately saved spot. Neither build time nor option retrieval is a
      // quote timestamp, and the snapshot contract does not retain one yet.
      typeof overlaySnapshot.spot==='number'&&Number.isFinite(overlaySnapshot.spot)&&overlaySnapshot.spot>0?
        el('p.small.muted.chart-wall-basis',s('chart.wall_price_basis',{price:px(overlaySnapshot.spot)})):null,
      el('p.chart-wall-position',wallPosition(overlaySnapshot.spot,selected.gamma)));
    optionNotes.append(el('p.small.muted.chart-scale-note',s(fitReferences?'chart.scale_all':'chart.scale_candles')),
      el('p.small.muted.chart-snapshot-date',optionScope(selected)),
      Number.isFinite(built.getTime())?el('p.small.muted',s('chart.snapshot_as_of',{date:built.toISOString().slice(0,16).replace('T',' ')})):null,
      expiryTable(overlaySnapshot,value=>{expiry=value;paintOverlays();}));
    candles.applyOptions({autoscaleInfoProvider:referenceScale(fitReferences,overlays.levels(selected))});
    if(focused)optionControls.querySelector(`[data-chart-control="${focused}"]`)?.focus({preventScroll:true});
  }

  async function draw(attempt = 0) {
    // finding chart.js:63 — take a per-draw token. Rapid period/ticker switches while /bars is slow used to
    // race: each draw passed the lone 'alive' check, each created a chart in the same host (stacked duplicates,
    // leaked ResizeObserver/canvas, and the slower response could win with the WRONG period). Every await below
    // re-checks (my !== drawSeq) and bails, so only the latest draw ever mutates the DOM/chart.
    const my = ++drawSeq;
    destroy();zoomButtons.forEach(b=>b.disabled=true);
    clear(status); clear(legendRow); clear(optionControls); clear(optionNotes); clear(wallNotes); clear(overlayStatus); clear(ohlc);
    references.hidden=true;workspace.classList.remove('has-references');
    status.appendChild(spinner());
    const LWC = window.LightweightCharts;
    if (!LWC) { clear(status); status.appendChild(errorBox(new Error("charts lib missing"))); return; }
    let bars, payload;
    try { payload = attempt===0&&barCache.has(period)?barCache.get(period):await api.bars(ticker, period); if(!api.isAccepted(payload)&&!payload?.stale)barCache.set(period,payload); bars = normalizeBars(payload); }
    catch (err) { if (my !== drawSeq || !alive) return; clear(status); status.appendChild(errorBox(err, draw)); return; }
    if (my !== drawSeq || !alive) return;
    clear(status);
    const retry = () => {
      status.appendChild(el('button.btn.btn-ghost.btn-sm', { type: 'button', onclick: () => draw() }, s('common.retry')));
      if (attempt < 3) refreshTimer = setTimeout(() => { if (alive && my === drawSeq) draw(attempt + 1); }, 5000);
    };
    if (api.isAccepted(payload)) { status.appendChild(el('p.muted', s('common.building'))); retry(); return; }
    if (!bars.length) { status.appendChild(el("p.muted", s("chart.no_bars"))); return; }
    const last=bars[bars.length-1];
    bars=aggregateBars(bars,interval);
    if(bars.length<35)status.append(el('p.small.muted',s('chart.indicators_short')));
    const spot = document.getElementById("chart-spot");
    if (spot) {
      const state=lastBarState(payload,last.time);
      spot.replaceChildren(el('span',px(last.close)),el('time.small.muted',{datetime:String(last.time),title:s('chart.last_bar',{date:String(last.time)})},
        s(state==='complete'?'chart.close_as_of':state==='in_progress'?'chart.bar_in_progress':'chart.bar_completion_unknown',{date:String(last.time)})));
      const recorded=payload?.last_bar_observed_at;
      const stamp=typeof recorded==='string'&&/(Z|[+-]\d{2}:\d{2})$/.test(recorded)?new Date(recorded):null;
      if(payload?.last_d===String(last.time)&&stamp&&Number.isFinite(stamp.getTime()))spot.append(
        el('time.small.muted.chart-bar-recorded',{datetime:stamp.toISOString()},s('chart.bar_recorded_at',{date:stamp.toISOString().slice(0,16).replace('T',' ')})));
    }
    if (payload?.stale) {
      status.appendChild(el('p.data-notice', s('chart.stale_bars', { date: payload.expected_last_d || '—' })));
      retry();
    }

    const palette=chartPalette(),{text,grid,up,down}=palette;
    chart = LWC.createChart(host, {
      autoSize: true,
      layout: { background: { type: "solid", color: "transparent" }, textColor: text,fontFamily:palette.font,fontSize:12, attributionLogo: false, panes: { separatorColor: grid, enableResize: false } },
      grid: { vertLines: { visible:false }, horzLines: { color: grid,style:0 } },
      rightPriceScale: { borderVisible:false,scaleMargins:{top:0.12,bottom:0.08} },
      timeScale: { borderVisible:false, rightOffset: 3, lockVisibleTimeRangeOnResize:true },
      crosshair: { mode: 0,vertLine:{color:text,width:1,style:2,labelBackgroundColor:palette.ink},horzLine:{color:text,width:1,style:2,labelBackgroundColor:palette.ink} },
      handleScroll: { vertTouchDrag: false },
    });
    candles = chart.addSeries(LWC.CandlestickSeries, { ...candleStyle(palette),
      priceLineVisible: true, priceLineWidth: 1,lastValueVisible: true });
    candles.setData(bars);
    const showCandle=(bar,date)=>ohlc.replaceChildren(el('time.small.muted',String(date)),
      el('dl.chart-ohlc-values',['open','high','low','close'].map(key=>el('div',el('dt',s('chart.'+key)),el('dd',px(bar[key]))))));
    showCandle(bars.at(-1),bars.at(-1).time);
    chart.subscribeCrosshairMove?.(param=>{const bar=param.seriesData?.get(candles);showCandle(bar||bars.at(-1),bar?param.time:bars.at(-1).time);});
    // RSI(14) in its own pane
    const rsiData=overlays.rsi(bars,14);
    if(rsiData.length){
      rsiSeries = chart.addSeries(LWC.LineSeries, { color: palette.blue, lineWidth: 2, priceLineVisible: false, lastValueVisible: true, title: s("chart.rsi") }, 1);
      rsiSeries.setData(rsiData);
      referenceLines.push([rsiSeries.createPriceLine({ price: 70, color: down, lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "" }), 'down']);
      referenceLines.push([rsiSeries.createPriceLine({ price: 30, color: up, lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "" }), 'up']);
    }
    // MACD(12,26,9) in its own pane: histogram (green above / red below) + MACD line + signal, zero line marked.
    const m = overlays.macd(bars, 12, 26, 9);
    if (m.macd.length) {
      macdHist = chart.addSeries(LWC.HistogramSeries, { priceLineVisible: false, lastValueVisible: false, priceFormat: { type: "price", precision: 2, minMove: 0.01 } }, 2);
      histogram = m.hist;
      macdHist.setData(histogram.map((p) => ({ time: p.time, value: p.value, color: p.value >= 0 ? palette.histUp : palette.histDown })));
      macdSig = chart.addSeries(LWC.LineSeries, { color: palette.amber, lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, 2);
      macdSig.setData(m.signal);
      macdLineS = chart.addSeries(LWC.LineSeries, { color: palette.blue, lineWidth: 1, priceLineVisible: false, lastValueVisible: true, title: s("chart.macd") }, 2);
      macdLineS.setData(m.macd);
      referenceLines.push([macdLineS.createPriceLine({ price: 0, color: text, lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "" }), 'text']);
    }
    // Size all panes together after creating them; adding MACD must not squeeze RSI.
    chart.panes().forEach((pane,index)=>pane.setStretchFactor([4,1,1][index] || 1));
    chart.timeScale().fitContent();
    zoomButtons.forEach(b=>b.disabled=false);

    // Overlays: Pro only. Free/paid see a lock strip instead.
    if (store.isPro()) {
      overlayStatus.appendChild(spinner(s("chart.loading_snapshot")));
      try {
        const snaps = store.get("snapshots") || {};
        let snap = reusableSnapshot(snaps[ticker]) ? snaps[ticker] : null;
        // finding chart.js:97 — /snapshot wraps data as {ticker, snapshot:{…}} (app.py _snap_payload); unwrap it
        // (same class as the watchlist bug) so the .ok/overlays fields exist and the store isn't poisoned.
        if (!snap) { const r = await api.snapshot(ticker, { tries: 6 }); if (!api.isAccepted(r)) { snap = unpackSnapshot(r); store.patch("snapshots", { [ticker]: snap }); } }
        if (my !== drawSeq || !alive || !chart) return;   // finding chart.js:63 — recheck before applying overlays
        clear(overlayStatus);
        if (snap && snap.ok) {
          if(snap.company_context) showCompany(snap.company_context,snap.rs);
          overlaySnapshot = snap;
          paintOverlays();

        } else overlayStatus.appendChild(el("span.muted.small", s("common.building")));
      } catch (err) { if (my === drawSeq && alive) { clear(overlayStatus); overlayStatus.appendChild(el("span.muted.small", s("common.error", { msg: err.message }))); } }
    } else {
      const fake = el("div.legend-fake.mono", s("chart.overlays"));
      overlayStatus.appendChild(lock(fake, s("chart.lock")));
    }
  }

  // finding tg.js:65 — a Telegram themeChanged repaints CSS vars, but Lightweight-Charts resolved its colors
  // once at draw() via getComputedStyle. Re-apply chart/series colors from freshly read cssVars on the event;
  // the listener is removed in cleanup so it can't outlive the view.
  function retheme() {
    if (!chart) return;
    const palette=chartPalette(),{text,grid}=palette;
    try {
      chart.applyOptions({ layout: { textColor: text,fontFamily:palette.font, panes: { separatorColor: grid } }, grid: { vertLines: { visible:false }, horzLines: { color: grid,style:0 } },crosshair:{vertLine:{color:text,labelBackgroundColor:palette.ink},horzLine:{color:text,labelBackgroundColor:palette.ink}} });
      if (candles) candles.applyOptions(candleStyle(palette));
      if (rsiSeries) rsiSeries.applyOptions({ color: palette.blue });
      if (macdLineS) macdLineS.applyOptions({ color: palette.blue });
      if (macdSig) macdSig.applyOptions({ color: palette.amber });
      if (macdHist) macdHist.setData(histogram.map(p => ({...p,color:p.value >= 0 ? palette.histUp : palette.histDown})));
      for (const [line, variable] of referenceLines) line?.applyOptions({color:palette[variable]});
      paintOverlays();
    } catch (e) { /* ignore */ }
  }
  const stopTheme = observeTheme(retheme);

  await draw();
  document.fonts?.ready.then(()=>{if(alive)retheme();});
  return () => { picker.dispose(); alive = false; compactLayout?.removeEventListener?.('change',onLayout); stopTheme(); destroy(); };
}
