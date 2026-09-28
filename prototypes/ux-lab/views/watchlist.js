import {lensPair,metricLinks,metricsTable,metricSortValue} from './metrics.js';
import {h,t,button,link,badge,icon,money,percent,showDialog,sectionHead} from '../ui.js';

const valueText=value=>Number.isFinite(value)?money(value):t('watch.unknown');
const stockHref=(ticker,tab='overview')=>'#/stock/'+encodeURIComponent(ticker)+(tab==='overview'?'':'?tab='+tab);
const referenceFor=stock=>Array.isArray(stock.reference)&&stock.reference.length===2&&stock.reference.every(Number.isFinite)?stock.reference:null;
const changed=stock=>['NVDA','MU','AMD','ORCL'].includes(stock.ticker);
const eventSoon=stock=>['NVDA','MU','ORCL'].includes(stock.ticker);
const nearReference=stock=>{const ref=referenceFor(stock);return !!(ref&&Number.isFinite(stock.price)&&Math.abs(stock.price/ref[1]-1)<=0.06);};
function countLabel(key,count){return t(key,{count});}
function quote(stock){return h('div',{class:'wl-quote'},h('strong',{class:'mono'},valueText(stock.price)),h('span',{class:'mono '+(stock.change>0?'positive':stock.change<0?'negative':'muted')},Number.isFinite(stock.change)?percent(stock.change):t('watch.unknown')));}
function referenceLabel(stock){const ref=referenceFor(stock);return ref?money(ref[0])+' – '+money(ref[1]):t('watch.no_reference');}
function sourceBadge(stock){return h('span',{class:'wl-source small muted'},icon('users',13),t('watch.demo_author'),h('span',{},'·'),stock.updated);}
function summaryText(stock){return stock.summary?t(stock.summary):t('watch.no_summary');}
function notice(){return h('p',{class:'wl-fixture small muted'},icon('info',14),t('watch.fixture_note'));}

