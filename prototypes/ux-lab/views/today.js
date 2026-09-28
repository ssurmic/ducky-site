import {activityPreview} from './activity.js';
import {h,t,button,link,badge,icon,percent,stockLink,sectionHead,showDialog} from '../ui.js';
import {macroPanel,MACRO_ROWS,fundingBand} from './macro.js';

const STORIES = [
  {id:'demand',type:'research',ticker:'NVDA',related:['NVDA','MSFT'],time:'09:10',tone:'accent'},
  {id:'memory',type:'earnings',ticker:'MU',related:['MU','AMD'],time:'08:45',tone:'positive'},
  {id:'cloud',type:'viewpoint',ticker:'ORCL',related:['ORCL','MSFT'],time:'08:20',tone:'neutral'},
];
const UPCOMING=[{day:'30',month:'09',id:'memory',ticker:'MU',date:'2026-09-30'},
  {day:'02',month:'10',id:'jobs',ticker:null,date:'2026-10-02'},
  {day:'07',month:'10',id:'minutes',ticker:null,date:'2026-10-07'}];

export function mountToday(root,ctx) {
  const todayUI=ctx.state.todayUI&&typeof ctx.state.todayUI==='object'?ctx.state.todayUI:(ctx.state.todayUI={});
  todayUI.filter=['all','mine'].includes(todayUI.filter)?todayUI.filter:'all';
  todayUI.macroExpanded=todayUI.macroExpanded===true;
  if(!todayUI.macro||typeof todayUI.macro!=='object')todayUI.macro={};
  todayUI.macro.primary=todayUI.macro.primary==='yield'?'yield':'liquidity';
  todayUI.macro.index=Number.isInteger(todayUI.macro.index)?Math.max(0,Math.min(MACRO_ROWS.length-1,todayUI.macro.index)):MACRO_ROWS.length-1;
  // macroPanel owns its controls; persist its small UI state without changing shared chart code.
  const macroState=new Proxy(todayUI.macro,{set(target,key,value){
    if(target[key]!==value){target[key]=value;ctx.save();}return true;
  }});
  const mine=()=>new Set(ctx.state.watchlist||[]);
  const watched=()=>ctx.stocks.filter(stock=>mine().has(stock.ticker));
  function setFilter(value){todayUI.filter=value;ctx.save();render();}
  function macroDisclosure(){
    const latest=MACRO_ROWS.at(-1);
    const action=h('span',{class:'today-macro-action'},t(todayUI.macroExpanded?'today.macro_collapse':'today.macro_expand'));
    const body=h('div',{id:'today-macro-panel',class:'today-macro-body',hidden:!todayUI.macroExpanded},macroPanel(ctx,macroState));
    const toggle=h('button',{type:'button',class:'today-macro-toggle','aria-expanded':String(todayUI.macroExpanded),'aria-controls':'today-macro-panel',onClick:()=>{
      todayUI.macroExpanded=!todayUI.macroExpanded;ctx.save();
      body.hidden=!todayUI.macroExpanded;toggle.setAttribute('aria-expanded',String(todayUI.macroExpanded));
      action.textContent=t(todayUI.macroExpanded?'today.macro_collapse':'today.macro_expand');
    }},h('span',{class:'today-macro-entry'},icon('chart',19),h('span',{},h('strong',{},t('today.macro_entry')),h('span',{class:'small muted'},t('today.macro_entry_note')))),
      h('span',{class:'today-macro-entry-meta'},h('span',{class:'mono'},t('macro.score_value',{n:latest.funding_score})),badge(t('macro.band.'+fundingBand(latest.funding_score)),'neutral'),action,icon('chevron',16)));
    return h('section',{class:'today-macro-disclosure'},toggle,body);
  }
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
    const stocks=watched();
    if(!stocks.length)todayUI.filter='all';
    const selected=todayUI.filter==='mine'?STORIES.filter(item=>item.related.some(ticker=>mine().has(ticker))):STORIES;
    root.replaceChildren(h('div',{class:'today-page'},
      h('header',{class:'page-heading today-heading'},h('div',{},h('p',{class:'eyebrow'},t('today.date')),h('h1',{},t('today.title')),h('p',{class:'muted'},t('today.subtitle'))),
        link(t('today.calendar_link'),'#/calendar','btn btn-quiet')),
      h('section',{class:'today-lead'},
        h('div',{class:'today-lead-body'},h('div',{class:'row'},h('span',{class:'eyebrow'},t('today.lead_label')),badge(t('today.sample'),'neutral')),
          h('h2',{},t('today.lead_title')),h('p',{},t('today.lead_body')),
          h('div',{class:'row today-lead-links'},stockLink('NVDA'),stockLink('MU'),stockLink('ORCL'),link(t('today.explore_context'),'#/explore'))),
        stocks.length?h('div',{class:'today-lead-focus'},h('span',{class:'eyebrow'},t('today.next_focus')),h('strong',{},t('today.next_focus_title')),
          h('p',{class:'small muted'},t('today.next_focus_body')),link(t('today.inspect_schedule'),'#/calendar?date=2026-10-02')):
          h('div',{class:'today-lead-focus today-first-task'},h('span',{class:'eyebrow'},t('today.first_task_label')),h('strong',{},t('today.first_task_title')),
            h('p',{class:'small muted'},t('today.first_task_body')),link([t('today.first_task_action'),icon('arrow',16)],'#/stock/NVDA','btn btn-primary'))),
      h('div',{class:'today-market-strip','aria-label':t('today.market_title')},
        ...[['SPY','574.42',0.62],['QQQ','490.80',0.94],['VIX','17.4',-0.8],['US10Y','4.12',0.02]].map(([ticker,value,change])=>
          h('div',{class:'today-market-item'},h('div',{class:'row'},h('span',{class:'small muted'},t('today.market.'+ticker)),h('span',{class:'today-market-sample'},t('today.sample_short'))),
            h('div',{class:'today-market-values'},h('strong',{class:'mono'},ticker==='US10Y'?value+'%':value),
              h('span',{class:'mono small '+(change<0?'negative':'positive')},ticker==='US10Y'?t('today.basis_points',{n:2}):percent(change)))))),
      macroDisclosure(),
      h('div',{class:'today-columns'},
        h('section',{class:'today-news'},
          sectionHead(t('today.changes'),stocks.length?h('div',{class:'segmented','aria-label':t('today.filter_label')},
            ...['all','mine'].map(value=>h('button',{type:'button',class:todayUI.filter===value?'active':'','data-today-focus':'filter-'+value,'aria-pressed':String(todayUI.filter===value),onClick:()=>setFilter(value)},t('today.filter.'+value)))):null),
          h('p',{class:'small muted today-section-intro'},t('today.changes_note')),
          selected.length?h('div',{class:'today-story-list'},...selected.map(storyRow)):
            h('div',{class:'today-inline-empty'},icon('check',24),h('h3',{},t(stocks.length?'today.quiet_title':'today.empty_filter_title')),
              h('p',{class:'muted'},t(stocks.length?'today.quiet_body':'today.empty_filter_body')),
              button(t('today.show_all'),()=>setFilter('all'),'btn btn-quiet')),
          link(t('today.explore_more'),'#/explore','text-link today-section-bottom')),
        h('aside',{class:'today-sidebar'},
          stocks.length?h('section',{class:'today-watch-section'},sectionHead(t('today.watch_title'),link(t('today.manage'),'#/watchlist')),
            h('div',{class:'today-watch-list'},...stocks.slice(0,3).map(stock=>
              h('a',{class:'today-watch-row',href:'#/stock/'+stock.ticker},
                h('div',{class:'row today-watch-row-top'},h('strong',{class:'mono'},stock.ticker),h('span',{class:stock.change<0?'negative':'positive'},percent(stock.change))),
                h('p',{},t(stock.summary)),h('span',{class:'small muted'},t('today.inspect_stock')))))):null,
          h('section',{class:'today-upcoming-section'},sectionHead(t('today.upcoming'),link(t('today.all_events'),'#/calendar')),
            ...UPCOMING.map(event=>h('a',{class:'today-upcoming-row',href:'#/calendar?date='+event.date},
              h('span',{class:'today-date-tile'},h('small',{},t('today.month',{month:event.month})),h('strong',{class:'mono'},event.day)),
              h('span',{class:'today-upcoming-info'},h('strong',{},t('today.event.'+event.id+'.title')),h('span',{class:'small muted'},t('today.event.'+event.id+'.note'))),icon('chevron')))),
          h('p',{class:'small muted today-data-note'},icon('info',14),t('today.fixture_note')))),
      activityPreview(ctx)));
    if(focusKey)root.querySelector('[data-today-focus="'+focusKey+'"]')?.focus({preventScroll:true});
  }
  render();
}
