import {el,clear} from './ui.js';
import {s} from './strings.js';
import * as api from './api.js';
import * as store from './store.js';

const NS='http://www.w3.org/2000/svg';
const MODES=['beta','components','stocks','yields'];
const OK=v=>typeof v==='number'&&Number.isFinite(v);
const fmt=(v,d=1)=>OK(v)?v.toFixed(d):'—';
const observed=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?d.toISOString().slice(0,16).replace('T',' ')+' UTC':'—';};
const url=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:null;}catch{return null;}};
function svg(tag,attrs={},text=''){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text)n.textContent=text;return n;}

export function macroSeries(rows,mode){
  const field=(r,k)=>r.metrics?.[k];
  if(mode==='stocks'){
    const base=rows.find(r=>OK(r.qqq_index)&&OK(r.spy_index)&&r.qqq_index>0&&r.spy_index>0);
    const start=rows.indexOf(base);
    return [['QQQ','var(--macro-green)',r=>base&&rows.indexOf(r)>=start&&OK(r.qqq_index)?100*r.qqq_index/base.qqq_index:null],
      ['SPY','var(--muted)',r=>base&&rows.indexOf(r)>=start&&OK(r.spy_index)?100*r.spy_index/base.spy_index:null]];
  }
  if(mode==='yields')return [[s('macro.nominal'),'var(--macro-green)',r=>field(r,'nominal_10y')],[s('macro.real'),'var(--macro-blue)',r=>field(r,'real_10y')]];
  if(mode==='components')return [[s('macro.funding'),'var(--macro-green)',r=>r.funding_score],[s('macro.rates'),'var(--macro-blue)',r=>r.rates_score]];
  return [[s('macro.beta'),'var(--macro-green)',r=>r.beta_score]];
}

export function linePath(rows,get,x,y){let path='',open=false;rows.forEach((r,i)=>{const v=get(r);if(!OK(v)){open=false;return;}path+=(open?' L':' M')+x(i).toFixed(2)+' '+y(v).toFixed(2);open=true;});return path.trim();}

