import {h,t,button,badge,icon,showDialog,money,percent} from '../ui.js';

// Synthetic observations, deliberately separate from the September 28 demo clock.
// The last session agrees with the sample quotes in Today.
export const MACRO_ROWS = [
  ['2026-09-14',54,4.22,468.20,560.84],
  ['2026-09-15',56,4.20,471.10,564.20],
  ['2026-09-16',55,4.25,467.00,562.75],
  ['2026-09-17',60,4.18,477.80,568.30],
  ['2026-09-18',57,4.21,473.20,565.19],
  ['2026-09-21',62,4.17,480.50,570.40],
  ['2026-09-22',60,4.14,483.60,573.70],
  ['2026-09-23',64,4.16,487.15,569.70],
  ['2026-09-24',63,4.10,486.23,570.88],
  ['2026-09-25',68,4.12,490.80,574.42],
].map(([date,funding_score,nominal_10y,qqq_index,spy_index])=>({date,funding_score,nominal_10y,qqq_index,spy_index}));

export function fundingBand(value){return !Number.isFinite(value)?'unknown':value<40?'tight':value<60?'mixed':'loose';}
export function normalizedSeries(rows,primary='liquidity'){
  return [[primary,primary==='yield'?'nominal_10y':'funding_score'],['qqq','qqq_index'],['spy','spy_index']].map(([key,field])=>{
    const raw=rows.map(row=>row[field]),finite=raw.filter(Number.isFinite),low=Math.min(...finite),high=Math.max(...finite),span=high-low;
    return {key,raw,low,high,values:raw.map(value=>Number.isFinite(value)&&span>0?(value-low)/span*100:null)};
  });
}

const NS='http://www.w3.org/2000/svg';
function svg(tag,attrs={},...children){const node=document.createElementNS(NS,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));for(const child of children)node.append(child);return node;}
const signed=(value,digits=0)=>(value>0?'+':'')+value.toFixed(digits);
const number=value=>Number.isFinite(value)?value.toFixed(2):'—';
const day=iso=>iso.slice(5).replace('-','/');

