import {h,t,button,link,badge,icon,stockLink,sectionHead,showDialog,percent} from '../ui.js';

const DAY=86400000,BASE='2026-09-28';
const EVENTS=[
  {id:'confidence',date:'2026-09-29',time:'10:00',category:'macro',tickers:['META','MSFT'],key:false,status:'scheduled'},
  {id:'memory',date:'2026-09-30',time:'16:15',category:'earnings',tickers:['MU','AMD'],key:true,status:'estimated'},
  {id:'quarter',date:'2026-09-30',time:null,category:'market',tickers:[],key:false,status:'scheduled'},
  {id:'jobs',date:'2026-10-02',time:'08:30',category:'macro',tickers:['NVDA','MSFT','META'],key:true,status:'scheduled'},
  {id:'minutes',date:'2026-10-07',time:'14:00',category:'macro',tickers:['NVDA','ORCL','MSFT'],key:true,status:'scheduled'},
  {id:'cloud',date:'2026-10-08',time:null,category:'company',tickers:['ORCL','MSFT'],key:false,status:'unconfirmed'},
  {id:'inflation',date:'2026-10-09',time:'08:30',category:'macro',tickers:['NVDA','AMD','META'],key:false,status:'estimated'}
];
const ymd=date=>date.toISOString().slice(0,10),asDate=day=>new Date(day+'T12:00:00Z');
const shift=(day,n)=>ymd(new Date(asDate(day).getTime()+n*DAY));