export function mountWatchlist(root,ctx,params={}){
  const prior=ctx.state.watchUI||{};
  let view=['list','overview','metrics'].includes(params.query?.get('view'))?params.query.get('view'):['list','overview','metrics'].includes(prior.view)?prior.view:'list';
  let filter=['all','changes','price','events'].includes(prior.filter)?prior.filter:'all',sort=['ticker','price','put','low20','ratio','degen'].includes(prior.sort)?prior.sort:'ticker',direction=prior.direction==='desc'?'desc':'asc',query=typeof prior.query==='string'?prior.query:'',expanded=prior.expanded||null;
  const planFor=stock=>ctx.state.alerts?.find(item=>item.ticker===stock.ticker);
  const shownReference=stock=>finitePlan(planFor(stock))?money(planFor(stock).price):referenceLabel(stock);
  const finitePlan=plan=>Number.isFinite(plan?.price)&&plan.price>0;
  const nearPlan=stock=>finitePlan(planFor(stock))&&Number.isFinite(stock.price)?Math.abs(stock.price/planFor(stock).price-1)<=0.06:nearReference(stock);
  function switchView(value){view=value;window.history.replaceState(null,'','#/watchlist?view='+view);draw();}
  const selectedStocks=()=>ctx.state.watchlist.map(ticker=>ctx.stock(ticker)).filter(Boolean);
  const shell=h('section',{class:'wl-page'});root.append(shell);
  function manage(stock){
    const content=h('div',{class:'stack'},h('p',{},t('watch.remove_note',{ticker:stock.ticker})),h('div',{class:'row'}));
    const dialog=showDialog({title:t('watch.manage_stock',{ticker:stock.ticker}),content});
    content.lastChild.append(button(t('watch.keep'),()=>dialog.close(),'btn btn-quiet'),button(t('watch.remove'),()=>{dialog.close();ctx.toggleWatch(stock.ticker);},'btn wl-remove-btn'));
  }
  function filters(stocks){
    const options=[['all',stocks.length],['changes',stocks.filter(changed).length],['price',stocks.filter(nearPlan).length],['events',stocks.filter(eventSoon).length]];
    return h('div',{class:'wl-filters',role:'group','aria-label':t('watch.filter_label')},...options.map(([key,n])=>button(t('watch.filter_'+key)+(n?' '+n:''),()=>{filter=key;draw();},'chip'+(filter===key?' active':''))));
  }
  function drawEmpty(){
    const steps=h('ol',{class:'wl-onboarding'},...['one','two','three'].map((key,i)=>
      h('li',{},h('span',{class:'wl-step-number'},String(i+1)),
        h('div',{},h('strong',{},t('watch.step_'+key)),h('p',{class:'small muted'},t('watch.step_'+key+'_body'))))));
    const intro=h('div',{class:'wl-empty-intro'},
      h('span',{class:'eyebrow'},t('watch.empty_eyebrow')),h('h2',{},t('watch.empty_title')),
      h('p',{class:'muted'},t('watch.empty_body')),
      button(t('watch.add_first'),()=>ctx.openSearch(),'btn btn-primary'),
      h('button',{class:'text-link wl-demo-link',type:'button',onClick:()=>ctx.loadDemo()},t('watch.try_demo'),icon('arrow',16)),steps);
    const preview=h('section',{class:'wl-preview'},
      h('div',{class:'row wl-preview-heading'},h('h3',{},t('watch.preview_title')),badge(t('watch.example'),'accent')),
      ...ctx.stocks.slice(0,3).map(stock=>h('article',{class:'wl-preview-row'},
        h('div',{class:'row wl-preview-top'},h('div',{},h('strong',{},stock.ticker),h('span',{class:'small muted'},stock.name)),quote(stock)),
        h('p',{},summaryText(stock)),
        h('div',{class:'row wl-preview-bottom'},badge(t('watch.preview_changed')),link(t('watch.view_stock'),stockHref(stock.ticker))))),
      h('p',{class:'small muted wl-preview-foot'},t('watch.preview_note')));
    shell.append(h('div',{class:'wl-empty-grid'},intro,preview),notice());
  }
  function tools(stock){return h('div',{class:'wl-row-tools'},h('button',{class:'icon-btn',type:'button',title:t('watch.alert_stock',{ticker:stock.ticker}),'aria-label':t('watch.alert_stock',{ticker:stock.ticker}),onClick:()=>ctx.openAlert(stock.ticker)},icon('bell')),h('button',{class:'icon-btn',type:'button',title:t('watch.manage_stock',{ticker:stock.ticker}),'aria-label':t('watch.manage_stock',{ticker:stock.ticker}),onClick:()=>manage(stock)},icon('settings')));}
  function insight(stock){return h('div',{class:'wl-insight'},h('button',{class:'wl-insight-toggle',type:'button','aria-expanded':String(expanded===stock.ticker),onClick:()=>{expanded=expanded===stock.ticker?null:stock.ticker;draw();}},h('span',{},summaryText(stock)),icon('chevron',15)),sourceBadge(stock),lensPair(stock));}
  function evidenceStrip(stock){return h('div',{class:'wl-expanded'},h('div',{class:'wl-expanded-view'},h('span',{class:'wl-side-label positive'},t('watch.supports')),h('p',{},t(stock.bull))),h('div',{class:'wl-expanded-view'},h('span',{class:'wl-side-label negative'},t('watch.risks')),h('p',{},t(stock.bear))),h('div',{class:'row wl-expanded-links'},link(t('watch.full_research'),stockHref(stock.ticker)),link(t('watch.evidence_map'),stockHref(stock.ticker,'evidence')),button(t('watch.use_reference'),()=>ctx.openAlert(stock.ticker,referenceFor(stock)?.[1]),'btn btn-quiet')),h('p',{class:'small muted'},t('watch.expand_source')));}
  function table(stocks){
    const sortButton=(key,label)=>h('button',{class:'wl-sort',type:'button','data-watch-sort':key,onClick:()=>{direction=sort===key?(direction==='asc'?'desc':'asc'):'asc';sort=key;draw();}},label,h('span',{'aria-hidden':'true'},sort===key?(direction==='asc'?'↑':'↓'):'↕'));
    const tableNode=h('table',{class:'wl-table'},h('thead',{},h('tr',{},h('th',{scope:'col','aria-sort':sort==='ticker'?(direction==='asc'?'ascending':'descending'):'none'},sortButton('ticker',t('watch.column_stock'))),h('th',{scope:'col','aria-sort':sort==='price'?(direction==='asc'?'ascending':'descending'):'none'},sortButton('price',t('watch.column_price'))),h('th',{scope:'col'},t('watch.column_change')),h('th',{scope:'col'},t('watch.column_reference')),h('th',{scope:'col'},t('watch.column_event')),h('th',{scope:'col'},t('watch.column_actions')))));
    const body=h('tbody',{});tableNode.append(body);
    for(const stock of stocks){
      const ref=referenceFor(stock),plan=planFor(stock),gap=ref&&Number.isFinite(stock.price)?(ref[1]/stock.price-1)*100:null;
      body.append(h('tr',{class:expanded===stock.ticker?'wl-selected':''},h('th',{scope:'row'},h('div',{class:'wl-stock-id'},h('span',{class:'wl-stock-monogram',style:'--stock-color:'+stock.color},stock.ticker.slice(0,1)),h('div',{},link(stock.ticker,stockHref(stock.ticker)),h('span',{class:'wl-company small muted'},stock.name))),link(t('watch.map_short'),stockHref(stock.ticker,'evidence'))),h('td',{},quote(stock),h('span',{class:'small muted'},t('watch.saved_close'))),h('td',{class:'wl-summary-cell'},insight(stock)),h('td',{class:'wl-reference-cell'},h('button',{class:'wl-reference-button',type:'button',onClick:()=>ctx.openAlert(stock.ticker,finitePlan(plan)?undefined:ref?.[1])},h('strong',{class:'mono'},shownReference(stock)),h('span',{class:'small muted'},finitePlan(plan)?t('watch.my_plan'):ref?t('watch.technical_reference'):t('watch.set_personal')),finitePlan(plan)?h('span',{class:'small muted'},t('watch.local_plan')):ref&&gap!==null?h('span',{class:'small'},t('watch.distance',{value:percent(gap)})):null)),h('td',{class:'wl-event-cell'},link(stock.eventDate||'—','#/calendar?ticker='+stock.ticker),h('span',{class:'small muted'},stock.event?t(stock.event):t('watch.no_event'))),h('td',{},tools(stock))));
      if(expanded===stock.ticker)body.append(h('tr',{class:'wl-expanded-tr'},h('td',{colSpan:6},evidenceStrip(stock))));
    }
    return h('div',{class:'wl-table-region'},h('p',{class:'wl-scroll-hint small muted'},icon('arrow',14),t('watch.scroll_hint')),h('div',{class:'wl-table-scroll',tabIndex:0,'aria-label':t('watch.table_label')},tableNode));
  }
  function overview(stocks){
    return h('div',{class:'wl-overview-grid'},...stocks.map(stock=>{
      const ownPlan=finitePlan(planFor(stock));
      const planStrip=h('div',{class:'wl-card-plan'},
        h('div',{},h('span',{class:'small muted'},t(ownPlan?'watch.my_plan':'watch.technical_reference')),
          h('strong',{class:'mono'},shownReference(stock))),
        button(t(ownPlan?'watch.edit_plan':'watch.make_plan'),()=>ctx.openAlert(stock.ticker,ownPlan?undefined:referenceFor(stock)?.[1]),'btn btn-quiet'));
      return h('article',{class:'wl-overview-card'},
        h('header',{class:'wl-overview-head'},h('div',{},link(stock.ticker,stockHref(stock.ticker)),h('span',{class:'small muted'},stock.name)),quote(stock)),
        planStrip,metricLinks(stock),
        h('div',{class:'wl-overview-change'},h('span',{class:'eyebrow'},t('watch.latest_change')),h('p',{},summaryText(stock)),sourceBadge(stock)),
        lensPair(stock),h('div',{class:'wl-card-perspectives'},
          h('div',{},h('span',{class:'small positive'},t('watch.supports')),h('p',{},t(stock.bull))),
          h('div',{},h('span',{class:'small negative'},t('watch.risks')),h('p',{},t(stock.bear)))),
        h('div',{class:'wl-card-event'},icon('calendar',16),h('span',{class:'small'},(stock.eventDate||'—')+' · '+(stock.event?t(stock.event):t('watch.no_event')))),
        h('footer',{class:'wl-card-footer'},link(t('watch.full_research'),stockHref(stock.ticker)),link(t('watch.evidence_map'),stockHref(stock.ticker,'evidence')),tools(stock)));
    }));
  }
  function draw(){
    ctx.state.watchUI={view,filter,sort,direction,query,expanded};ctx.save();
    const active=shell.querySelector('input')===document.activeElement;const focusAt=active?shell.querySelector('input').selectionStart:null;
    const scrollLeft=shell.querySelector('.mx-table-scroll,.wl-table-scroll')?.scrollLeft||0;
    const focusedSort=shell.contains(document.activeElement)?document.activeElement?.dataset.watchSort:null;
    shell.replaceChildren();const stocks=selectedStocks();
    shell.append(h('header',{class:'page-heading wl-page-heading'},h('div',{},h('div',{class:'row'},h('h1',{},t('watch.title')),stocks.length?badge(countLabel('watch.count',stocks.length)):null),h('p',{class:'muted'},t(stocks.length?'watch.subtitle':'watch.empty_subtitle'))),stocks.length?button(t('watch.add_stock'),()=>ctx.openSearch(),'btn btn-primary'):null));
    if(!stocks.length){drawEmpty();return;}
    const search=h('input',{class:'wl-filter-input',type:'search',placeholder:t('watch.search'),value:query,'aria-label':t('watch.search'),onInput:event=>{query=event.target.value;draw();}});
    const display=h('div',{class:'segmented',role:'group','aria-label':t('watch.display')},...['list','overview','metrics'].map(key=>h('button',{type:'button',class:view===key?'active':'','aria-pressed':String(view===key),onClick:()=>switchView(key)},icon(key==='list'?'list':'grid',16),t('watch.view_'+key))));
    shell.append(h('div',{class:'wl-toolbar'},filters(stocks),h('div',{class:'row wl-toolbar-right'},h('div',{class:'wl-search-wrap'},icon('search',17),search),display)));
    let shown=stocks.filter(stock=>(!query||[stock.ticker,stock.name].join(' ').toLowerCase().includes(query.toLowerCase()))&&(filter==='all'||filter==='changes'&&changed(stock)||filter==='price'&&nearPlan(stock)||filter==='events'&&eventSoon(stock)));
    shown.sort((a,b)=>{if(sort==='ticker')return a.ticker.localeCompare(b.ticker)*(direction==='asc'?1:-1);const av=metricSortValue(a,sort),bv=metricSortValue(b,sort);if(!Number.isFinite(av))return Number.isFinite(bv)?1:0;if(!Number.isFinite(bv))return -1;return(av-bv)*(direction==='asc'?1:-1);});
    shell.append(h('div',{class:'wl-result-meta small muted'},h('span',{},t('watch.showing',{shown:shown.length,total:stocks.length})),h('span',{},t('watch.example_date'))));
    if(!shown.length)shell.append(h('div',{class:'empty-state'},icon('search',28),h('h2',{},t('watch.no_results')),h('p',{class:'muted'},t('watch.no_results_body')),button(t('watch.clear_filters'),()=>{query='';filter='all';draw();},'btn btn-quiet')));
    else shell.append(view==='list'?table(shown):view==='metrics'?metricsTable(shown,{sort,direction,onSort:key=>{direction=sort===key?(direction==='asc'?'desc':'asc'):'asc';sort=key;draw();}}):overview(shown));
    shell.append(h('div',{class:'wl-bottom-note'},notice(),link(t('watch.see_today'),'#/today')));
    const scrollTable=shell.querySelector('.mx-table-scroll,.wl-table-scroll');if(scrollTable)scrollTable.scrollLeft=scrollLeft;
    if(focusedSort)shell.querySelector('[data-watch-sort="'+focusedSort+'"]')?.focus({preventScroll:true});
    if(active){search.focus({preventScroll:true});try{search.setSelectionRange(focusAt,focusAt);}catch{}}
  }
  draw();
}
