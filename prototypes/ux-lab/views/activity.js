import {h,t,button,link,badge,icon,sectionHead,showDialog} from '../ui.js';
import {activityArchive,ACTIVITY_KINDS} from '../activity-adapter.js';
import {ACTIVITY_SAMPLES} from '../activity-fixtures.js';
export const activityHref=(ticker='',category='all')=>'#/explore?'+new URLSearchParams({view:'activity',...(ticker?{ticker}:{}),...(category!=='all'?{kind:category}:{})});
export function exploreTabs(active){return h('nav',{class:'ac-tabs','aria-label':t('activity.explore_sections')},...['research','activity'].map(key=>h('a',{href:key==='activity'?activityHref():'#/explore',class:key===active?'active':'','aria-current':key===active?'page':null},icon(key==='activity'?'list':'compass',16),t('activity.tab_'+key))));}
const records=()=>activityArchive({items:ACTIVITY_SAMPLES.map(item=>({...item,reporter_name:t('activity.'+item.id+'.actor'),summary:t('activity.'+item.id+'.summary')})),next_cursor:null},document.documentElement.lang).items;
const number=value=>new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(value);
function metric(item){return item.metricType==='transaction_value'?'$'+number(item.metric):item.metricType==='shares'?number(item.metric):item.metricType==='amount_range'?item.metric:'—';}
const dates=item=>[[item.reportPeriod?'period':'transaction',item.reportPeriod||item.transactionDate],['published',item.publishedDate],['effective',item.effectiveDate]].filter(([key,value])=>value||key==='published');
const moment=value=>value||t('activity.unknown_date');
function detail(item,ctx){
 showDialog({title:(item.ticker||t('activity.unresolved'))+' · '+t('activity.category_'+item.category),wide:true,content:h('div',{class:'stack ac-detail'},
  badge(t('activity.sample'),'accent'),item.dateReviewRequired?h('p',{class:'form-note'},t('activity.date_review')):null,h('h3',{},item.actor),h('p',{},item.summary),
  h('dl',{class:'ac-detail-facts'},h('dt',{},t('activity.action')),h('dd',{},t('activity.action_'+item.action)),h('dt',{},t('activity.metric_'+item.metricType)),h('dd',{class:'mono'},metric(item)),
    item.priorShares!==null?[h('dt',{},t('activity.prior_shares')),h('dd',{class:'mono'},number(item.priorShares))]:null,
    ...dates(item).flatMap(([key,value])=>[h('dt',{},t('activity.date_'+key)),h('dd',{},moment(value))]),h('dt',{},t('activity.date_observed')),h('dd',{},item.observedAt?.replace('T',' ').replace('Z',' UTC')||'—')),
  h('div',{class:'form-note'},t('activity.limit_'+item.category)),h('section',{},h('h3',{},t('activity.source')),h('p',{},t('activity.'+item.id+'.source')),h('p',{class:'small muted'},t('activity.no_source'))),
  item.stockEligible?h('div',{class:'row'},link(t('activity.stock_research'),'#/stock/'+item.ticker,'btn btn-primary'),link(t('activity.evidence_map'),'#/stock/'+item.ticker+'?tab=evidence','btn btn-quiet'),button(t(ctx.state.watchlist.includes(item.ticker)?'activity.followed':'activity.follow'),()=>{ctx.toggleWatch(item.ticker);document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());Array.from(document.querySelectorAll('[data-activity-id]')).find(row=>row.dataset.activityId===item.id)?.querySelector('.ac-title')?.focus({preventScroll:true});},'btn btn-quiet')):h('p',{class:'form-note'},t('activity.unresolved_note')))});
}
function recordRow(item,ctx,compact=false){
 return h('article',{class:'ac-record'+(compact?' is-compact':''),'data-activity-id':item.id},
  h('div',{class:'ac-record-main'},h('div',{class:'ac-record-meta'},item.stockEligible?link(item.ticker,'#/stock/'+item.ticker,'ticker-link mono'):badge(item.ticker||t('activity.unresolved')),badge(t('activity.category_'+item.category)),badge(t('activity.action_'+item.action),item.action==='sell'?'negative':item.action==='buy'?'positive':'neutral')),
   h('h3',{},button(item.actor,()=>detail(item,ctx),'ac-title')),h('p',{class:'ac-summary'},item.summary),
   h('div',{class:'ac-dates small muted'},...dates(item).map(([key,value])=>h('span',{},t('activity.date_'+key)+' '+moment(value))))),
  h('div',{class:'ac-record-value'},h('span',{class:'small muted'},t('activity.metric_'+item.metricType)),h('strong',{class:'mono'},metric(item)),button(t('activity.open_record'),()=>detail(item,ctx),'text-link')));
}
export function activityPreview(ctx,ticker=''){
 const items=records().filter(row=>!ticker||row.ticker===ticker).slice(0,ticker?2:3);
 return h('section',{class:'ac-preview'},sectionHead(t('activity.title'),link(t('activity.view_all'),activityHref(ticker))),
  h('p',{class:'small muted'},t('activity.preview_note')),
  items.length?h('div',{class:'ac-records'},...items.map(item=>recordRow(item,ctx,true))):h('p',{class:'small muted'},t('activity.no_stock_samples')));
}
function coverage(){showDialog({title:t('activity.coverage'),content:h('div',{class:'stack'},h('p',{},t('activity.coverage_intro')),...['insider','holdings','political','company'].map(key=>h('section',{},h('h3',{},t('activity.category_'+key)),h('p',{},t('activity.coverage_'+key)))),h('p',{class:'form-note'},t('activity.coverage_status')))});}
export function mountActivity(root,ctx,params={}){
 const prior=ctx.state.activityUI||{},queryParams=params.query||new URLSearchParams();
 let category=queryParams.has('kind')?queryParams.get('kind'):prior.category||'all';if(!Object.hasOwn(ACTIVITY_KINDS,category))category='all';
 let ticker=queryParams.has('ticker')?queryParams.get('ticker'):'',q=typeof prior.q==='string'?prior.q:'',scope=prior.scope==='watchlist'?'watchlist':'all';
 if(ticker&&ticker!==prior.ticker){q='';scope='all';if(!queryParams.has('kind'))category='all';}
 const shell=h('div',{class:'ac-page'});root.append(shell);
 function render(){
  const active=document.activeElement?.dataset.activityFocus,selection=active==='search'?document.activeElement.selectionStart:null;
  ctx.state.activityUI={category,q,scope,ticker};ctx.save();
  const route=new URLSearchParams({view:'activity',...(category!=='all'?{kind:category}:{}),...(ticker?{ticker}:{})});window.history.replaceState(null,'','#/explore?'+route);
  const all=records(),term=q.trim().toLowerCase();
  const shown=all.filter(row=>(category==='all'||row.category===category)&&(!ticker||row.ticker===ticker)&&(scope!=='watchlist'||ctx.state.watchlist.includes(row.ticker))&&(!term||[row.ticker,row.actor,row.summary].join(' ').toLowerCase().includes(term)));
  const search=h('input',{type:'search',placeholder:t('activity.search'),'aria-label':t('activity.search'),value:q,'data-activity-focus':'search',onInput:event=>{q=event.target.value;render();}});
  shell.replaceChildren(h('header',{class:'page-heading'},h('div',{},h('p',{class:'eyebrow'},t('activity.eyebrow')),h('h1',{},t('activity.title')),h('p',{class:'muted'},t('activity.subtitle')))),exploreTabs('activity'),
   h('div',{class:'ac-toolbar'},h('div',{class:'ac-category-group',role:'group','aria-label':t('activity.categories')},...Object.keys(ACTIVITY_KINDS).map(key=>h('button',{type:'button',class:'chip'+(category===key?' active':''),'aria-pressed':String(category===key),'data-activity-focus':key,onClick:()=>{category=key;render();}},t('activity.category_'+key)))),
    h('div',{class:'ac-controls'},h('label',{class:'ac-search'},icon('search',16),search),h('button',{type:'button',class:'chip'+(scope==='watchlist'?' active':''),'aria-pressed':String(scope==='watchlist'),'data-activity-focus':'scope',onClick:()=>{scope=scope==='watchlist'?'all':'watchlist';render();}},icon('star',15),t('activity.my_stocks')))),
   ticker?h('div',{class:'ac-scope'},badge(ticker,'accent'),button(t('activity.clear_stock'),()=>{ticker='';render();},'text-link')):h('div',{hidden:true}),
   h('div',{class:'ac-layout'},h('section',{},h('div',{class:'ac-results-meta small muted'},h('span',{},t('activity.showing',{n:shown.length})),h('span',{},t('activity.order'))),
    shown.length?h('div',{class:'ac-records'},...shown.map(item=>recordRow(item,ctx))):h('section',{class:'empty-state'},icon('search',24),h('h2',{},t('activity.empty')),h('p',{class:'muted'},t(scope==='watchlist'&&!ctx.state.watchlist.length?'activity.empty_watch':'activity.empty_filter')),button(t('activity.reset'),()=>{category='all';scope='all';ticker='';q='';render();},'btn btn-primary')),
    h('p',{class:'small muted ac-end'},t('activity.sample_end'))),
    h('aside',{class:'ac-sidebar'},h('section',{class:'panel'},h('div',{class:'section-head'},h('h2',{},t('activity.read_title')),badge(t('activity.sample'))),h('p',{},t('activity.read_body')),button([t('activity.coverage'),icon('arrow',15)],coverage,'text-link')),
     h('section',{class:'ac-related'},h('h2',{},t('activity.more_research')),...[['today','macro','chart'],[ticker?'stock/'+ticker+'?tab=metrics':'explore?view=metrics','metrics','grid'],['creators','creators','users'],['calendar','calendar','calendar']].map(([url,key,glyph])=>link([icon(glyph,18),h('div',{},h('strong',{},t('activity.more_'+key)),h('span',{class:'small muted'},t('activity.more_'+key+'_note'))),icon('chevron',15)],'#/'+url,'ac-related-link'))))));
  if(active){const control=shell.querySelector('[data-activity-focus="'+active+'"]');control?.focus({preventScroll:true});if(selection!==null)try{control.setSelectionRange(selection,selection);}catch{}}
 }
 render();
}
