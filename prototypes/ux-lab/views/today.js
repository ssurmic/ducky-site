import {h,t,button,link,badge,icon,money,percent,stockLink,sectionHead,showDialog} from '../ui.js';

const STORIES = [
  {id:'demand',type:'research',ticker:'NVDA',related:['NVDA','MSFT'],time:'09:10',tone:'accent'},
  {id:'memory',type:'earnings',ticker:'MU',related:['MU','AMD'],time:'08:45',tone:'positive'},
  {id:'cloud',type:'viewpoint',ticker:'ORCL',related:['ORCL','MSFT'],time:'08:20',tone:'neutral'},
];
const UPCOMING=[{day:'30',month:'09',id:'memory',ticker:'MU',date:'2026-09-30'},
  {day:'02',month:'10',id:'jobs',ticker:null,date:'2026-10-02'},
  {day:'07',month:'10',id:'minutes',ticker:null,date:'2026-10-07'}];

export function mountToday(root,ctx) {
  let filter='all';
  const mine=()=>new Set(ctx.state.watchlist||[]);
  const watched=()=>ctx.stocks.filter(stock=>mine().has(stock.ticker));
  function readStory(story){
    showDialog({title:t('today.story.'+story.id+'.headline'),content:h('div',{class:'stack today-source-dialog'},
      h('div',{class:'row'},badge(t('today.sample'),'accent'),badge(t('today.type.'+story.type)),stockLink(story.ticker)),
      h('p',{},t('today.story.'+story.id+'.detail')),
      h('section',{},h('h3',{},t('today.evidence')),h('p',{},t('today.story.'+story.id+'.evidence'))),
      h('section',{},h('h3',{},t('today.counter')),h('p',{},t('today.story.'+story.id+'.counter'))),
      h('div',{class:'today-source-note'},icon('info'),h('p',{class:'small muted'},t('today.source_note'))),
      h('div',{class:'row'},link(t('today.open_stock',{ticker:story.ticker}),'#/stock/'+story.ticker,'btn btn-primary'),
        link(t('today.see_authors'),'#/creators','btn btn-quiet')))});
  }
  function storyRow(story,index){
    const isMine=story.related.some(ticker=>mine().has(ticker));
    return h('article',{class:'today-story'},h('span',{class:'today-story-number mono','aria-hidden':'true'},String(index+1).padStart(2,'0')),
      h('div',{class:'today-story-content'},
        h('div',{class:'row today-story-meta'},badge(t('today.type.'+story.type),story.tone),
          h('span',{class:'small muted'},t('today.time',{time:story.time})),isMine?badge(t('today.related_watch'),'accent'):null),
        h('h3',{},button(t('today.story.'+story.id+'.headline'),()=>readStory(story),'today-headline-link')),
        h('p',{class:'today-story-summary'},t('today.story.'+story.id+'.summary')),
        h('div',{class:'today-story-footer'},h('div',{class:'row'},...story.related.map(stockLink)),
          button(t('today.read_evidence'),()=>readStory(story),'text-link today-read-link'))));
  }
  function render(){
    const focusKey=document.activeElement?.dataset.todayFocus;
    const stocks=watched(),selected=filter==='mine'?STORIES.filter(item=>item.related.some(ticker=>mine().has(ticker))):STORIES;
    root.replaceChildren(h('div',{class:'today-page'},
      h('header',{class:'page-heading today-heading'},h('div',{},h('p',{class:'eyebrow'},t('today.date')),h('h1',{},t('today.title')),h('p',{class:'muted'},t('today.subtitle'))),
        link(t('today.calendar_link'),'#/calendar','btn btn-quiet')),
      h('div',{class:'today-market-strip','aria-label':t('today.market_title')},
        ...[['SPY','574.42',0.62],['QQQ','490.80',0.94],['VIX','17.4',-0.8],['US10Y','4.12',0.02]].map(([ticker,value,change])=>
          h('div',{class:'today-market-item'},h('div',{class:'row'},h('span',{class:'small muted'},t('today.market.'+ticker)),h('span',{class:'today-market-sample'},t('today.sample_short'))),
            h('div',{class:'today-market-values'},h('strong',{class:'mono'},ticker==='US10Y'?value+'%':value),
              h('span',{class:'mono small '+(change<0?'negative':'positive')},ticker==='US10Y'?t('today.basis_points',{n:2}):percent(change)))))),
      h('section',{class:'today-lead'},
        h('div',{class:'today-lead-body'},h('div',{class:'row'},h('span',{class:'eyebrow'},t('today.lead_label')),badge(t('today.sample'),'neutral')),
          h('h2',{},t('today.lead_title')),h('p',{},t('today.lead_body')),
          h('div',{class:'row today-lead-links'},stockLink('NVDA'),stockLink('MU'),stockLink('ORCL'),link(t('today.explore_context'),'#/explore'))),
        h('div',{class:'today-lead-focus'},h('span',{class:'eyebrow'},t('today.next_focus')),h('strong',{},t('today.next_focus_title')),
          h('p',{class:'small muted'},t('today.next_focus_body')),link(t('today.inspect_schedule'),'#/calendar?date=2026-10-02'))),
      h('div',{class:'today-columns'},
        h('section',{class:'today-news'},
          sectionHead(t('today.changes'),h('div',{class:'segmented','aria-label':t('today.filter_label')},
            ...['all','mine'].map(value=>h('button',{type:'button',class:filter===value?'active':'','data-today-focus':'filter-'+value,'aria-pressed':String(filter===value),onClick:()=>{filter=value;render();}},t('today.filter.'+value))))),
          h('p',{class:'small muted today-section-intro'},t('today.changes_note')),
          selected.length?h('div',{class:'today-story-list'},...selected.map(storyRow)):
            h('div',{class:'today-inline-empty'},icon('check',24),h('h3',{},t(stocks.length?'today.quiet_title':'today.empty_filter_title')),
              h('p',{class:'muted'},t(stocks.length?'today.quiet_body':'today.empty_filter_body')),
              button(t('today.show_all'),()=>{filter='all';render();},'btn btn-quiet')),
          link(t('today.explore_more'),'#/explore','text-link today-section-bottom')),
        h('aside',{class:'today-sidebar'},
          h('section',{class:'today-watch-section'},sectionHead(t(stocks.length?'today.watch_title':'today.first_watch'),stocks.length?link(t('today.manage'),'#/watchlist'):null),
            stocks.length?h('div',{class:'today-watch-list'},...stocks.slice(0,3).map(stock=>
              h('a',{class:'today-watch-row',href:'#/stock/'+stock.ticker},
                h('div',{class:'row today-watch-row-top'},h('strong',{class:'mono'},stock.ticker),h('span',{class:stock.change<0?'negative':'positive'},percent(stock.change))),
                h('p',{},t(stock.summary)),h('span',{class:'small muted'},t('today.inspect_stock'))))):
              h('div',{class:'today-watch-empty'},h('p',{},t('today.first_watch_body')),
                h('div',{class:'today-starter-list'},...['NVDA','MU','ORCL'].map(ticker=>
                  h('div',{class:'today-starter-row'},stockLink(ticker),h('span',{class:'small muted'},t('today.starter.'+ticker)),
                    h('button',{type:'button',class:'icon-btn','aria-label':t('today.add_stock',{ticker}),onClick:()=>ctx.toggleWatch(ticker)},icon('plus'))))),
                button(t('today.search_stock'),()=>ctx.openSearch(),'btn btn-quiet today-full-button'))),
          h('section',{class:'today-upcoming-section'},sectionHead(t('today.upcoming'),link(t('today.all_events'),'#/calendar')),
            ...UPCOMING.map(event=>h('a',{class:'today-upcoming-row',href:'#/calendar?date='+event.date},
              h('span',{class:'today-date-tile'},h('small',{},t('today.month',{month:event.month})),h('strong',{class:'mono'},event.day)),
              h('span',{class:'today-upcoming-info'},h('strong',{},t('today.event.'+event.id+'.title')),h('span',{class:'small muted'},t('today.event.'+event.id+'.note'))),icon('chevron')))),
          h('p',{class:'small muted today-data-note'},icon('info',14),t('today.fixture_note'))))));
    if(focusKey)root.querySelector('[data-today-focus="'+focusKey+'"]')?.focus({preventScroll:true});
  }
  render();
}
