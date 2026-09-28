import {metricLinks,stockMetrics} from './metrics.js';
import {h,t,button,link,badge,icon,money,percent,showDialog,toast} from '../ui.js';

const finite=Number.isFinite;
const refsFor=stock=>Array.isArray(stock.reference)&&stock.reference.length===2&&stock.reference.every(finite)?stock.reference:null;
const svgNode=(tag,attrs={})=>{const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,String(value));return el;};
function sampleChart(stock,period){
  const chart=svgNode('svg',{viewBox:'0 0 760 210',role:'img','aria-label':t('stock.chart_aria',{ticker:stock.ticker})});
  const ticks=[26,78,130,182];
  for(const y of ticks)chart.append(svgNode('line',{x1:0,x2:690,y1:y,y2:y,class:'st-chart-grid'}));
  if(!finite(stock.price))return h('p',{class:'muted'},t('stock.no_price'));
  const series=period==='1m'?[140,153,137,148,113,124,106,116,94,107,76,91,77,95,60,71,58,68,41,51,40,56,35,49,38,49,33,39,27,35]:period==='3m'?[175,163,173,145,154,142,132,144,120,129,118,141,128,106,117,100,90,105,83,97,76,89,65,78,54,66,42,56,29,39]:[145,159,165,153,134,145,124,142,135,118,97,114,96,112,94,107,87,92,69,88,72,51,67,52,43,59,45,24,42,35];
  const points=series.map((y,i)=>[12+i*23,y]);
  const path='M'+points.map(([x,y])=>x+','+y).join(' L');
  chart.append(svgNode('path',{d:path+' L679,194 L12,194 Z',class:'st-chart-area'}),svgNode('path',{d:path,class:'st-chart-line'}));
  const [lastX,lastY]=points.at(-1);chart.append(svgNode('circle',{cx:lastX,cy:lastY,r:4,class:'st-chart-dot'}));
  for(const [i,y]of ticks.entries()){const label=svgNode('text',{x:712,y:y+4,class:'st-chart-label'});label.textContent=money(stock.price*(1.045-i*.048));chart.append(label);}
  const caption=h('div',{class:'st-chart-dates small muted'},h('span',{},t('stock.chart_start_'+period)),h('span',{},t('stock.chart_end')));
  return h('div',{class:'st-chart-figure'},chart,caption);
}

