import {h,t,button,link,badge,icon,sectionHead,showDialog,toast} from '../ui.js';

// Deliberately fictional authors. No example is attributed to a real person or publication.
const AUTHORS=[
  {id:'demo-lin',initial:'L',color:'#80a889',tickers:['NVDA','META'],topic:'ai'},
  {id:'demo-chen',initial:'C',color:'#c28b76',tickers:['ORCL','NVDA'],topic:'cash'},
  {id:'demo-yu',initial:'Y',color:'#8b9dc9',tickers:['MU','MSFT'],topic:'cycles'},
  {id:'demo-morgan',initial:'M',color:'#ba9d72',tickers:['AMD','META'],topic:'competition'},
];
const VIEWS=[
  {id:'nvda-delivery',author:'demo-lin',ticker:'NVDA',stance:'bull',date:'2026-09-25',time:'09:10',topic:'ai'},
  {id:'orcl-cash',author:'demo-chen',ticker:'ORCL',stance:'bear',date:'2026-09-25',time:'08:40',topic:'cash'},
  {id:'mu-mix',author:'demo-yu',ticker:'MU',stance:'bull',date:'2026-09-25',time:'08:20',topic:'cycles'},
  {id:'amd-share',author:'demo-morgan',ticker:'AMD',stance:'neutral',date:'2026-09-25',time:'08:00',topic:'competition'},
  {id:'nvda-spending',author:'demo-chen',ticker:'NVDA',stance:'bear',date:'2026-09-24',time:'15:30',topic:'cash'},
  {id:'meta-ads',author:'demo-lin',ticker:'META',stance:'bull',date:'2026-09-24',time:'13:10',topic:'ai'},
  {id:'msft-cloud',author:'demo-yu',ticker:'MSFT',stance:'neutral',date:'2026-09-24',time:'10:20',topic:'cycles'},
  {id:'meta-costs',author:'demo-morgan',ticker:'META',stance:'bear',date:'2026-09-23',time:'14:00',topic:'competition'},
];
const authorName=a=>t('creators.author.'+a.id+'.name');
const viewText=(view,field='title')=>t('creators.view.'+view.id+'.'+field);
const tone=stance=>({bull:'positive',bear:'negative',neutral:'neutral'}[stance]);