export function mountCalendar(root,ctx,params={}){
  const requested=params.query?.get('date');
  let tickerScope=ctx.stock((params.query?.get('ticker')||'').toUpperCase())?.ticker||'';
  let selected=/^2026-(09|10)-\d{2}$/.test(requested||'')&&Number.isFinite(asDate(requested).getTime())&&ymd(asDate(requested))===requested?requested:BASE;
  if(!requested&&tickerScope)selected=EVENTS.find(event=>event.tickers.includes(tickerScope)&&event.status!=='unconfirmed')?.date||BASE;
  let start=BASE,view='biweekly',category='all',mineOnly=false;
  if(selected<start||selected>shift(start,13))start=shift(selected,-((asDate(selected).getUTCDay()+6)%7));
  const locale=()=>ctx.state.lang==='en'?'en-US':'zh-CN';
  const dateLabel=(day,options={month:'short',day:'numeric'})=>new Intl.DateTimeFormat(locale(),{...options,timeZone:'UTC'}).format(asDate(day));
  const relevant=event=>event.tickers.some(ticker=>(ctx.state.watchlist||[]).includes(ticker));
  const events=()=>EVENTS.filter(event=>(!tickerScope||event.tickers.includes(tickerScope)||event.category==='market')&&(category==='all'||event.category===category)&&(!mineOnly||event.category==='macro'||event.category==='market'||relevant(event)));
  const timing=event=>event.time?event.time+' ET':t(event.status==='unconfirmed'?'calendar.time_unconfirmed':'calendar.all_day');
  const tone=event=>event.category==='earnings'?'accent':event.category==='macro'?'neutral':'positive';

  function eventDetails(event){
    const samples=[{date:'2026-06-05',value:1.2},{date:'2026-05-08',value:-2.1},{date:'2026-04-03',value:0.3},{date:'2026-03-06',value:-0.8},{date:'2026-02-06',value:2.4},{date:'2026-01-09',value:-1.3}];
    const history=h('section',{class:'cal-dialog-history'},
      sectionHead(t('calendar.history_title'),badge(t('calendar.history_sample'),'neutral')),
      h('p',{class:'small muted'},t('calendar.history_note')),
      h('div',{class:'cal-history-summary'},h('div',{},h('span',{class:'small muted'},t('calendar.history_n')),h('strong',{class:'mono'},'6')),
        h('div',{},h('span',{class:'small muted'},t('calendar.history_range')),h('strong',{class:'mono'},'−2.1% / +2.4%')),
        h('div',{},h('span',{class:'small muted'},t('calendar.history_down')),h('strong',{class:'mono'},'3 / 6'))),
      h('div',{class:'cal-history-bars'},...samples.map(sample=>h('div',{class:'cal-history-row'},h('span',{class:'small muted'},dateLabel(sample.date,{month:'short',day:'numeric'})),
        h('span',{class:'cal-history-track'},h('span',{class:'cal-history-bar '+(sample.value<0?'is-negative':'is-positive'),style:'--bar-width:'+Math.round(Math.abs(sample.value)/2.4*46)+'%'})),
        h('span',{class:'mono small '+(sample.value<0?'negative':'positive')},percent(sample.value))))),
      h('p',{class:'small muted cal-history-caveat'},t('calendar.history_caveat')));
    showDialog({title:t('calendar.event.'+event.id+'.title'),wide:true,content:h('div',{class:'stack cal-event-dialog'},
      h('div',{class:'row'},badge(t('calendar.sample'),'accent'),badge(t('calendar.category.'+event.category)),
        h('span',{class:'small muted'},event.status==='unconfirmed'?t('calendar.date_unconfirmed'):dateLabel(event.date,{month:'long',day:'numeric',weekday:'long'})+' · '+timing(event))),
      h('p',{class:'cal-dialog-status'},icon('clock',16),t('calendar.status.'+event.status)),
      h('section',{class:'cal-dialog-impact'},h('span',{class:'eyebrow'},t('calendar.why_title')),h('p',{},t('calendar.event.'+event.id+'.impact'))),
      h('div',{class:'cal-dialog-columns'},h('section',{},h('h3',{},t('calendar.watch_for')),h('p',{},t('calendar.event.'+event.id+'.watch'))),
        h('section',{},h('h3',{},t('calendar.risk')),h('p',{},t('calendar.event.'+event.id+'.risk')))),
      h('section',{},h('h3',{},t('calendar.related_stocks')),
        event.tickers.length?h('div',{class:'row cal-dialog-stocks'},...event.tickers.map(ticker=>h('div',{class:'cal-related-stock'},stockLink(ticker),
          h('span',{class:'small muted'},t(event.category==='earnings'&&ticker===event.tickers[0]?'calendar.relation_direct':event.category==='macro'?'calendar.relation_market':'calendar.relation_peer'))))):h('p',{class:'muted small'},t('calendar.market_wide')),
        h('p',{class:'small muted'},t('calendar.relation_note'))),
      h('details',{class:'cal-history-disclosure'},h('summary',{},t('calendar.open_history')),history),
      h('details',{class:'cal-source-disclosure'},h('summary',{},t('calendar.sources')),h('p',{class:'small muted'},t('calendar.source_note')),
        h('div',{class:'cal-source-row'},icon('info',16),h('div',{},h('strong',{},t('calendar.source_name')),h('p',{class:'small muted'},t('calendar.source_date'))))),
      h('div',{class:'row'},...(event.tickers.length?[link(t('calendar.research_stock',{ticker:event.tickers[0]}),'#/stock/'+event.tickers[0],'btn btn-primary')]:[]),
        link(t('calendar.browse_context'),'#/explore','btn btn-quiet')))});
  }

  function eventRow(event){
    return h('article',{class:'cal-agenda-row'},h('div',{class:'cal-agenda-time'},h('strong',{class:'mono'},timing(event)),h('span',{class:'small muted'},t('calendar.category.'+event.category))),
      h('div',{class:'cal-agenda-content'},h('div',{class:'row'},button(t('calendar.event.'+event.id+'.title'),()=>eventDetails(event),'cal-event-title'),
        event.status!=='scheduled'?badge(t('calendar.short_status.'+event.status),'neutral'):null,relevant(event)?badge(t('calendar.watched'),'accent'):null),
        h('p',{},t('calendar.event.'+event.id+'.impact')),h('div',{class:'row'},...event.tickers.map(stockLink))),
      h('button',{type:'button',class:'icon-btn cal-agenda-open','aria-label':t('calendar.open_event',{event:t('calendar.event.'+event.id+'.title')}),onClick:()=>eventDetails(event)},icon('arrow')));
  }
  function dayCell(day,outside=false){
    const rows=events().filter(event=>event.date===day&&event.status!=='unconfirmed');
    const date=asDate(day),weekend=[0,6].includes(date.getUTCDay());
    return h('button',{type:'button',class:['cal-day',selected===day?'selected':'',day===BASE?'today':'',weekend?'weekend':'',outside?'outside':''].filter(Boolean).join(' '),
      'data-cal-focus':'day-'+day,'aria-pressed':String(selected===day),'aria-label':t('calendar.day_label',{date:dateLabel(day,{month:'long',day:'numeric',weekday:'long'}),n:rows.length}),
      onClick:()=>{selected=day;render();}},
      h('span',{class:'cal-day-heading'},h('strong',{class:'mono'},String(date.getUTCDate())),day===BASE?h('span',{class:'cal-today-mark'},t('calendar.today_short')):null),
      rows.length?h('span',{class:'cal-day-events'},...rows.slice(0,3).map(event=>h('span',{class:'cal-day-event '+(event.category==='earnings'?'is-earnings':''),title:t('calendar.event.'+event.id+'.title')},
        h('i',{'aria-hidden':'true',class:'cal-event-dot '+event.category}),t('calendar.event.'+event.id+'.short'))),
        rows.length>3?h('span',{class:'small muted'},t('calendar.more_events',{n:rows.length-3})):null):h('span',{class:'cal-day-empty','aria-hidden':'true'},'—'));
  }
  function grid(){
    let days=[];
    if(view==='month'){
      const first=start.slice(0,7)+'-01',lead=(asDate(first).getUTCDay()+6)%7;
      const offset=shift(first,-lead),next=new Date(asDate(first));next.setUTCMonth(next.getUTCMonth()+1);
      const length=Math.ceil((lead+new Date(next.getTime()-DAY).getUTCDate())/7)*7;
      days=Array.from({length},(_,n)=>shift(offset,n));
    }else days=Array.from({length:14},(_,n)=>shift(start,n));
    return h('div',{class:'cal-grid-wrap '+(view==='month'?'is-month':'is-biweekly')},
      h('div',{class:'cal-weekdays','aria-hidden':'true'},...[0,1,2,3,4,5,6].map(index=>h('span',{},t('calendar.weekday.'+index)))),
      h('div',{class:'cal-grid'},...days.map(day=>dayCell(day,view==='month'&&day.slice(0,7)!==start.slice(0,7)))));
  }
  function changePeriod(direction){
    if(view==='month'){
      const date=asDate(start.slice(0,7)+'-01');date.setUTCMonth(date.getUTCMonth()+direction);start=ymd(date);selected=start;
    }else{start=shift(start,14*direction);selected=start;}
    render();
  }
  function render(){
    const focusKey=document.activeElement?.dataset.calFocus;
    const end=shift(start,13),inPeriod=events().filter(event=>event.date>=start&&event.date<=end&&event.status!=='unconfirmed');
    const highlights=inPeriod.filter(event=>event.key).slice(0,3);
    const selectionEvents=events().filter(event=>event.date===selected&&event.status!=='unconfirmed');
    const tentative=events().filter(event=>event.status==='unconfirmed');
    const periodTitle=view==='month'?dateLabel(start,{month:'long',year:'numeric'}):dateLabel(start)+' – '+dateLabel(end);
    root.replaceChildren(h('div',{class:'calendar-page'},
      h('header',{class:'page-heading calendar-heading'},h('div',{},h('p',{class:'eyebrow'},t('calendar.eyebrow')),h('h1',{},t('calendar.title')),h('p',{class:'muted'},t('calendar.subtitle'))),
        h('div',{class:'cal-zone'},icon('clock',15),h('span',{},t('calendar.timezone')),badge(t('calendar.sample'),'neutral'))),
      tickerScope?h('div',{class:'cal-scope-banner'},h('div',{class:'row'},stockLink(tickerScope),h('span',{},t('calendar.ticker_scope'))),
        button(t('calendar.clear_scope'),()=>{tickerScope='';const query=new URLSearchParams(params.query);query.delete('ticker');history.replaceState(null,'','#/calendar'+(query.size?'?'+query:''));render();},'btn btn-quiet')):null,
      h('section',{class:'cal-focus-section'},sectionHead(t('calendar.focus_title'),h('span',{class:'small muted'},t('calendar.focus_scope'))),
        highlights.length?h('div',{class:'cal-focus-grid'},...highlights.map(event=>h('button',{type:'button',class:'cal-focus-card',onClick:()=>eventDetails(event)},
          h('span',{class:'cal-focus-top'},h('span',{class:'cal-focus-date'},dateLabel(event.date,{month:'short',day:'numeric',weekday:'short'})),h('span',{class:'small muted'},timing(event))),
          h('strong',{},t('calendar.event.'+event.id+'.title')),h('p',{},t('calendar.event.'+event.id+'.impact')),
          h('span',{class:'cal-focus-bottom'},h('span',{class:'cal-focus-symbols'},...event.tickers.slice(0,2).map(ticker=>h('span',{class:'mono'},ticker))),icon('arrow',16))))):
          h('div',{class:'cal-focus-empty'},h('p',{class:'muted'},t('calendar.no_highlights')),button(t('calendar.reset_period'),()=>{start=BASE;selected=BASE;category='all';mineOnly=false;render();},'text-link'))),
      h('section',{class:'cal-calendar-section'},
        h('div',{class:'cal-toolbar'},h('div',{class:'cal-period-control'},
          h('button',{type:'button',class:'icon-btn','aria-label':t('calendar.previous'),onClick:()=>changePeriod(-1)},h('span',{'aria-hidden':'true'},'←')),
          h('h2',{},periodTitle),h('button',{type:'button',class:'icon-btn','aria-label':t('calendar.next'),onClick:()=>changePeriod(1)},h('span',{'aria-hidden':'true'},'→')),
          button(t('calendar.this_period'),()=>{start=BASE;selected=BASE;render();},'btn btn-quiet cal-reset')),
          h('div',{class:'segmented cal-view-switch','aria-label':t('calendar.view_label')},...['biweekly','month','agenda'].map(value=>h('button',{type:'button',class:view===value?'active':'','data-cal-focus':'view-'+value,'aria-pressed':String(view===value),onClick:()=>{view=value;start=value==='month'?selected.slice(0,7)+'-01':shift(selected,-((asDate(selected).getUTCDay()+6)%7));render();}},t('calendar.view.'+value))))),
        h('div',{class:'cal-filter-row'},h('div',{class:'cal-categories','aria-label':t('calendar.category_filter')},...['all','macro','earnings','company','market'].map(value=>h('button',{type:'button',class:'chip'+(category===value?' active':''),'data-cal-focus':'category-'+value,'aria-pressed':String(category===value),onClick:()=>{category=value;render();}},t('calendar.category.'+value)))),
          h('button',{type:'button',class:'cal-watch-filter'+(mineOnly?' active':''),'data-cal-focus':'mine','aria-pressed':String(mineOnly),onClick:()=>{mineOnly=!mineOnly;render();}},icon(mineOnly?'check':'star',15),t('calendar.mine'))),
        mineOnly?h('p',{class:'small muted cal-filter-note'},t(ctx.state.watchlist.length?'calendar.mine_note':'calendar.mine_empty')):null,
        tentative.length?h('div',{class:'cal-tentative-strip'},h('span',{class:'small muted'},t('calendar.date_unconfirmed')),
          ...tentative.map(event=>button(t('calendar.event.'+event.id+'.title'),()=>eventDetails(event),'text-link'))):null,
        view!=='agenda'?grid():h('div',{class:'cal-agenda-view'},...([...new Set(inPeriod.map(event=>event.date))].length?
          [...new Set(inPeriod.map(event=>event.date))].map(day=>h('section',{class:'cal-agenda-day'},h('h3',{},dateLabel(day,{month:'short',day:'numeric',weekday:'long'})),...inPeriod.filter(event=>event.date===day).map(eventRow))):
          [h('div',{class:'cal-empty-day'},icon('calendar',24),h('h3',{},t('calendar.no_events')),h('p',{class:'muted'},t('calendar.no_events_note')))]))),
      view!=='agenda'?h('section',{class:'cal-selected-section'},sectionHead(dateLabel(selected,{month:'long',day:'numeric',weekday:'long'}),h('span',{class:'small muted'},t('calendar.event_count',{n:selectionEvents.length}))),
        selectionEvents.length?h('div',{class:'cal-selected-list'},...selectionEvents.map(eventRow)):
          h('div',{class:'cal-empty-day'},icon('calendar',24),h('div',{},h('h3',{},t('calendar.no_events')),h('p',{class:'muted'},t('calendar.no_events_note'))),
            button(t('calendar.next_event'),()=>{let candidates=events().filter(event=>event.status!=='unconfirmed');if(!candidates.length){category='all';mineOnly=false;tickerScope='';candidates=EVENTS.filter(event=>event.status!=='unconfirmed');}const next=candidates.find(event=>event.date>selected)||candidates[0];if(next){selected=next.date;start=view==='month'?selected.slice(0,7)+'-01':shift(selected,-((asDate(selected).getUTCDay()+6)%7));render();}},'btn btn-quiet'))):null,
      h('footer',{class:'cal-footer'},icon('info',15),h('p',{class:'small muted'},t('calendar.fixture_note')))));
    if(focusKey)root.querySelector('[data-cal-focus="'+focusKey+'"]')?.focus({preventScroll:true});
  }
  render();
}
