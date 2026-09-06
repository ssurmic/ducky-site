// A shared historical snapshot; the browser only filters completed months.
import { s } from './strings.js';
import { el, clear } from './ui.js';

export function observations(data, month, midterm = false, after = false) {
  const years = [...new Set((data.rows || []).map(row => row.year))].sort((a,b) => a-b);
  return years.flatMap(year => {
    if (midterm && year % 4 !== 2) return [];
    const rows = data.rows.filter(r => r.year === year && (after ? r.month > month : r.month === month));
    const needed = after ? 12 - month : 1;
    // A partial year/month never masquerades as a completed holding window.
    if (!needed || rows.length !== needed || new Set(rows.map(r=>r.month)).size !== needed) return [];
    if (rows.some(r => ['SPY','QQQ'].some(t => !Number.isFinite(r[t]?.return_pct)))) return [];
    const result = { year };
    for (const ticker of ['SPY','QQQ']) result[ticker] = (rows.reduce((nav,r)=>nav*(1+r[ticker].return_pct/100),1)-1)*100;
    return [result];
  });
}
export function stats(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a,b)=>a-b), n = values.length;
  return { n, mean: values.reduce((a,b)=>a+b,0)/n, median: (sorted[Math.floor((n-1)/2)]+sorted[Math.floor(n/2)])/2,
    positive: values.filter(v=>v>0).length, worst: sorted[0], best: sorted[n-1] };
}
const pct = value => (value > 0 ? '+' : '') + value.toFixed(1) + '%';