export function macroPanel(ctx,state={primary:'liquidity',index:MACRO_ROWS.length-1}){
  const root=h('section',{class:'ux-macro','aria-label':t('macro.title')});
  let chart,range,readings,selectedDate,cursor,dots=[];
  const last=MACRO_ROWS[MACRO_ROWS.length-1],band=fundingBand(last.funding_score);
  const rawValue=(row,key)=>key==='liquidity'?t('macro.score_value',{n:row.funding_score}):key==='yield'?number(row.nominal_10y)+'%':money(row[key+'_index']);
  function changeValue(index,key){
    if(index===0)return t('macro.first_session');
    const row=MACRO_ROWS[index],before=MACRO_ROWS[index-1];
    return key==='liquidity'?t('macro.points_change',{n:signed(row.funding_score-before.funding_score)}):
      key==='yield'?t('macro.bp_change',{n:signed(Math.round((row.nominal_10y-before.nominal_10y)*100))}):percent((row[key+'_index']/before[key+'_index']-1)*100);
  }
  function help(){
    showDialog({title:t('macro.help_title'),content:h('div',{class:'stack ux-macro-help'},badge(t('macro.synthetic'),'accent'),
      h('p',{},t('macro.help_score')),h('div',{class:'ux-macro-help-bands'},...['tight','mixed','loose'].map(key=>h('div',{},badge(t('macro.band.'+key),key==='tight'?'negative':key==='loose'?'positive':'neutral'),h('span',{},t('macro.band_rule.'+key))))),
      h('section',{},h('h3',{},t('macro.help_chart_title')),h('p',{},t('macro.help_normalize'))),
      h('section',{},h('h3',{},t('macro.help_source_title')),h('p',{},t('macro.help_source'))),h('p',{class:'small muted'},t('macro.no_prediction')))});
  }
  const position=index=>18+(644-36)*index/(MACRO_ROWS.length-1);
  const y=value=>12+(144-24)*(1-value/100);
  function makeChart(series){
    chart=svg('svg',{viewBox:'0 0 644 164',preserveAspectRatio:'none',class:'ux-macro-svg',role:'img','aria-label':t('macro.chart_label',{primary:t('macro.series.'+state.primary)})});
    const title=svg('title');title.textContent=t('macro.chart_label',{primary:t('macro.series.'+state.primary)});chart.append(title);
    for(const value of [0,50,100])chart.append(svg('line',{x1:18,x2:626,y1:y(value),y2:y(value),class:'ux-macro-gridline'}));
    dots=[];
    for(const line of series){
      const points=line.values.map((value,index)=>Number.isFinite(value)?position(index).toFixed(2)+','+y(value).toFixed(2):null).filter(Boolean).join(' ');
      chart.append(svg('polyline',{points,fill:'none',class:'ux-macro-line is-'+line.key}));
      const marker=svg('circle',{cx:position(state.index),cy:y(line.values[state.index]),r:3.8,class:'ux-macro-marker is-'+line.key});
      chart.append(marker);dots.push({node:marker,values:line.values});
    }
    cursor=svg('line',{x1:position(state.index),x2:position(state.index),y1:5,y2:139,class:'ux-macro-cursor'});chart.append(cursor);
    MACRO_ROWS.forEach((row,index)=>{const label=svg('text',{x:position(index),y:160,'text-anchor':'middle',class:'ux-macro-axis'});label.textContent=row.date.slice(-2);chart.append(label);});
    chart.addEventListener('click',event=>{const box=chart.getBoundingClientRect();if(box.width<=0)return;const x=(event.clientX-box.left)/box.width*644;choose(Math.round((x-18)/(644-36)*(MACRO_ROWS.length-1)));range.focus({preventScroll:true});});
    return chart;
  }
  function choose(index){
    state.index=Math.max(0,Math.min(MACRO_ROWS.length-1,index));
    const row=MACRO_ROWS[state.index],keys=[state.primary,'qqq','spy'];
    range.value=String(state.index);
    range.setAttribute('aria-valuetext',t('macro.reading_aria',{date:row.date,primary:t('macro.series.'+state.primary),value:rawValue(row,state.primary),qqq:rawValue(row,'qqq'),spy:rawValue(row,'spy')}));
    selectedDate.textContent=t('macro.selected_date',{date:day(row.date)});
    readings.replaceChildren(...keys.map(key=>h('div',{class:'ux-macro-reading is-'+key},h('span',{class:'ux-macro-reading-label'},h('i',{'aria-hidden':'true'}),t('macro.series.'+key)),
      h('strong',{class:'mono'},rawValue(row,key)),h('span',{class:'small muted mono'},changeValue(state.index,key)))));
    cursor.setAttribute('x1',position(state.index));cursor.setAttribute('x2',position(state.index));
    for(const dot of dots){dot.node.setAttribute('cx',position(state.index));dot.node.setAttribute('cy',y(dot.values[state.index]));}
  }
  function render(focusPrimary=false){
    const series=normalizedSeries(MACRO_ROWS,state.primary);
    readings=h('div',{class:'ux-macro-readings','aria-live':'polite','aria-atomic':'true'});
    selectedDate=h('span',{class:'ux-macro-selected-date mono'});
    range=h('input',{type:'range',class:'ux-macro-range',min:0,max:MACRO_ROWS.length-1,step:1,value:state.index,'aria-label':t('macro.select_date'),
      onInput:event=>choose(Number(event.target.value)),onKeydown:event=>{
        const next={ArrowLeft:state.index-1,ArrowDown:state.index-1,ArrowRight:state.index+1,ArrowUp:state.index+1,Home:0,End:MACRO_ROWS.length-1}[event.key];
        if(next!==undefined){event.preventDefault();choose(next);}
      }});
    root.replaceChildren(
      h('header',{class:'ux-macro-heading'},h('div',{class:'row'},h('h2',{},t('macro.title')),badge(t('macro.synthetic'),'neutral')),
        h('div',{class:'row'},h('span',{class:'small muted'},t('macro.as_of')),h('button',{type:'button',class:'icon-btn ux-macro-help-button','aria-label':t('macro.help_title'),onClick:help},icon('info',17)))),
      h('div',{class:'ux-macro-layout'},
        h('div',{class:'ux-macro-score'},h('span',{class:'ux-macro-score-label'},t('macro.score_title')),
          h('div',{class:'ux-macro-score-value'},h('strong',{class:'mono'},String(last.funding_score)),h('span',{class:'muted'},'/ 100'),badge(t('macro.band.'+band),band==='loose'?'positive':band==='tight'?'negative':'neutral')),
          h('div',{class:'ux-macro-gauge',role:'meter','aria-label':t('macro.score_title'),'aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':last.funding_score,'aria-valuetext':t('macro.score_aria',{n:last.funding_score,band:t('macro.band.'+band)})},
            h('span',{class:'tight'}),h('span',{class:'mixed'}),h('span',{class:'loose'}),h('i',{class:'ux-macro-gauge-pointer',style:{left:last.funding_score+'%'}})),
          h('div',{class:'ux-macro-scale'},h('span',{},'0'),h('span',{},'40'),h('span',{},'60'),h('span',{},'100')),
          h('p',{class:'ux-macro-score-note'},t('macro.score_note')),h('p',{class:'small muted'},t('macro.score_window',{first:MACRO_ROWS[0].funding_score,last:last.funding_score}))),
        h('div',{class:'ux-macro-comparison'},
          h('div',{class:'ux-macro-chart-heading'},h('span',{class:'small muted'},t('macro.comparison_title')),
            h('div',{class:'segmented ux-macro-switch','aria-label':t('macro.choose_series')},...['liquidity','yield'].map(key=>h('button',{type:'button',class:state.primary===key?'active':'','data-macro-primary':key,'aria-pressed':String(state.primary===key),onClick:()=>{state.primary=key;render(true);}},t('macro.toggle.'+key))))),
          makeChart(series),h('div',{class:'ux-macro-slider-row'},selectedDate,range),readings)),
      h('footer',{class:'ux-macro-footer'},h('span',{},t('macro.normalization_note')),h('span',{},t('macro.interaction_note'))));
    choose(state.index);
    if(focusPrimary)root.querySelector('[data-macro-primary="'+state.primary+'"]')?.focus({preventScroll:true});
  }
  render();return root;
}
