import {mountActivity,exploreTabs} from './activity.js';
import {h,t,button,link,badge,icon,money,percent,sectionHead,showDialog,toast} from '../ui.js';

const THEMES=[
  {id:'ai',tickers:['NVDA','ORCL','MSFT'],lead:'NVDA',icon:'chart'},
  {id:'memory',tickers:['MU','AMD'],lead:'MU',icon:'map'},
  {id:'platforms',tickers:['META','MSFT'],lead:'META',icon:'users'},
];
const HEAT=[{ticker:'MU',n:104},{ticker:'SPY',n:66},{ticker:'AMD',n:34},{ticker:'META',n:34},{ticker:'NVDA',n:29}];

export function mountExplore(root,ctx,params={}) {
  if(params.query?.get('view')==='activity')return mountActivity(root,ctx,params);
  const prior=ctx.state.exploreUI||{},themes=['all',...THEMES.map(item=>item.id)];
  const routeTheme=params.query?.get('theme');
  let theme=themes.includes(routeTheme)?routeTheme:themes.includes(prior.theme)?prior.theme:'all',
    query=typeof prior.query==='string'?prior.query:'',onlySaved=prior.onlySaved===true,
    sort=['context','ticker','move'].includes(prior.sort)?prior.sort:'context';
  const shell=h('div',{class:'explore-page'});root.append(shell);
  function remember(){
    ctx.state.exploreUI={theme,query,onlySaved,sort};ctx.save();
    if(window.location.hash.split('?')[0]==='#/explore'){
      const route=new URLSearchParams();if(theme!=='all')route.set('theme',theme);
      const hash='#/explore'+(route.size?'?'+route:'');
      if(window.location.hash!==hash)window.history.replaceState(null,'',hash);
    }
  }
  function toggleWatch(ticker){
    remember();ctx.toggleWatch(ticker);
  }
  function toggleSave(id){
    const key='explore:'+id,i=ctx.state.saved.indexOf(key);
    if(i<0)ctx.state.saved.push(key);else ctx.state.saved.splice(i,1);
    ctx.save();toast(t(i<0?'explore.saved_notice':'explore.unsaved_notice'));render();
  }
  function explain(id){
    const item=THEMES.find(x=>x.id===id);
    showDialog({title:t('explore.theme.'+id+'.title'),content:h('div',{class:'stack explore-source-detail'},
      badge(t('explore.illustration'),'accent'),
      h('p',{},t('explore.theme.'+id+'.why')),
      h('div',{},h('h3',{},t('explore.questions')),h('ul',{},
        h('li',{},t('explore.theme.'+id+'.q1')),h('li',{},t('explore.theme.'+id+'.q2')))),
      h('div',{class:'row'},...item.tickers.map(ticker=>link(ticker,'#/stock/'+ticker,'btn btn-quiet'))),
      h('p',{class:'small muted'},t('explore.example_source')),
      link(t('explore.compare_views'),'#/creators?ticker='+item.lead,'text-link'))});
  }
  function render(){
    remember();
    shell.replaceChildren();
    shell.append(h('header',{class:'page-heading explore-heading'},
      h('div',{},h('div',{class:'eyebrow'},t('explore.eyebrow')),h('h1',{},t('explore.title')),h('p',{class:'muted'},t('explore.subtitle'))),
      h('div',{class:'explore-search'},icon('search'),h('input',{type:'search',value:query,placeholder:t('explore.search'),
        'aria-label':t('explore.search'),onInput:e=>{query=e.target.value;renderResults();}}))));
    shell.append(exploreTabs('research'));
    const themes=h('section',{class:'explore-themes','aria-label':t('explore.start')});
    themes.append(sectionHead(t('explore.start'),badge(t('explore.illustration'),'neutral')));
    themes.append(h('div',{class:'explore-theme-grid'},...THEMES.map(item=>{
      const active=theme===item.id;
      return h('article',{class:'explore-theme'+(active?' is-active':'')},
        h('div',{class:'explore-theme-top'},h('span',{class:'explore-theme-icon'},icon(item.icon)),h('span',{class:'small muted'},t('explore.theme.'+item.id+'.label')),
          button(icon(ctx.state.saved.includes('explore:'+item.id)?'check':'bookmark'),()=>toggleSave(item.id),'icon-btn')),
        h('button',{class:'explore-theme-select','aria-pressed':String(active),onClick:()=>{theme=active?'all':item.id;onlySaved=false;render();}},
          h('h3',{},t('explore.theme.'+item.id+'.title')),h('p',{},t('explore.theme.'+item.id+'.why'))),
        h('footer',{},h('span',{class:'mono small'},item.tickers.join(' · ')),button(t('explore.open_question'),()=>explain(item.id),'text-link')));
    })));
    themes.querySelectorAll('.explore-theme-top button').forEach((btn,i)=>btn.setAttribute('aria-label',t(ctx.state.saved.includes('explore:'+THEMES[i].id)?'explore.unsave':'explore.save')+' '+t('explore.theme.'+THEMES[i].id+'.title')));
    shell.append(themes);
    const results=h('div',{class:'explore-results'});shell.append(results);renderResults();
    function renderResults(){
      remember();
      const target=shell.querySelector('.explore-results');if(!target)return;
      const term=query.trim().toLowerCase();
      const currentTheme=THEMES.find(x=>x.id===theme);
      let stocks=ctx.stocks.filter(stock=>(!currentTheme||currentTheme.tickers.includes(stock.ticker))&&
        (!onlySaved||ctx.state.watchlist.includes(stock.ticker))&&(!term||[stock.ticker,stock.name,t(stock.summary),t(stock.sector)].join(' ').toLowerCase().includes(term)));
      if(sort==='ticker')stocks=[...stocks].sort((a,b)=>a.ticker.localeCompare(b.ticker));
      if(sort==='move')stocks=[...stocks].sort((a,b)=>(b.change??-Infinity)-(a.change??-Infinity));
      target.replaceChildren();
      const scope=h('div',{class:'explore-scope'},h('div',{class:'row'},...[
        ['all','explore.all'],...THEMES.map(x=>[x.id,'explore.theme.'+x.id+'.label'])].map(([id,key])=>
        h('button',{class:'chip'+(theme===id?' active':''),'aria-pressed':String(theme===id),onClick:()=>{theme=id;render();}},t(key)))),
        h('button',{class:'chip'+(onlySaved?' active':''),'aria-pressed':String(onlySaved),onClick:()=>{onlySaved=!onlySaved;renderResults();}},icon('star',15),t('explore.watchlist_only')));
      target.append(scope);
      const main=h('div',{class:'explore-body'}),list=h('section',{class:'explore-stock-section'});
      list.append(sectionHead(t('explore.research_list'),h('label',{class:'explore-sort'},h('span',{class:'sr-only'},t('explore.sort')),
        h('select',{value:sort,'aria-label':t('explore.sort'),onChange:e=>{sort=e.target.value;renderResults();}},
          ...['context','ticker','move'].map(value=>h('option',{value,selected:sort===value},t('explore.sort_'+value)))))));
      list.append(h('p',{class:'small muted explore-result-context'},currentTheme?t('explore.filtered',{theme:t('explore.theme.'+theme+'.label')}):t('explore.list_note')));
      if(!stocks.length)list.append(h('div',{class:'empty-state'},icon('search',28),h('h3',{},t(onlySaved&&!ctx.state.watchlist.length?'explore.empty_watch_title':'explore.no_results')),
        h('p',{class:'muted'},t(onlySaved&&!ctx.state.watchlist.length?'explore.empty_watch':'explore.no_results_note')),
        button(t('explore.clear'),()=>{query='';theme='all';onlySaved=false;render();},'btn btn-primary')));
      else{
        const table=h('div',{class:'explore-stock-list'});
        for(const stock of stocks){
          const watched=ctx.state.watchlist.includes(stock.ticker);
          const row=h('article',{class:'explore-stock-row'},
            h('div',{class:'explore-stock-identity'},h('a',{href:'#/stock/'+stock.ticker,class:'explore-stock-symbol mono'},stock.ticker),
              h('span',{class:'small muted'},stock.name),h('span',{class:'explore-stock-sector small'},t(stock.sector))),
            h('div',{class:'explore-stock-context'},link(t(stock.summary),'#/stock/'+stock.ticker,'explore-stock-gist'),
              h('div',{class:'explore-stock-next small muted'},icon('calendar',14),h('span',{},(stock.eventDate?stock.eventDate+' · ':'')+t(stock.event)))),
            h('div',{class:'explore-stock-price'},h('strong',{class:'mono'},stock.price==null?'—':money(stock.price)),
              h('span',{class:'mono small '+(stock.change>0?'positive':stock.change<0?'negative':'muted')},stock.change==null?'—':percent(stock.change))),
            h('div',{class:'explore-stock-actions'},button(watched?icon('check'):icon('plus'),()=>toggleWatch(stock.ticker),'icon-btn'+(watched?' is-watched':'')),
              h('a',{href:'#/stock/'+stock.ticker,class:'icon-btn','aria-label':t('explore.research_stock',{ticker:stock.ticker})},icon('arrow'))));
          row.querySelector('button').setAttribute('aria-label',t(watched?'explore.remove_watch':'explore.add_watch',{ticker:stock.ticker}));table.append(row);
        }
        list.append(table,h('p',{class:'explore-price-note small muted'},t('explore.price_note')));
      }
      const aside=h('aside',{class:'explore-aside'});
      aside.append(h('section',{class:'explore-side-section'},sectionHead(t('explore.authors_title'),link(t('explore.see_all'),'#/creators')),
        h('p',{class:'muted small'},t('explore.authors_note')),
        ...['nvda','orcl'].map((id,i)=>h('a',{href:'#/creators?ticker='+(i===0?'NVDA':'ORCL'),class:'explore-view-preview'},
          h('div',{class:'row'},badge(i===0?'NVDA':'ORCL'),h('span',{class:'small muted'},t('explore.view.'+id+'.author'))),
          h('p',{},t('explore.view.'+id+'.text')),h('span',{class:'small text-link'},t('explore.compare_views')+' →')))));
      aside.append(h('section',{class:'explore-side-section'},sectionHead(t('explore.next_title'),null),h('p',{},t('explore.next_text')),
        link(t('explore.open_calendar'),'#/calendar','btn btn-quiet')));
      main.append(list,aside);target.append(main);
      target.append(h('section',{class:'explore-heat'},h('div',{class:'explore-heat-heading'},h('h2',{},t('explore.heat_title')),h('p',{class:'small muted'},t('explore.heat_note'))),
        h('div',{class:'explore-heat-list'},...HEAT.map((row,i)=>h('button',{class:'explore-heat-item',onClick:()=>{
          if(ctx.stock(row.ticker))ctx.navigate('stock/'+row.ticker);else{
            const dialog=showDialog({title:row.ticker,content:h('div',{class:'stack'},h('p',{},t('explore.spy_notice')),button(t('explore.see_stocks'),()=>{dialog.close();query='';theme='all';onlySaved=false;render();},'btn btn-primary'))});
          }
        }},h('span',{class:'muted small'},String(i+1).padStart(2,'0')),h('strong',{class:'mono'},row.ticker),h('span',{class:'small'},t('explore.mentions',{n:row.n})))))));
    }
  }
  render();
}