export function renderSeasonality(root, data, initialMonth = new Date().getMonth()+1) {
  clear(root);
  let month = initialMonth, midterm = false, after = false;
  const isZh = document.documentElement.lang.startsWith('zh');
  const monthName = m => new Intl.DateTimeFormat(isZh?'zh-CN':'en-US',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2000,m-1,1)));
  root.append(el('h2',s('season.title')),el('p.muted',s('season.intro')));
  if (new Date().getFullYear() === 2026) {
    const macro=el('details.season-macro',el('summary',s('season.macro_title')),el('p.small',s('season.macro_intro')));
    const dates=el('ul');
    for(const [date,key,href] of [
      ['2026-09-15 → 09-16','fomc','https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'],
      ['2026-10-27 → 10-28','fomc','https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'],
      ['2026-11-03','election','https://www.fec.gov/help-candidates-and-committees/filing-reports/election-cycle-aggregation/'],
      ['2026-12-08 → 12-09','fomc','https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm']]) {
      dates.append(el('li',el('span.mono',date),el('a',{href,target:'_blank',rel:'noopener'},s('season.'+key)+' ↗')));
    }
    macro.append(dates,el('p.muted.small',s('season.macro_source')));root.append(macro);
  }
  const label = el('label.season-month',{for:'season-month'});
  const slider = el('input.season-slider',{type:'range',id:'season-month',min:1,max:12,step:1,value:month});
  const scale = el('div.season-scale',el('span',monthName(1)),el('span',monthName(12)));
  const controls = el('div.season-controls');
  const cycle = el('button.btn.btn-ghost.btn-sm',{type:'button','aria-pressed':'false'},s('season.midterm'));
  const period = el('select',{'aria-label':s('season.window')},el('option',{value:'month'},s('season.month_only')),el('option',{value:'after'},s('season.after')));
  controls.append(cycle,el('label',s('season.window')+' ',period));
  const status = el('p.muted.small',{'role':'status'}), results=el('div');
  root.append(label,slider,scale,controls,status,results);
  function update() {
    label.textContent = s('season.month',{month:monthName(month)});
    slider.setAttribute('aria-valuetext',monthName(month));
    cycle.setAttribute('aria-pressed',String(midterm));
    const rows = observations(data,month,midterm,after);
    status.textContent = s('season.sample',{n:rows.length,from:rows[0]?.year||'—',to:rows.at(-1)?.year||'—'})+' · '+s('season.asof',{date:data.as_of});
    clear(results);
    if (!rows.length) {results.append(el('p.data-notice',s('season.empty')));return;}
    const metrics = el('div.season-metrics');
    for(const ticker of ['SPY','QQQ']) {
      const st=stats(rows.map(r=>r[ticker]));
      metrics.append(el('article',el('b',ticker),el('strong.mono',pct(st.mean)),el('span.muted.small',s('season.mean')),
        el('p.small',s('season.stats',{median:pct(st.median),up:st.positive,n:st.n})),
        el('p.muted.small',s('season.range',{min:pct(st.worst),max:pct(st.best)}))));
    }
    results.append(metrics,el('p.small.muted',s('season.chart_hint')));
    const chart=el('div.season-bars',{tabindex:0,role:'region','aria-label':s('season.chart')});
    chart.addEventListener('keydown',event=>{
      if(event.key==='Home'||event.key==='End') {event.preventDefault();chart.scrollLeft=event.key==='Home'?0:chart.scrollWidth;}
    });
    const maximum=Math.max(1,...rows.flatMap(r=>[Math.abs(r.SPY),Math.abs(r.QQQ)]));
    for(const row of rows) {
      const column=el('div.season-year',{'aria-label':`${row.year} · SPY ${pct(row.SPY)} · QQQ ${pct(row.QQQ)}`});
      const pair=el('div.season-pair',{'aria-hidden':'true'});
      for(const ticker of ['SPY','QQQ']) {
        const track=el('div.season-track');
        const bar=el('i.season-bar.'+ticker.toLowerCase());
        bar.style.height=(Math.abs(row[ticker])/maximum*64)+'px';
        bar.style[row[ticker]<0?'top':'bottom']='50%';
        track.append(bar);pair.append(track);
      }
      column.append(pair,el('b.mono',row.year),el('span.season-spy.mono',pct(row.SPY)),el('span.season-qqq.mono',pct(row.QQQ)));
      chart.append(column);
    }
    const nav=el('div.season-chart-nav',
      el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>chart.scrollBy({left:-chart.clientWidth*.8})},'← '+s('season.older')),
      el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>chart.scrollBy({left:chart.clientWidth*.8})},s('season.newer')+' →'));
    results.append(el('div.season-legend',el('span.season-spy','● SPY'),el('span.season-qqq','● QQQ'),el('span.muted','0% '+s('season.zero'))),nav,chart);
    const table=el('table.season-table',el('caption',s('season.exact')),
      el('thead',el('tr',el('th',{scope:'col'},s('season.year')),el('th',{scope:'col'},'SPY'),el('th',{scope:'col'},'QQQ'))));
    const body=el('tbody');for(const row of rows)body.append(el('tr',el('th',{scope:'row'},row.year),el('td.mono',pct(row.SPY)),el('td.mono',pct(row.QQQ))));
    table.append(body);results.append(el('details.season-details',el('summary',s('season.table')),table));
  }
  slider.addEventListener('input',()=>{month=Number(slider.value);update();});
  cycle.addEventListener('click',()=>{midterm=!midterm;update();});
  period.addEventListener('change',()=>{after=period.value==='after';update();});
  const method=el('details.season-details',el('summary',s('season.method')),el('p.small.muted',s('season.method_body')),
    el('p.small.muted',s('season.limit')),
    el('a',{href:'https://finance.yahoo.com/quote/SPY/history/',target:'_blank',rel:'noopener'},'SPY · Yahoo Finance ↗'),
    el('span',' · '),el('a',{href:'https://finance.yahoo.com/quote/QQQ/history/',target:'_blank',rel:'noopener'},'QQQ · Yahoo Finance ↗'));
  root.append(method);
  update();
}

let cached;
export function mountSeasonality(root) {
  let disposed=false;
  root.append(el('p.muted.small',s('season.loading')));
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),10000);
  (async () => {try {
    const response=cached?null:await fetch('/seasonality.json',{signal:controller.signal,cache:'no-cache'});
    if(response && !response.ok)throw new Error('unavailable');
    const data=cached || await response.json();
    if(data.version!=='monthly-etf-v1'||!Array.isArray(data.rows)||!data.rows.length)throw new Error('invalid');
    cached=data;
    if(!disposed)renderSeasonality(root,data);
  } catch {
    if(!disposed){clear(root);root.append(el('p.data-notice',s('season.unavailable')));}
  } finally {clearTimeout(timer);}})();
  return ()=>{disposed=true;controller.abort();clearTimeout(timer);};
}
