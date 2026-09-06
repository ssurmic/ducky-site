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

// A reading is valid only for the exact complete cohort being displayed.
export function savedReading(data, rows, month, midterm, after) {
  const reading=data.readings?.[`${month}:${Number(midterm)}:${Number(after)}`];
  const signature=rows.map(r=>[r.year,...['SPY','QQQ'].map(t=>r[t].toFixed(6))]);
  return reading?.version==='season-reading-v1' && JSON.stringify(reading.signature)===JSON.stringify(signature) ? reading : null;
}

export function renderSeasonality(root, data, initialMonth = Number(new Intl.DateTimeFormat("en-US",{month:"numeric",timeZone:"America/New_York"}).format(new Date()))) {
  clear(root);
  let month=initialMonth, midterm=false, after=false;
  const isZh=document.documentElement.lang.startsWith('zh');
  const monthName=m=>isZh?`${m}月`:new Intl.DateTimeFormat('en-US',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2000,m-1,1)));
  const move=v=>s(v!==0&&Math.abs(v)<0.05?(v>0?'season.rose_small':'season.fell_small'):(v>0?'season.rose':v<0?'season.fell':'season.flat'), {value:Math.abs(v).toFixed(1)});
  root.append(el('h2',s('season.title')),el('p.muted.small',s('season.intro')));
  const controls=el('div.season-controls');
  const monthSelect=el('select.season-month-select',{id:'season-month','aria-label':s('season.choose_month')});
  for(let m=1;m<=12;m++)monthSelect.append(el('option',{value:m},monthName(m)));
  monthSelect.value=String(month);
  const cycle=el('button.btn.btn-ghost.btn-sm',{type:'button','aria-pressed':'false'},s('season.midterm'));
  const period=el('select.season-window',{'aria-label':s('season.window')},el('option',{value:'month'},s('season.month_only')),el('option',{value:'after'},s('season.after')));
  controls.append(el('label',s('season.choose_month'),monthSelect),el('label',s('season.window'),period),cycle);
  const status=el('p.muted.small',{'role':'status'}),results=el('div');
  root.append(controls,status,results);
  function update() {
    cycle.setAttribute('aria-pressed',String(midterm));
    const rows=observations(data,month,midterm,after);
    const windowName=after?s('season.through_december',{month:monthName(month+1)}):monthName(month);
    status.textContent=s('season.sample',{n:rows.length,from:rows[0]?.year||'—',to:rows.at(-1)?.year||'—'})+' · '+s('season.asof',{date:data.as_of});
    clear(results);
    if(!rows.length){results.append(el('p.data-notice',s('season.empty')));return;}
    const reading=savedReading(data,rows,month,midterm,after);
    const summary=el('div.season-reading',el('h3',s('season.reading_title',{period:windowName})),
      el('p',reading?.summary?.[isZh?'zh':'en']||s('season.reading_fallback')));
    results.append(summary);
    if(midterm)results.append(el('p.small.muted',s('season.midterm_note')));
    const metrics=el('div.season-metrics');
    for(const ticker of ['SPY','QQQ']) {
      const st=stats(rows.map(r=>r[ticker])),down=rows.filter(r=>r[ticker]<0).length,flat=st.n-st.positive-down;
      const worst=rows.find(r=>r[ticker]===st.worst),best=rows.find(r=>r[ticker]===st.best);
      const distribution=el('div.season-distribution',{'aria-hidden':'true'},
        el('i.season-up',{style:{width:(100*st.positive/st.n)+'%'}}),el('i.season-down',{style:{width:(100*down/st.n)+'%'}}),
        el('i.season-flat',{style:{width:(100*flat/st.n)+'%'}}));
      metrics.append(el('article',el('b',s('season.name_'+ticker.toLowerCase())),el('span.muted.small',s('season.average_for',{period:windowName})),
        el('strong',{class:st.mean<0?'neg':'pos'},move(st.mean)),distribution,
        el('p.small',s('season.counts',{n:st.n,up:st.positive,down})+(flat?' · '+s('season.flat_count',{n:flat}):'')),
        el('p.muted.small',s('season.extremes',{worstYear:worst.year,worst:move(st.worst),bestYear:best.year,best:move(st.best)}))));
    }
    results.append(metrics,el('p.season-limit.small.muted',s('season.limit_short')));
    const detail=el('details.season-details',el('summary',s('season.table_count',{n:rows.length})));
    const yearSelect=el('select.season-year-select',{'aria-label':s('season.years')},el('option',{value:'all'},s('season.all_years')));
    const decades=[...new Set(rows.map(r=>Math.floor(r.year/10)*10))].sort((a,b)=>b-a);
    for(const decade of decades)yearSelect.append(el('option',{value:decade},`${decade}–${Math.min(decade+9,rows.at(-1).year)}`));
    const order=el('select.season-order',{'aria-label':s('season.order')},el('option',{value:'new'},s('season.new_first')),el('option',{value:'old'},s('season.old_first')));
    detail.append(el('div.season-year-tools',el('label',s('season.years'),yearSelect),el('label',s('season.order'),order)));
    const table=el('table.season-table',el('caption',s('season.table_period',{period:windowName})),
      el('thead',el('tr',el('th',{scope:'col'},s('season.year')),el('th',{scope:'col'},'SPY'),el('th',{scope:'col'},'QQQ'))));
    const body=el('tbody');table.append(body);detail.append(table);results.append(detail);
    function drawYears(){
      clear(body);
      const visible=rows.filter(r=>yearSelect.value==='all'||Math.floor(r.year/10)*10===Number(yearSelect.value)).slice().sort((a,b)=>order.value==='new'?b.year-a.year:a.year-b.year);
      for(const row of visible)body.append(el('tr.season-year',el('th',{scope:'row'},row.year),...['SPY','QQQ'].map(t=>el('td',{class:row[t]<0?'neg':'pos'},move(row[t])))));
    }
    yearSelect.addEventListener('change',drawYears);order.addEventListener('change',drawYears);drawYears();
    const method=el('details.season-details',el('summary',s('season.method')),el('p.small.muted',s('season.method_body')));
    for(const ticker of ['SPY','QQQ'])method.append(el('p.small.muted',s('season.median_plain',{ticker,period:windowName,value:move(stats(rows.map(r=>r[ticker])).median)})));
    method.append(el('p.small.muted',s('season.limit')),el('a',{href:'/seasonality.json',target:'_blank',rel:'noopener'},s('season.download')),
      el('span',' · '),el('a',{href:'https://finance.yahoo.com/quote/SPY/history/',target:'_blank',rel:'noopener'},'SPY · Yahoo Finance ↗'),
      el('span',' · '),el('a',{href:'https://finance.yahoo.com/quote/QQQ/history/',target:'_blank',rel:'noopener'},'QQQ · Yahoo Finance ↗'));
    results.append(method);
  }
  monthSelect.addEventListener('change',()=>{month=Number(monthSelect.value);update();});
  cycle.addEventListener('click',()=>{midterm=!midterm;update();});
  period.addEventListener('change',()=>{after=period.value==='after';update();});
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