export function renderMacroBeta(doc){
  const box=el('section.card.macro-beta',el('div.macro-heading',el('span.event-eyebrow',s('macro.eyebrow')),el('h2',s('macro.title'))),el('p.muted',s('macro.description')));
  if(!doc.history?.length){box.append(el('p.data-notice',s('macro.unavailable')));return box;}
  const latest=doc.latest||doc.history.at(-1);
  box.append(el('p.small.muted',s('macro.as_of',{date:doc.as_of,time:observed(doc.observed_at)})));
  if(doc.status==='stale')box.append(el('p.data-notice',{role:'status'},s('macro.stale')));
  const scores=el('div.macro-scores');
  for(const[key,label]of [['beta_score','beta'],['funding_score','funding'],['rates_score','rates']])scores.append(el('div.macro-score',el('span.small.muted',s('macro.'+label)),el('strong.mono',fmt(latest[key])),el('span.small.muted',s('macro.points'))));
  box.append(scores,el('p.macro-annotation',s('macro.annotation_'+(latest.annotation||'unknown'))),el('p.small.muted',s('macro.not_probability')));
  if(!OK(latest.funding_score)&&latest.funding_range?.every(OK))box.append(el('p.data-notice',s('macro.incomplete',{low:fmt(latest.funding_range[0]),high:fmt(latest.funding_range[1])})));
  let range='6',mode='beta',selectedDate=latest.date;
  const controls=el('div.macro-controls'),rangeButtons=el('div.macro-tabs',{'aria-label':s('macro.range')}),modeButtons=el('div.macro-tabs',{'aria-label':s('macro.view')});
  const chart=el('div.macro-chart'),readout=el('div.macro-readout',{'aria-live':'polite','aria-atomic':'true'}),legend=el('div.macro-legend');
  controls.append(rangeButtons,modeButtons);box.append(controls,readout,chart,legend);
  function render(){
    clear(rangeButtons);clear(modeButtons);clear(chart);clear(legend);
    for(const r of ['1','3','6'])rangeButtons.append(el('button.btn.btn-ghost.btn-sm'+(range===r?'.active':''),{type:'button','aria-pressed':String(range===r),onclick:()=>{range=r;render();}},s('macro.months',{n:r})));
    for(const m of MODES)modeButtons.append(el('button.btn.btn-ghost.btn-sm'+(mode===m?'.active':''),{type:'button','aria-pressed':String(mode===m),onclick:()=>{mode=m;render();}},s('macro.view_'+m)));
    const cutoff=new Date(doc.as_of+'T12:00:00Z');cutoff.setUTCMonth(cutoff.getUTCMonth()-Number(range));
    const rows=doc.history.filter(r=>r.date>=cutoff.toISOString().slice(0,10));
    if(!rows.length){chart.append(el('p.data-notice',s('macro.unavailable')));return;}
    const lines=macroSeries(rows,mode),values=lines.flatMap(([, ,get])=>rows.map(get).filter(OK));
    const W=Math.max(280,Math.min(720,window.innerWidth-64)),H=240,L=44,R=14,T=18,B=36;
    let low=mode==='beta'||mode==='components'?0:Math.min(...values),high=mode==='beta'||mode==='components'?100:Math.max(...values);
    if(!values.length){low=0;high=1;}else if(high===low){low-=1;high+=1;}else if(mode==='stocks'||mode==='yields'){const pad=(high-low)*.12;low-=pad;high+=pad;}
    const x=i=>L+(W-L-R)*(rows.length===1?.5:i/(rows.length-1)),y=v=>H-B-(v-low)*(H-T-B)/(high-low);
    const plot=svg('svg',{viewBox:`0 0 ${W} ${H}`,role:'img','aria-label':s('macro.chart_label')});
    for(let i=0;i<4;i++){const v=low+(high-low)*i/3;plot.append(svg('line',{x1:L,x2:W-R,y1:y(v),y2:y(v),stroke:'var(--border)','stroke-width':.6}),svg('text',{x:L-9,y:y(v)+4,'text-anchor':'end',fill:'var(--muted)','font-size':11},v.toFixed(mode==='yields'?1:0)));}
    for(const i of [...new Set([0,Math.floor((rows.length-1)/2),rows.length-1])])plot.append(svg('text',{x:x(i),y:H-10,'text-anchor':i===0?'start':i===rows.length-1?'end':'middle',fill:'var(--muted)','font-size':12},rows[i].date.slice(5)));
    for(const[label,color,get]of lines){plot.append(svg('path',{d:linePath(rows,get,x,y),fill:'none',stroke:color,'stroke-width':2.4,'stroke-linejoin':'round','stroke-linecap':'round'}));legend.append(el('span',el('i',{style:{background:color}}),label));}
    legend.append(el('span.small.muted',s('macro.unit_'+mode)));
    const cursor=svg('line',{x1:0,x2:0,y1:T,y2:H-B,stroke:'var(--muted)','stroke-width':1,'stroke-dasharray':'3 4'});plot.append(cursor);
    const slider=el('input.macro-date-slider',{type:'range',min:0,max:rows.length-1,step:1,'aria-label':s('macro.select_date')});
    let selected=Math.max(0,rows.findIndex(r=>r.date===selectedDate));if(!rows.some(r=>r.date===selectedDate))selected=rows.length-1;
    function select(i){selected=Math.max(0,Math.min(rows.length-1,i));const row=rows[selected];selectedDate=row.date;slider.value=selected;cursor.setAttribute('x1',x(selected));cursor.setAttribute('x2',x(selected));clear(readout);readout.append(el('strong.mono',row.date));for(const[label,,get]of lines)readout.append(el('span',label+' ',el('strong.mono',fmt(get(row),mode==='yields'?2:1)+(mode==='yields'?'%':''))));slider.setAttribute('aria-valuetext',row.date+' · '+lines.map(([label,,get])=>label+' '+fmt(get(row))).join(' · '));}
    slider.addEventListener('input',()=>select(Number(slider.value)));
    plot.addEventListener('pointermove',event=>{const rect=plot.getBoundingClientRect();if(!rect.width)return;const px=(event.clientX-rect.left)*W/rect.width;select(Math.round((px-L)/(W-L-R)*(rows.length-1)));});
    chart.append(plot,el('label.macro-date-label',s('macro.select_date'),slider));select(selected);
  }
  render();
  const evidence=el('details.macro-evidence',el('summary',s('macro.evidence')),el('p.small.muted',s('macro.cutoffs')));
  const metrics=el('div.macro-metrics');
  for(const[key,label,unit]of [['spread_bp','spread','bp'],['tail_bp','tail','bp'],['reserves_bn','reserves','bn'],['tga_bn','tga','bn'],['broad_usd_20d_change_pct','usd_change','%'],['rrp_bn','rrp','bn'],['srf_bn','srf','bn'],['net_liquidity_65d_change_bn','net_change','bn'],['nominal_10y','nominal','%'],['real_10y','real','%'],['nfci_credit','credit',''],['nfci_risk','risk','']])metrics.append(el('div',el('span.small.muted',s('macro.'+label)),el('strong.mono',fmt(latest.metrics?.[key],2)+' '+unit)));
  evidence.append(metrics,el('p.small.muted',s('macro.coverage',{complete:doc.coverage?.complete_scores||0,total:doc.coverage?.sessions||0})),el('h3',s('macro.contributions')));
  const contributionList=el('dl.macro-contributions');
  for(const[key,value]of Object.entries(latest.contributions||{}))contributionList.append(el('dt',s('macro.factor_'+key)),el('dd.mono',fmt(value)));
  evidence.append(contributionList,el('p.small.muted',s('macro.method')),el('p.small.muted',s('macro.reconstruction')));
  for(const[name,source]of Object.entries(doc.sources||{})){const href=url(source.url);const dates=latest.source_dates?.[name];if(href)evidence.append(el('p.small',el('a',{href,target:'_blank',rel:'noopener noreferrer'},name+' ↗'),el('span', ' · '+s('macro.source_attribution',{provider:source.provider||name})),dates?' · '+s('macro.source_dates',{date:dates.date,available:dates.available_date}):' · '+s('macro.source_missing')));}
  const nominal=doc.associations?.nominal_10y_20d_change_bp,real=doc.associations?.real_10y_20d_change_bp;
  if(OK(nominal?.correlation)&&OK(real?.correlation))evidence.append(el('p.small.muted',s('macro.association',{nominal:fmt(nominal.correlation,2),real:fmt(real.correlation,2),n:Math.min(nominal.n,real.n)})));
  box.append(evidence);
  const validation=doc.validation;
  const supportive=(validation?.nonoverlapping_forward_20d||[]).filter(r=>r.regime==='supportive'&&OK(r.qqq_return_pct));
  if(supportive.length)box.append(el('p.small.muted',el('strong',s('macro.forward')+' · '),s('macro.forward_sample',{n:supportive.length,losses:supportive.filter(r=>r.qqq_return_pct<0).length,worst:fmt(Math.min(...supportive.map(r=>r.qqq_return_pct)))})));

  if(validation?.baseline_reproduced){const details=el('details.macro-validation',el('summary',s('macro.validation')));details.append(el('p.data-notice',s('macro.validation_result')));
    const table=el('table.macro-validation-table',el('thead',el('tr',...['period','cost','baseline','candidate','drawdown','sample'].map(k=>el('th',s('macro.col_'+k))))));const body=el('tbody');
    for(const[cost,result]of Object.entries(validation.results||{}))for(const period of ['selection','validation','evaluation']){const b=result.baseline?.[period],c=result.macro_gate?.[period];if(!b||!c)continue;body.append(el('tr',el('td',b.start+' → '+b.end),el('td',cost+' bp'),el('td.mono',fmt(b.metrics?.nav?.return_pct)+'%'),el('td.mono',fmt(c.metrics?.nav?.return_pct)+'%'),el('td.mono',fmt(c.metrics?.nav?.max_drawdown_pct)+'%'),el('td',s('macro.n_open',{n:c.completed_positions,open:c.open_positions}))));}
    table.append(body);
    const losses=el('div.macro-losses',el('h3',s('macro.losses')));
    for(const[cost,result]of Object.entries(validation.results||{}))for(const variant of ['baseline','macro_gate'])for(const run of Object.values(result[variant]||{}))for(const year of run.losing_years||[])losses.append(el('p.small',cost+' bp · '+s('macro.loss_row',{year,variant:s('macro.variant_'+variant),value:fmt(run.years?.[year]?.return_pct)})));
    details.append(losses);
    details.append(el('div.macro-table-scroll',{tabindex:0},table),el('p.small.muted',s('macro.validation_caveat')));box.append(details);
  }else box.append(el('p.small.muted',s('macro.validation_pending')));
  return box;
}

export function mountMacroBeta(root){
  const epoch=store.epoch(),ctl=new AbortController();let disposed=false;
  const box=el('section.card.macro-beta',el('h2',s('macro.title')));root.append(box);
  if(!store.get('me')){box.append(el('p.muted',s('macro.free')),el('a.btn.btn-primary.btn-sm',{href:'#/billing'},s('macro.open')));return()=>{disposed=true;};}
  box.append(el('p.muted',s('macro.loading')));
  api.get('/macro/beta',{signal:ctl.signal,silent402:true}).then(doc=>{if(!disposed&&epoch===store.epoch())box.replaceWith(renderMacroBeta(doc));}).catch(()=>{if(!disposed&&epoch===store.epoch()){clear(box);box.append(el('h2',s('macro.title')),el('p.data-notice',s('macro.unavailable')));}});
  return()=>{disposed=true;ctl.abort();};
}
