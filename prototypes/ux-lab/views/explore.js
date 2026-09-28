import {mountActivity,exploreTabs,activityHref} from './activity.js';
import {metricsTable,metricSortValue} from './metrics.js';
import {h,t,button,link,badge,icon,money,percent,sectionHead,showDialog} from '../ui.js';

const THEMES=[
  {id:'ai',tickers:['NVDA','ORCL','MSFT'],lead:'NVDA',icon:'chart'},
  {id:'memory',tickers:['MU','AMD'],lead:'MU',icon:'map'},
  {id:'platforms',tickers:['META','MSFT'],lead:'META',icon:'users'},
];
const HEAT=[{ticker:'MU',n:104},{ticker:'SPY',n:66},{ticker:'AMD',n:34},{ticker:'META',n:34},{ticker:'NVDA',n:29}];
const METRIC_SORTS=['ticker','price','put','low20','ratio','degen'];
const finite=Number.isFinite;
const stockHref=(ticker,tab='overview')=>'#/stock/'+encodeURIComponent(ticker)+'?tab='+tab;

export function mountExplore(root,ctx,params={}) {
  if(params.query?.get('view')==='activity')return mountActivity(root,ctx,params);
  const prior=ctx.state.exploreUI||{},themes=['all',...THEMES.map(item=>item.id)];
  const routeTheme=params.query?.get('theme'),routeView=params.query?.get('view');
  let theme=themes.includes(routeTheme)?routeTheme:themes.includes(prior.theme)?prior.theme:'all',
    query=typeof prior.query==='string'?prior.query:'',onlySaved=prior.onlySaved===true,
    sort=['context','ticker','move'].includes(prior.sort)?prior.sort:'context',
    view=['summary','metrics'].includes(routeView)?routeView:prior.view==='metrics'?'metrics':'summary',
    metricSort=METRIC_SORTS.includes(prior.metricSort)?prior.metricSort:'ticker',
    direction=prior.direction==='desc'?'desc':'asc',filtersOpen=prior.filtersOpen===true,
    metricsScrollLeft=finite(prior.metricsScrollLeft)?prior.metricsScrollLeft:0;
  const shell=h('div',{class:'explore-page'});root.append(shell);
  function remember(syncRoute=true){
    ctx.state.exploreUI={theme,query,onlySaved,sort,view,metricSort,direction,filtersOpen,metricsScrollLeft};ctx.save();
    if(syncRoute&&window.location.hash.split('?')[0]==='#/explore'){
      const route=new URLSearchParams();if(theme!=='all')route.set('theme',theme);if(view==='metrics')route.set('view',view);
      const hash='#/explore'+(route.size?'?'+route:'');
      if(window.location.hash!==hash)ctx.replaceRoute(hash);
    }
  }
  function reset(){query='';theme='all';onlySaved=false;filtersOpen=false;render();shell.querySelector('input')?.focus({preventScroll:true});}
  function toggleWatch(ticker){remember();ctx.toggleWatch(ticker);}
  function explain(id){
    const item=THEMES.find(x=>x.id===id);
    showDialog({title:t('explore.theme.'+id+'.title'),content:h('div',{class:'stack explore-source-detail'},
      badge(t('explore.illustration'),'accent'),h('p',{},t('explore.theme.'+id+'.why')),
      h('div',{},h('h3',{},t('explore.questions')),h('ul',{},
        h('li',{},t('explore.theme.'+id+'.q1')),h('li',{},t('explore.theme.'+id+'.q2')))),
      h('div',{class:'row'},...item.tickers.map(ticker=>link(ticker,stockHref(ticker),'btn btn-quiet'))),
      h('p',{class:'small muted'},t('explore.example_source')),
      link(t('explore.compare_views'),'#/creators?ticker='+item.lead,'text-link'))});
  }
  function themeFilter(){
    const panel=h('details',{class:'explore-theme-filter',open:filtersOpen,onToggle:e=>{
      if(e.currentTarget.isConnected){filtersOpen=e.currentTarget.open;remember();}
    }},h('summary',{'data-explore-focus':'themes'},icon('filter',16),h('span',{},t('explore.filter_theme')),
      h('strong',{},t(theme==='all'?'explore.all_themes':'explore.theme.'+theme+'.label')),icon('chevron',15)));
    panel.append(h('div',{class:'explore-theme-options'},...THEMES.map(item=>h('article',{class:'explore-theme'+(theme===item.id?' is-active':'')},
      h('div',{class:'explore-theme-main'},h('span',{class:'small muted'},t('explore.theme.'+item.id+'.label')),
        h('button',{class:'explore-theme-question',onClick:()=>explain(item.id)},t('explore.theme.'+item.id+'.title')),
        h('span',{class:'small mono muted'},item.tickers.join(' · '))),
      h('button',{class:'btn btn-quiet explore-theme-select','aria-pressed':String(theme===item.id),onClick:()=>{
        theme=item.id;onlySaved=false;filtersOpen=false;renderResults('themes');
      }},t('explore.filter_stocks'))))));
    return panel;
  }
  function getStocks(){
    const term=query.trim().toLowerCase(),currentTheme=THEMES.find(x=>x.id===theme);
    const rows=ctx.stocks.filter(stock=>(!currentTheme||currentTheme.tickers.includes(stock.ticker))&&
      (!onlySaved||ctx.state.watchlist.includes(stock.ticker))&&(!term||[stock.ticker,stock.name,t(stock.summary),t(stock.sector)].join(' ').toLowerCase().includes(term)));
    if(view==='metrics')rows.sort((a,b)=>{
      if(metricSort==='ticker')return a.ticker.localeCompare(b.ticker)*(direction==='asc'?1:-1);
      const left=metricSortValue(a,metricSort),right=metricSortValue(b,metricSort);
      if(!finite(left))return finite(right)?1:a.ticker.localeCompare(b.ticker);
      if(!finite(right))return -1;
      return(left-right)*(direction==='asc'?1:-1)||a.ticker.localeCompare(b.ticker);
    });
    else if(sort==='ticker')rows.sort((a,b)=>a.ticker.localeCompare(b.ticker));
    else if(sort==='move')rows.sort((a,b)=>{
      if(!finite(a.change))return finite(b.change)?1:a.ticker.localeCompare(b.ticker);
      if(!finite(b.change))return -1;
      return b.change-a.change||a.ticker.localeCompare(b.ticker);
    });
    return rows;
  }
  function stockRow(stock){
    const watched=ctx.state.watchlist.includes(stock.ticker);
    return h('article',{class:'explore-stock-row','data-ticker':stock.ticker},
      h('div',{class:'explore-stock-identity'},link(stock.ticker,stockHref(stock.ticker),'explore-stock-symbol mono'),
        h('span',{class:'small muted'},stock.name),h('span',{class:'explore-stock-sector small'},t(stock.sector))),
      h('div',{class:'explore-stock-context'},link(t(stock.summary),stockHref(stock.ticker),'explore-stock-gist'),
        h('div',{class:'explore-stock-next small muted'},icon('calendar',14),link((stock.eventDate?stock.eventDate+' · ':'')+t(stock.event),'#/calendar?ticker='+stock.ticker,'explore-event-link'))),
      h('div',{class:'explore-stock-price'},h('strong',{class:'mono'},money(stock.price)),
        h('span',{class:'mono small '+(stock.change>0?'positive':stock.change<0?'negative':'muted')},percent(stock.change))),
      h('div',{class:'explore-stock-actions'},h('button',{class:'icon-btn'+(watched?' is-watched':''),'data-explore-focus':'follow-'+stock.ticker,'data-focus':'explore-follow-'+stock.ticker,
        'aria-label':t(watched?'explore.remove_watch':'explore.add_watch',{ticker:stock.ticker}),'aria-pressed':String(watched),onClick:()=>toggleWatch(stock.ticker)},icon(watched?'check':'plus'))),
      h('nav',{class:'explore-stock-routes','aria-label':t('explore.stock_destinations',{ticker:stock.ticker})},
        ...[['overview','open_overview'],['metrics','open_metrics'],['evidence','open_map']].map(([tab,key])=>link(t('explore.'+key),stockHref(stock.ticker,tab),'text-link')),
        link(t('explore.open_activity'),activityHref(stock.ticker),'text-link explore-stock-activity')));
  }
  function related(){
    return h('aside',{class:'explore-aside'},h('section',{class:'explore-side-section'},sectionHead(t('explore.authors_title'),link(t('explore.see_all'),'#/creators')),
      h('p',{class:'muted small'},t('explore.authors_note')),
      ...['nvda','orcl'].map((id,i)=>h('a',{href:'#/creators?ticker='+(i===0?'NVDA':'ORCL'),class:'explore-view-preview'},
        h('div',{class:'row'},badge(i===0?'NVDA':'ORCL'),h('span',{class:'small muted'},t('explore.view.'+id+'.author'))),
        h('p',{},t('explore.view.'+id+'.text')),h('span',{class:'small text-link'},t('explore.compare_views')+' →')))),
      h('section',{class:'explore-side-section'},sectionHead(t('explore.next_title'),null),h('p',{},t('explore.next_text')),
        link(t('explore.open_calendar'),'#/calendar','btn btn-quiet')));
  }
  function heat(){return h('section',{class:'explore-heat'},h('div',{class:'explore-heat-heading'},h('h2',{},t('explore.heat_title')),h('p',{class:'small muted'},t('explore.heat_note'))),
    h('div',{class:'explore-heat-list'},...HEAT.map((row,i)=>h('button',{class:'explore-heat-item',onClick:()=>{
      if(ctx.stock(row.ticker))ctx.navigate('stock/'+row.ticker+'?tab=overview');else{
        const dialog=showDialog({title:row.ticker,content:h('div',{class:'stack'},h('p',{},t('explore.spy_notice')),button(t('explore.see_stocks'),()=>{dialog.close();reset();},'btn btn-primary'))});
      }
    }},h('span',{class:'muted small'},String(i+1).padStart(2,'0')),h('strong',{class:'mono'},row.ticker),h('span',{class:'small'},t('explore.mentions',{n:row.n}))))));}
  function renderResults(restoreFocus){
    const target=shell.querySelector('.explore-results');if(!target)return;
    const focused=document.activeElement,focusKey=restoreFocus||focused?.dataset.exploreFocus,sortKey=focused?.dataset.watchSort;
    const oldScroll=target.querySelector('.mx-table-scroll');if(oldScroll)metricsScrollLeft=oldScroll.scrollLeft;
    const pageY=window.scrollY;remember();target.replaceChildren();
    const toolbar=h('div',{class:'explore-toolbar'},h('div',{class:'segmented',role:'group','aria-label':t('explore.display')},...['summary','metrics'].map(value=>
      h('button',{type:'button',class:view===value?'active':'','aria-pressed':String(view===value),'data-explore-focus':'view-'+value,onClick:()=>{view=value;renderResults();}},icon(value==='metrics'?'grid':'list',16),t('explore.view_'+value)))),
      view==='summary'?h('label',{class:'explore-sort'},h('span',{class:'sr-only'},t('explore.sort')),h('select',{value:sort,'aria-label':t('explore.sort'),'data-explore-focus':'sort',onChange:e=>{sort=e.target.value;renderResults();}},
        ...['context','ticker','move'].map(value=>h('option',{value,selected:sort===value},t('explore.sort_'+value))))):h('span',{class:'small muted explore-sort-hint'},t('explore.sort_hint')));
    target.append(toolbar);
    const filterline=h('div',{class:'explore-filterline'},themeFilter(),h('button',{class:'chip'+(onlySaved?' active':''),'aria-pressed':String(onlySaved),'data-explore-focus':'scope',onClick:()=>{onlySaved=!onlySaved;renderResults();}},icon('star',14),t('explore.watchlist_only')));
    target.append(filterline);
    const stocks=getStocks(),meta=h('div',{class:'explore-result-meta small muted'},h('span',{role:'status'},t('explore.result_count',{n:stocks.length})),h('span',{},t('explore.result_date')));
    if(theme!=='all'||onlySaved||query)meta.append(h('button',{class:'text-link','data-explore-focus':'clear',onClick:reset},t('explore.reset_filters')));
    target.append(meta);
    const list=h('section',{class:'explore-stock-section','aria-label':t('explore.research_list')});
    if(!stocks.length)list.append(h('div',{class:'empty-state'},icon('search',28),h('h3',{},t(onlySaved&&!ctx.state.watchlist.length?'explore.empty_watch_title':'explore.no_results')),
      h('p',{class:'muted'},t(onlySaved&&!ctx.state.watchlist.length?'explore.empty_watch':'explore.no_results_note')),button(t('explore.clear'),reset,'btn btn-primary')));
    else if(view==='metrics')list.append(metricsTable(stocks,{sort:metricSort,direction,onSort:key=>{
      direction=metricSort===key?(direction==='asc'?'desc':'asc'):'asc';metricSort=key;renderResults();
    }}));
    else list.append(h('div',{class:'explore-stock-list'},...stocks.map(stockRow)),h('p',{class:'explore-price-note small muted'},t('explore.price_note')));
    target.append(list,related(),heat());
    const scroller=target.querySelector('.mx-table-scroll');if(scroller){scroller.scrollLeft=metricsScrollLeft;scroller.addEventListener('scroll',()=>{metricsScrollLeft=scroller.scrollLeft;},{passive:true});}
    if(focusKey)target.querySelector('[data-explore-focus="'+focusKey+'"]')?.focus({preventScroll:true});
    else if(sortKey)target.querySelector('[data-watch-sort="'+sortKey+'"]')?.focus({preventScroll:true});
    if(pageY)window.scrollTo(0,pageY);
  }
  function render(){
    remember();const active=shell.querySelector('input')===document.activeElement,caret=active?document.activeElement.selectionStart:null;
    shell.replaceChildren();
    const input=h('input',{type:'search',value:query,placeholder:t('explore.search'),'aria-label':t('explore.search'),onInput:e=>{query=e.target.value;renderResults();}});
    shell.append(h('header',{class:'page-heading explore-heading'},h('div',{},h('h1',{},t('explore.title')),h('p',{class:'muted'},t('explore.subtitle'))),
      h('div',{class:'explore-search'},icon('search'),input)),exploreTabs('research'),h('div',{class:'explore-results'}));
    renderResults();if(active){input.focus({preventScroll:true});try{input.setSelectionRange(caret,caret);}catch{}}
  }
  render();return()=>remember(false);
}
