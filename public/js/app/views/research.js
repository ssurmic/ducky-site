// Shared event comparisons; current research is gated by the API, not CSS.
import { s } from '../strings.js';
import * as api from '../api.js';
import * as store from '../store.js';
import { el, clear, spinner, errorBox, px, pct } from '../ui.js';
import {mountRecord, mountChanges} from './research-record.js';
export async function mount(root, params = {}) {
  const ticker = String(params.ticker || '').toUpperCase();
  const zh = document.documentElement.lang.startsWith('zh');
  const pick = value => typeof value === 'object' && value ? value[zh ? 'zh' : 'en'] || '' : value || '';
  root.append(el('h1', s('research.title')), el('p.view-intro.muted', s('research.intro')));
  if (!store.isPaid()) {
    root.appendChild(el('section.card', el('h2', s('research.lock_title')), el('p', s('research.lock_body')),
      el('a.btn.btn-primary', {href:'#/billing'}, s('research.unlock'))));
    return;
  }
  const input=el('input.input.mono',{value:ticker,'aria-label':s('alerts.ticker_ph'),placeholder:s('alerts.ticker_ph'),maxlength:'10'});
  root.appendChild(el('form.add-row',{onsubmit:e=>{e.preventDefault();const t=input.value.trim().toUpperCase();if(/^[A-Z][A-Z0-9.-]{0,9}$/.test(t))location.hash='#/research/'+t;}},input,el('button.btn.btn-primary',{type:'submit'},s('research.load'))));
  if(!ticker){await mountChanges(root,params.signal);return;}
  root.append(el('p',el('a.btn.btn-ghost.btn-sm',{href:'#/research'},s('record.changes'))));
  await mountRecord(root,ticker,params.signal);
  if(params.signal?.aborted)return;
  const host=el('div');root.appendChild(host);host.appendChild(spinner());
  try {
    const result=await api.get('/research/events/'+encodeURIComponent(ticker),{signal:params.signal});
    if(params.signal?.aborted)return;
    clear(host);
    if(!result.reports?.length){host.appendChild(el('p.data-notice',s('research.empty')));return;}
    for(const report of result.reports){
      const e=report.event, p=report.prices;
      const card=el('article.card.event-review');
      card.append(el('div.event-review-head',el('span.badge.badge-backtest',e.record_mode),el('span.mono','$'+e.ticker+' · '+e.event_date)),el('h2',pick(e.title)),el('p',pick(e.facts)));
      card.appendChild(el('p.muted.small',s('research.message_missing')));
      const grid=el('div.event-price-grid');
      for(const [key,label] of [['before','research.before'],['event','research.event'],['latest','research.latest']]){
        const point=p[key];grid.appendChild(el('div',el('small.muted',s(label)),el('strong.mono',point?px(point.close):'—'),el('time.mono.muted.small',point?.date||s('research.missing'))));
      }
      card.appendChild(grid);
      card.append(el('p',s('research.raw_change')+' '+pct(report.raw_price_change_pct)),el('p.data-notice',s('research.basis')),
        el('p',pick(report.explanation)),el('p.muted.small',s('research.updated')+' '+String(result.built_at||'').replace('T',' ').slice(0,16)+' UTC'));
      const actions=el('div.snap-actions',el('a.btn.btn-ghost.btn-sm',{href:'#/chart/'+e.ticker},s('watch.chart')),el('a.btn.btn-ghost.btn-sm',{href:'#/alerts?ticker='+e.ticker},s('watch.set_alert')));
      // The catalog contains reviewed issuer URLs. Preserve the original-source link.
      if(/^https:\/\//.test(e.source_url))actions.appendChild(el('a.btn.btn-ghost.btn-sm',{href:e.source_url,target:'_blank',rel:'noopener'},s('research.source')));
      card.appendChild(actions);host.appendChild(card);
    }
  }catch(error){if(!params.signal?.aborted){clear(host);host.appendChild(errorBox(error,()=>{clear(root);mount(root,params);}));}}
}