export function mountCreators(root,ctx,params={}){
  const prior=ctx.state.creatorsUI||{},tickers=['',...new Set(VIEWS.map(view=>view.ticker))],authorIds=['',...AUTHORS.map(a=>a.id)];
  const routeTicker=params.query?.get('ticker'),routeAuthor=params.query?.get('author'),routeTab=params.query?.get('tab'),routeStance=params.query?.get('stance');
  let ticker=tickers.includes(routeTicker)?routeTicker:tickers.includes(prior.ticker)?prior.ticker:'',
    author=authorIds.includes(routeAuthor)?routeAuthor:authorIds.includes(prior.author)?prior.author:'',
    tab=['views','directory','saved'].includes(routeTab)?routeTab:['views','directory','saved'].includes(prior.tab)?prior.tab:'views',
    scope=['all','following','watchlist'].includes(prior.scope)?prior.scope:'all',
    stance=['all','bull','bear','neutral'].includes(routeStance)?routeStance:['all','bull','bear','neutral'].includes(prior.stance)?prior.stance:'all',
    query=typeof prior.query==='string'?prior.query:'',filtersOpen=prior.filtersOpen===true;
  const phoneMedia=window.matchMedia?.('(max-width:760px)');
  const isPhone=()=>phoneMedia?phoneMedia.matches:window.innerWidth<=760;
  // A stock's explicit cross-link opens that stock's views, rather than inheriting an unrelated profile.
  if(routeTicker&&tickers.includes(routeTicker)&&!routeAuthor){
    author='';if(!routeTab)tab='views';
    if(routeTicker!==prior.ticker){query='';scope='all';if(!routeStance)stance='all';}
  }
  const shell=h('div',{class:'creators-lab'});root.append(shell);
  function remember(){
    ctx.state.creatorsUI={ticker,author,tab,scope,stance,query,filtersOpen};ctx.save();
    if(window.location.hash.split('?')[0]==='#/creators'){
      const route=new URLSearchParams();if(ticker)route.set('ticker',ticker);if(author)route.set('author',author);
      if(tab!=='views')route.set('tab',tab);if(stance!=='all')route.set('stance',stance);
      const hash='#/creators'+(route.size?'?'+route:'');
      if(window.location.hash!==hash)window.history.replaceState(null,'',hash);
    }
  }
  function avatar(a){return h('span',{class:'creator-lab-avatar',style:'--author-color:'+a.color,'aria-hidden':'true'},a.initial);}
  function isFollowing(id){return ctx.state.authors.includes(id);}
  function toggleFollow(id){
    const i=ctx.state.authors.indexOf(id);if(i<0)ctx.state.authors.push(id);else ctx.state.authors.splice(i,1);
    ctx.save();toast(t(i<0?'creators.followed_notice':'creators.unfollowed_notice'));render();
  }
  function saved(id){return ctx.state.saved.includes('view:'+id);}
  function toggleSaved(id,updateDialog){
    const key='view:'+id,i=ctx.state.saved.indexOf(key);if(i<0)ctx.state.saved.push(key);else ctx.state.saved.splice(i,1);
    ctx.save();toast(t(i<0?'creators.saved_notice':'creators.unsaved_notice'));render();updateDialog?.();
  }
  function followButton(a){
    const following=isFollowing(a.id);
    return h('button',{class:'btn '+(following?'btn-quiet':'btn-primary'),'aria-label':t(following?'creators.unfollow_author':'creators.follow_author',{name:authorName(a)}),
      'aria-pressed':String(following),onClick:()=>toggleFollow(a.id)},icon(following?'check':'plus',15),t(following?'creators.following':'creators.follow'));
  }
  function sourceDialog(view){
    const a=AUTHORS.find(x=>x.id===view.author),content=h('div',{class:'creator-source-body'});
    const dialog=showDialog({title:t('creators.source_title'),content,wide:true});
    document.querySelector('dialog[open]')?.addEventListener('close',()=>{
      const next=shell.querySelector('[data-view-id="'+view.id+'"] .creator-opinion-title');
      if(next)next.focus({preventScroll:true});
    },{once:true});
    function paint(){
      content.replaceChildren();
      content.append(h('div',{class:'creator-source-context'},badge(t('creators.fictional'),'accent'),h('p',{class:'small muted'},t('creators.source_disclosure'))),
        h('div',{class:'creator-source-identity'},avatar(a),h('div',{},h('strong',{},authorName(a)),h('p',{class:'small muted'},view.date+' · '+view.time+' UTC'))),
        h('div',{class:'row'},link(view.ticker,'#/stock/'+view.ticker,'chip'),badge(t('creators.stance.'+view.stance),tone(view.stance))),
        h('h2',{class:'creator-source-take'},viewText(view)),
        h('section',{class:'creator-source-block'},h('h3',{},t('creators.condition')),h('p',{},viewText(view,'condition'))),
        h('section',{class:'creator-source-block'},h('div',{class:'row'},h('h3',{},t('creators.excerpt')),badge(t('creators.example_excerpt'))),
          h('blockquote',{},viewText(view,'excerpt')),h('p',{class:'small muted'},t('creators.demo_source',{title:viewText(view,'source')}))),
        h('section',{class:'creator-source-block'},h('h3',{},t('creators.next_check')),h('p',{},viewText(view,'check'))),
        h('div',{class:'creator-source-actions'},button(t('creators.open_stock',{ticker:view.ticker}),()=>{dialog.close();ctx.navigate('stock/'+view.ticker);},'btn btn-primary'),
          button(t(saved(view.id)?'creators.saved':'creators.save'),()=>toggleSaved(view.id,paint),'btn btn-quiet'),
          button(t('creators.author_profile'),()=>{dialog.close();openAuthor(a.id);},'btn btn-quiet')));
    }
    paint();
  }
  function openAuthor(id){author=id;tab='views';query='';ticker='';scope='all';stance='all';render();shell.scrollIntoView({behavior:'smooth',block:'start'});}
  function viewRow(view){
    const a=AUTHORS.find(x=>x.id===view.author),saveBtn=h('button',{class:'icon-btn'+(saved(view.id)?' is-saved':''),'aria-label':t(saved(view.id)?'creators.unsave':'creators.save')+' · '+view.ticker,
      'aria-pressed':String(saved(view.id)),onClick:()=>toggleSaved(view.id)},icon(saved(view.id)?'check':'bookmark'));
    return h('article',{class:'creator-opinion-row','data-view-id':view.id},
      h('div',{class:'creator-opinion-stock'},link(view.ticker,'#/stock/'+view.ticker,'mono creator-ticker'),badge(t('creators.stance.'+view.stance),tone(view.stance))),
      h('div',{class:'creator-opinion-main'},
        h('button',{class:'creator-opinion-title',onClick:()=>sourceDialog(view)},viewText(view)),
        h('p',{class:'creator-opinion-condition'},viewText(view,'condition')),
        h('div',{class:'creator-opinion-meta'},h('button',{class:'creator-inline-author',onClick:()=>openAuthor(a.id)},avatar(a),authorName(a)),
          h('time',{dateTime:view.date},view.date.slice(5).replace('-','/')),h('span',{class:'creator-demo-label'},t('creators.demo_short')))),
      h('div',{class:'creator-opinion-actions'},saveBtn,h('button',{class:'text-link',onClick:()=>sourceDialog(view)},t('creators.read_source'),icon('arrow',14))));
  }
  function render(){
    remember();
    shell.replaceChildren();
    shell.append(h('header',{class:'page-heading creators-lab-heading'},h('div',{},h('div',{class:'eyebrow'},t('creators.eyebrow')),h('h1',{},t('creators.title')),h('p',{class:'muted'},t('creators.subtitle')))));
    shell.append(h('nav',{class:'creators-lab-tabs','aria-label':t('creators.tabs')},...['views','directory','saved'].map(value=>
      h('button',{class:tab===value?'active':'','aria-pressed':String(tab===value),onClick:()=>{tab=value;author='';render();}},
        value==='saved'?icon('bookmark',16):null,t('creators.tab.'+value),value==='saved'&&ctx.state.saved.filter(x=>x.startsWith('view:')).length?h('span',{class:'creator-tab-count'},String(ctx.state.saved.filter(x=>x.startsWith('view:')).length)):null))));
    shell.append(h('div',{class:'creators-lab-content'}));renderContent();
  }
  function filterPanel(){
    const full=tab!=='directory'&&!author,active=[];
    if(full){if(scope!=='all')active.push(t('creators.scope.'+scope));if(ticker)active.push(ticker);if(stance!=='all')active.push(t('creators.stance.'+stance));}
    if(query)active.push(t('creators.search_summary',{query}));
    const panel=h('details',{class:'creators-lab-filters',open:isPhone()?filtersOpen:true,onToggle:e=>{
      if(isPhone()){filtersOpen=e.currentTarget.open;remember();}
    }},h('summary',{},icon('filter',16),h('span',{class:'creator-filter-summary-label'},t('creators.filters')),
      active.length?h('span',{class:'creator-filter-current',title:active.join(' · ')},active.join(' · ')):null,icon('chevron',15)),
      h('div',{class:'creators-lab-search'},icon('search'),h('input',{type:'search',maxLength:100,value:query,placeholder:t('creators.search'),'aria-label':t('creators.search'),onInput:e=>{query=e.target.value;renderContent();}})));
    if(!full)return panel;
    panel.append(h('div',{class:'creators-lab-controls'},h('div',{class:'row'},...['all','following','watchlist'].map(value=>h('button',{
      class:'chip'+(scope===value?' active':''),'aria-pressed':String(scope===value),onClick:()=>{scope=value;renderContent();}},t('creators.scope.'+value)))),
      h('select',{'aria-label':t('creators.stance_filter'),value:stance,onChange:e=>{stance=e.target.value;renderContent();}},
        ...['all','bull','bear','neutral'].map(value=>h('option',{value,selected:stance===value},t('creators.stance.'+value))))));
    panel.append(h('div',{class:'creator-ticker-filter'},h('span',{class:'small muted'},t('creators.by_stock')),
      ...['','NVDA','ORCL','MU','AMD','META','MSFT'].map(value=>h('button',{class:'chip'+(ticker===value?' active':''),'aria-pressed':String(ticker===value),onClick:()=>{ticker=value;renderContent();}},value||t('creators.all_tickers')))));
    return panel;
  }
  function renderContent(){
    remember();
    const content=shell.querySelector('.creators-lab-content');if(!content)return;
    const oldInput=content.querySelector('.creators-lab-search input'),hadFocus=oldInput===document.activeElement,caret=hadFocus?oldInput.selectionStart:null;
    const restoreSearch=()=>{if(hadFocus){const next=content.querySelector('.creators-lab-search input');next?.focus({preventScroll:true});try{next?.setSelectionRange(caret,caret);}catch{}}};
    content.replaceChildren();
    content.append(filterPanel());
    if(tab==='directory'){renderDirectory(content);restoreSearch();return;}
    if(author){renderProfile(content);restoreSearch();return;}
    let views=filteredViews();
    const body=h('div',{class:'creators-lab-body'}),list=h('section',{class:'creator-opinions'});
    list.append(sectionHead(t(tab==='saved'?'creators.saved_heading':ticker?'creators.ticker_heading':'creators.latest_heading',{ticker}),h('span',{class:'small muted'},t('creators.illustration_date'))));
    list.firstChild.classList.add('creator-list-heading');
    if(ticker){
      const hasBull=views.some(x=>x.stance==='bull'),hasBear=views.some(x=>x.stance==='bear');
      list.append(h('p',{class:'creator-comparison-note small'},icon('info',15),t(hasBull&&hasBear?'creators.mixed_note':'creators.scope_note')));
    }
    if(!views.length)list.append(emptyState());else list.append(h('div',{class:'creator-opinion-list'},...views.map(viewRow)));
    list.append(h('p',{class:'creator-list-note small muted'},t('creators.attribution_note')));
    body.append(list,sideDirectory());content.append(body);restoreSearch();
  }
  function filteredViews(){
    const term=query.trim().toLowerCase();
    return VIEWS.filter(v=>(!ticker||v.ticker===ticker)&&(!author||v.author===author)&&(stance==='all'||v.stance===stance)&&
      (scope!=='following'||isFollowing(v.author))&&(scope!=='watchlist'||ctx.state.watchlist.includes(v.ticker))&&
      (tab!=='saved'||saved(v.id))&&(!term||[v.ticker,authorName(AUTHORS.find(a=>a.id===v.author)),viewText(v),viewText(v,'condition')].join(' ').toLowerCase().includes(term)));
  }
  function emptyState(){
    const key=tab==='saved'&&!ctx.state.saved.some(x=>x.startsWith('view:'))?'saved':scope==='following'&&!ctx.state.authors.length?'following':scope==='watchlist'&&!ctx.state.watchlist.length?'watchlist':'results';
    return h('div',{class:'empty-state creator-empty'},icon(key==='saved'?'bookmark':'users',30),h('h3',{},t('creators.empty.'+key+'.title')),h('p',{class:'muted'},t('creators.empty.'+key+'.text')),
      button(t('creators.browse_views'),()=>{query='';ticker='';scope='all';stance='all';tab='views';render();},'btn btn-primary'));
  }
  function sideDirectory(){
    const aside=h('aside',{class:'creator-side-directory'},sectionHead(t('creators.directory_preview'),button(t('creators.all_authors'),()=>{tab='directory';author='';render();},'text-link')),
      h('p',{class:'small muted'},t('creators.directory_note')));
    for(const a of AUTHORS){
      aside.append(h('article',{class:'creator-side-person'},h('button',{class:'creator-person-open',onClick:()=>openAuthor(a.id)},avatar(a),
        h('span',{},h('strong',{},authorName(a)),h('span',{class:'small muted'},t('creators.topic.'+a.topic)))),
        h('div',{class:'creator-side-bottom'},h('span',{class:'mono small muted'},a.tickers.join(' · ')),h('button',{class:'icon-btn'+(isFollowing(a.id)?' is-followed':''),'aria-label':t(isFollowing(a.id)?'creators.unfollow_author':'creators.follow_author',{name:authorName(a)}),onClick:()=>toggleFollow(a.id)},icon(isFollowing(a.id)?'check':'plus',16)))));
    }
    aside.append(h('div',{class:'creator-reading-help'},icon('map',20),h('h3',{},t('creators.research_help')),h('p',{class:'small muted'},t('creators.research_help_note')),link(t('creators.explore_stocks'),'#/explore','text-link')));
    return aside;
  }
  function renderDirectory(content){
    content.append(h('div',{class:'creator-directory-intro'},h('h2',{},t('creators.directory_title')),h('p',{class:'muted'},t('creators.directory_intro')),badge(t('creators.fictional'),'neutral')));
    const term=query.trim().toLowerCase(),authors=AUTHORS.filter(a=>!term||[authorName(a),t('creators.topic.'+a.topic),...a.tickers].join(' ').toLowerCase().includes(term));
    if(!authors.length){content.append(emptyState());return;}
    const grid=h('div',{class:'creator-directory-grid'});
    for(const a of authors){const latest=VIEWS.find(v=>v.author===a.id);grid.append(h('article',{class:'creator-directory-card'},
      h('header',{},h('button',{class:'creator-person-open',onClick:()=>openAuthor(a.id)},avatar(a),h('span',{},h('strong',{},authorName(a)),h('span',{class:'small muted'},t('creators.topic.'+a.topic)))),followButton(a)),
      h('p',{class:'creator-directory-bio'},t('creators.author.'+a.id+'.bio')),
      h('div',{class:'row'},...a.tickers.map(sym=>link(sym,'#/stock/'+sym,'chip mono'))),
      h('div',{class:'creator-directory-latest'},h('span',{class:'eyebrow'},t('creators.latest_example')),h('button',{class:'creator-opinion-title',onClick:()=>sourceDialog(latest)},viewText(latest))),
      h('footer',{},h('span',{class:'small muted'},t('creators.demo_short')),button(t('creators.author_profile'),()=>openAuthor(a.id),'text-link'))));}
    content.append(grid);
  }
  function renderProfile(content){
    const a=AUTHORS.find(x=>x.id===author);if(!a){author='';renderContent();return;}
    content.append(button('← '+t('creators.back_to_views'),()=>{author='';render();},'text-link'));
    const header=h('header',{class:'creator-profile-header'},avatar(a),h('div',{class:'creator-profile-name'},h('h2',{},authorName(a)),h('p',{class:'muted'},t('creators.author.'+a.id+'.bio')),badge(t('creators.fictional'))),followButton(a));
    content.append(header,h('div',{class:'creator-profile-tickers'},h('span',{class:'small muted'},t('creators.mentioned_stocks')),...a.tickers.map(sym=>link(sym,'#/stock/'+sym,'chip mono'))));
    const views=filteredViews();
    content.append(h('div',{class:'creator-profile-layout'},h('section',{},sectionHead(t('creators.profile_views'),null),views.length?h('div',{class:'creator-opinion-list'},...views.map(viewRow)):emptyState()),
      h('aside',{class:'creator-profile-about'},h('h3',{},t('creators.reading_profile')),h('p',{},t('creators.author.'+a.id+'.lens')),
        h('h3',{},t('creators.source_coverage')),h('p',{class:'small muted'},t('creators.profile_limit')),
        button(t('creators.compare_other'),()=>{author='';ticker=a.tickers[0];render();},'btn btn-quiet'))));
  }
  render();
  const resize=()=>render();phoneMedia?.addEventListener('change',resize);
  return()=>phoneMedia?.removeEventListener('change',resize);
}