export function mountStock(root,ctx,params={}){
  const stock=ctx.stock(params.ticker||'NVDA');
  if(!stock){root.append(h('section',{class:'empty-state'},h('h1',{},t('stock.not_found')),link(t('stock.back_explore'),'#/explore')));return;}
  const prior=ctx.state.stockUI?.[stock.ticker]||{};
  let tab=['overview','metrics','evidence','history'].includes(params.query?.get('tab'))?params.query.get('tab'):['overview','metrics','evidence','history'].includes(prior.tab)?prior.tab:'overview',period=['1m','3m','6m'].includes(prior.period)?prior.period:'1m';
  const plan=()=>ctx.state.alerts?.find(item=>item.ticker===stock.ticker);
  function switchTab(value){tab=value;window.history.replaceState(null,'','#/stock/'+encodeURIComponent(stock.ticker)+'?tab='+tab);draw();}
  const reference=refsFor(stock),watching=()=>ctx.state.watchlist.includes(stock.ticker),shell=h('section',{class:'st-page'});root.append(shell);
  const records=[
    {id:'support',lane:'support',author:'stock.author_a',title:stock.bull,kind:'stock.kind_view',date:'2026-09-25',time:'09:30',type:'stock.source_demo',text:'stock.source_support_context'},
    {id:'price',lane:'context',author:'stock.author_market',title:!finite(stock.price)?'stock.price_missing_title':!reference?'stock.price_partial_title':'stock.price_source_title',kind:finite(stock.price)?'stock.kind_fact':'stock.kind_missing',date:finite(stock.price)?'2026-09-25':null,time:'16:00',type:'stock.source_sample',text:'stock.source_price_context',status:!finite(stock.price)?'missing':!reference?'partial':'ready'},
    {id:'event',lane:'context',author:'stock.author_event',title:stock.eventDate?stock.event:'stock.event_missing_title',kind:stock.eventDate?'stock.kind_event':'stock.kind_missing',date:stock.eventDate?'2026-09-25':null,time:'10:00',type:'stock.source_sample',text:'stock.source_event_context',status:stock.eventDate?'ready':'missing'},
    {id:'counter',lane:'counter',author:'stock.author_b',title:stock.bear,kind:'stock.kind_view',date:'2026-09-24',time:'11:00',type:'stock.source_demo',text:'stock.source_counter_context'}
  ];
  const savedKey=record=>stock.ticker+':'+record.id;
  const isSaved=record=>ctx.state.saved.includes(savedKey(record));
  const missingText=record=>t(record.id==='event'?'stock.event_missing_body':record.status==='missing'?'stock.price_missing_body':'stock.reference_missing_body');
  function source(record){
    const missing=record.status==='missing',partial=record.status==='partial';
    const saveControl=button('',()=>{
      const wasSaved=isSaved(record);
      ctx.state.saved=wasSaved?ctx.state.saved.filter(id=>id!==savedKey(record)):[...ctx.state.saved,savedKey(record)];
      ctx.save();updateSave();
      for(const marker of shell.querySelectorAll('[data-saved-marker]'))marker.hidden=!ctx.state.saved.includes(stock.ticker+':'+marker.dataset.savedMarker);
      toast(t(wasSaved?'stock.unsaved_example':'stock.saved_example'));
    },'btn btn-quiet st-save-toggle');
    function updateSave(){saveControl.replaceChildren(icon(isSaved(record)?'check':'bookmark',16),t(isSaved(record)?'stock.saved_toggle':'stock.save_example'));saveControl.setAttribute('aria-pressed',String(isSaved(record)));}
    updateSave();
    const material=missing?h('p',{class:'st-source-missing'},missingText(record)):
      h('blockquote',{},record.id==='price'?t('stock.source_price_numbers',{price:money(stock.price),low:reference?money(reference[0]):'—',high:reference?money(reference[1]):'—'}):t(record.title));
    const content=h('div',{class:'stack st-source-dialog'},
      h('div',{class:'row'},badge(t(record.kind),record.lane==='support'?'positive':record.lane==='counter'?'negative':'neutral'),badge(t('stock.illustrative'),'accent'),missing||partial?badge(t(missing?'stock.data_missing':'stock.data_partial')):null),
      h('h3',{},t(record.title)),h('p',{class:'muted'},t(record.author)+(record.date?' · '+record.date:'')),material,
      partial?h('p',{class:'st-source-missing'},missingText(record)):null,
      !missing?h('p',{},t(record.text)):null,
      !missing?h('dl',{class:'st-source-meta'},h('dt',{},t('stock.published')),h('dd',{},record.date+' '+record.time+' ET'),h('dt',{},t('stock.observed')),h('dd',{},'2026-09-25 16:15 ET'),h('dt',{},t('stock.source_type')),h('dd',{},t(record.type))):null,
      h('p',{class:'small muted'},t('stock.no_real_source')),
      h('div',{class:'row'},saveControl,link(t('stock.related_creator'),'#/creators?ticker='+stock.ticker)));
    showDialog({title:t('stock.source_title'),content});
  }
  function ruler(){
    if(!reference||!finite(stock.price))return h('div',{class:'st-levels-missing'},icon('info',20),h('p',{},t('stock.reference_missing')),button(t('stock.custom_price'),()=>ctx.openAlert(stock.ticker),'btn btn-quiet'));
    const resistance=finite(stock.resistance)?stock.resistance:reference[1]*1.06,lo=Math.min(reference[0]*.96,stock.price*.97),hi=Math.max(resistance*1.035,stock.price*1.04);
    const pos=value=>Math.max(0,Math.min(100,(value-lo)/(hi-lo)*100));
    return h('div',{class:'st-ruler'},h('div',{class:'st-ruler-price'},h('span',{class:'small muted'},t('stock.sample_quote')),h('strong',{class:'mono'},money(stock.price))),h('div',{class:'st-ruler-track'},h('span',{class:'st-ruler-zone',style:'left:'+pos(reference[0])+'%;width:'+(pos(reference[1])-pos(reference[0]))+'%'}),h('span',{class:'st-ruler-current',style:'left:'+pos(stock.price)+'%'},h('span',{},t('stock.current'))),h('span',{class:'st-ruler-ceiling',style:'left:'+pos(resistance)+'%'})),h('div',{class:'st-ruler-labels'},h('span',{style:'left:'+pos(reference[0])+'%'},money(reference[0])),h('span',{style:'left:'+pos(reference[1])+'%'},money(reference[1])),h('span',{style:'left:'+pos(resistance)+'%'},money(resistance))),h('div',{class:'st-ruler-legend small'},h('span',{},h('i',{class:'st-legend-zone'}),t('stock.reference_range')),h('span',{class:'muted'},t('stock.upper_reference'))));
  }
  function referenceDetails(){
    const content=h('div',{class:'stack'},badge(t('stock.illustrative'),'accent'),h('p',{},t('stock.method_intro')),h('div',{class:'st-method-row'},h('strong',{},t('stock.method_lower')),h('p',{class:'muted'},t('stock.method_lower_body'))),h('div',{class:'st-method-row'},h('strong',{},t('stock.method_upper')),h('p',{class:'muted'},t('stock.method_upper_body'))),h('p',{class:'small muted'},t('stock.reference_limits')),h('p',{class:'small muted'},t('stock.reference_date')),button(t('stock.use_level'),()=>{dialog.close();ctx.openAlert(stock.ticker,reference?.[1]);},'btn btn-primary'));
    const dialog=showDialog({title:t('stock.how_reference'),content});
  }
  function personalPlan(){const entry=plan();if(!finite(entry?.price))return null;return h('div',{class:'st-personal-plan'},h('div',{class:'row'},h('strong',{},t('stock.my_plan')),badge(t('stock.local_plan'),'accent')),h('p',{},t(entry.condition==='above'?'stock.plan_above':'stock.plan_below',{price:money(entry.price)})),h('p',{class:'small muted'},t('stock.plan_expiry',{date:entry.expiry})),button(t('stock.edit_plan'),()=>ctx.openAlert(stock.ticker),'text-link'));}
  function pricePlan(){return h('aside',{class:'st-plan panel'},h('div',{class:'st-plan-heading'},h('h2',{},t('stock.price_plan')),badge(t('stock.illustrative'),'accent')),ruler(),h('div',{class:'st-plan-reference'},h('div',{},h('span',{class:'small muted'},t('stock.entry_reference')),h('strong',{class:'mono'},reference?money(reference[0])+' – '+money(reference[1]):'—')),reference&&finite(stock.price)?badge(t('stock.gap',{value:percent((reference[1]/stock.price-1)*100)})):null),h('p',{class:'small muted'},t('stock.reference_limits')),h('button',{class:'text-link st-method-link',type:'button',onClick:referenceDetails},t('stock.how_reference'),icon('info',14)),button(t(reference?'stock.use_level':'stock.custom_price'),()=>ctx.openAlert(stock.ticker,reference?.[1]),'btn btn-primary st-plan-primary'),h('p',{class:'st-plan-note small muted'},t('stock.plan_local')),personalPlan(),h('div',{class:'st-plan-next'},icon('calendar',18),h('div',{},h('span',{class:'small muted'},t('stock.next_event')),link((stock.eventDate||'—')+' · '+(stock.event?t(stock.event):t('stock.no_event')),'#/calendar?ticker='+stock.ticker))));}
  function perspective(record){return h('article',{class:'st-perspective st-'+record.lane},h('div',{class:'st-perspective-head'},badge(t('stock.lane_'+record.lane),record.lane==='support'?'positive':'negative'),h('span',{class:'small muted'},record.date)),h('p',{},t(record.title)),h('button',{class:'st-source-button',type:'button',onClick:()=>source(record)},icon('users',14),t(record.author),h('span',{class:'muted'},t('stock.read_basis')),icon('arrow',14)));}
  function overview(){
    const left=h('div',{class:'st-overview-main'},h('section',{class:'st-quick-take'},h('div',{class:'row'},h('span',{class:'eyebrow'},t('stock.quick_take')),badge(t('stock.illustrative'))),h('h2',{},t(stock.summary)),h('div',{class:'st-quick-meta small muted'},h('span',{},t('stock.snapshot_date')),h('button',{class:'text-link',type:'button',onClick:()=>source(records[0])},t('stock.view_basis'))),metricLinks(stock)),h('section',{class:'st-perspectives'},h('div',{class:'section-head'},h('h2',{},t('stock.different_views')),button(t('stock.all_evidence'),()=>switchTab('evidence'),'text-link')),perspective(records[0]),perspective(records[3])),h('section',{class:'st-chart-section'},h('div',{class:'st-chart-head'},h('h2',{},t('stock.price_context')),h('div',{class:'segmented',role:'group','aria-label':t('stock.chart_period')},...['1m','3m','6m'].map(key=>h('button',{type:'button',class:key===period?'active':'','aria-pressed':String(key===period),onClick:()=>{period=key;draw();}},t('stock.period_'+key))))),sampleChart(stock,period),h('p',{class:'small muted st-chart-note'},t('stock.chart_note'))));
    return h('div',{class:'st-overview-grid'},left,pricePlan());
  }
  function node(record){
    const missing=record.status==='missing',partial=record.status==='partial';
    return h('button',{class:'st-map-node st-'+record.lane+(missing?' st-node-missing':''),type:'button',onClick:()=>source(record),'data-evidence-id':record.id,'aria-label':t('stock.open_evidence',{name:t(record.title)})},
      h('span',{class:'st-node-heading'},h('span',{class:'st-node-kind small'},icon(missing?'info':record.lane==='context'?(record.id==='event'?'calendar':'chart'):'users',15),t(record.kind)),h('span',{class:'st-node-saved',hidden:!isSaved(record),'data-saved-marker':record.id},icon('bookmark',12),t('stock.saved_marker'))),
      h('strong',{},t(record.title)),
      missing||partial?h('span',{class:'st-node-missing-label small muted'},t(missing?'stock.data_missing':'stock.data_partial')):null,
      h('span',{class:'st-node-meta small muted'},missing?missingText(record):t(record.author)+' · '+record.date),
      h('span',{class:'st-node-read'},t(missing?'stock.read_missing':'stock.read_basis')+' →'));
  }
  function evidence(){
    return h('section',{class:'st-evidence'},h('div',{class:'st-evidence-intro'},h('div',{},h('h2',{},t('stock.evidence_title')),h('p',{class:'muted'},t('stock.evidence_intro'))),badge(t('stock.evidence_count',{count:records.filter(record=>record.status!=='missing').length}))),h('div',{class:'st-map-root'},h('span',{class:'st-map-root-line'}),h('div',{class:'st-map-stock'},h('strong',{},stock.ticker),h('span',{class:'small muted'},stock.name)),h('span',{class:'st-map-root-line'})),h('div',{class:'st-evidence-lanes'},...['support','context','counter'].map(lane=>h('section',{class:'st-evidence-lane'},h('header',{class:'st-lane-header st-'+lane},h('span',{},t('stock.lane_'+lane)),h('span',{class:'small'},t('stock.available_count',{count:records.filter(record=>record.lane===lane&&record.status!=='missing').length}))),...records.filter(record=>record.lane===lane).map(node)))),h('div',{class:'st-evidence-footer'},h('p',{class:'small muted'},t('stock.evidence_limit')),h('div',{class:'row'},button(t('stock.alert_changes'),()=>ctx.openAlert(stock.ticker),'btn btn-quiet'),button(t('stock.back_overview'),()=>switchTab('overview'),'text-link'))));
  }
  function history(){return h('section',{class:'st-history'},h('div',{class:'st-evidence-intro'},h('div',{},h('h2',{},t('stock.history_title')),h('p',{class:'muted'},t('stock.history_intro'))),badge(t('stock.illustrative'),'accent')),h('div',{class:'st-history-timeline'},...[
    {date:'2026-09-25',label:'stock.history_added',body:stock.bull,record:records[0],tone:'positive'},
    {date:'2026-09-24',label:'stock.history_counter',body:stock.bear,record:records[3],tone:'negative'},
    ...(finite(stock.price)?[{date:'2026-09-23',label:reference?'stock.history_price':'stock.history_quote',body:reference?'stock.history_price_body':'stock.history_quote_body',record:{...records[1],date:'2026-09-23',time:'16:00'},tone:'neutral'}]:[])
  ].map(item=>h('article',{class:'st-history-item'},h('div',{class:'st-history-date'},h('span',{class:'st-timeline-dot'}),h('time',{},item.date)),h('div',{class:'st-history-card'},badge(t(item.label),item.tone),h('p',{},t(item.body)),h('div',{class:'row'},button(t('stock.see_record'),()=>source(item.record),'text-link'),h('span',{class:'small muted'},t('stock.history_retained'))))))),h('p',{class:'small muted st-history-note'},t('stock.history_note')));}
  function draw(){
    ctx.state.stockUI={...(ctx.state.stockUI||{}),[stock.ticker]:{tab,period}};ctx.save();
    shell.replaceChildren();
    shell.append(h('div',{class:'st-breadcrumb row'},link(t('stock.back_watchlist'),'#/watchlist'),h('span',{class:'muted'},'/'),h('span',{},stock.ticker)),h('header',{class:'st-heading'},h('div',{class:'st-company'},h('span',{class:'st-company-mark',style:'--stock-color:'+stock.color},stock.ticker.slice(0,1)),h('div',{},h('div',{class:'row'},h('h1',{},stock.ticker),badge(t(stock.sector))),h('p',{class:'muted'},stock.name))),h('div',{class:'st-heading-price'},h('div',{class:'row'},h('strong',{class:'mono'},finite(stock.price)?money(stock.price):'—'),h('span',{class:'mono '+(finite(stock.change)&&stock.change>0?'positive':finite(stock.change)&&stock.change<0?'negative':'muted')},finite(stock.change)?percent(stock.change):'—')),h('span',{class:'small muted'},t(finite(stock.price)?'stock.price_date':'stock.price_unavailable_date'))),h('div',{class:'st-heading-actions'},button(t(watching()?'stock.followed':'stock.follow'),()=>ctx.toggleWatch(stock.ticker),watching()?'btn btn-quiet':'btn btn-primary'),h('button',{class:'icon-btn',type:'button','aria-label':t('stock.set_alert'),title:t('stock.set_alert'),onClick:()=>ctx.openAlert(stock.ticker)},icon('bell')))),h('nav',{class:'st-tabs','aria-label':t('stock.sections')},...['overview','metrics','evidence','history'].map(key=>h('button',{type:'button',class:tab===key?'active':'','aria-current':tab===key?'page':null,onClick:()=>switchTab(key)},icon(key==='overview'?'list':key==='evidence'?'map':'clock',16),t('stock.tab_'+key),key==='evidence'?h('span',{class:'st-tab-count'},String(records.filter(record=>record.status!=='missing').length)):null))),tab==='overview'?overview():tab==='metrics'?stockMetrics(stock,ctx):tab==='evidence'?evidence():history(),h('footer',{class:'st-page-foot'},h('p',{class:'small muted'},icon('info',14),t('stock.fixture_note')),h('div',{class:'row'},link(t('stock.see_creators'),'#/creators?ticker='+stock.ticker),link(t('stock.see_events'),'#/calendar?ticker='+stock.ticker))));
  }
  draw();
}
