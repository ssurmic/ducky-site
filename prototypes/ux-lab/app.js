import {h,t,setStrings,icon,button,link,badge,stockLink,money,showDialog,toast} from './ui.js';
import {stocks,stock} from './data.js';
import {mountToday} from './views/today.js';
import {mountCalendar} from './views/calendar.js';
import {mountWatchlist} from './views/watchlist.js';
import {mountStock} from './views/stock.js';
import {mountExplore} from './views/explore.js';
import {mountCreators} from './views/creators.js';
const KEY='ducky.ux-lab.20260928';
const defaults={watchlist:[],authors:[],alerts:[],saved:[],lang:'zh',theme:'dark',scenario:'new'};
let retained={};try{retained=JSON.parse(localStorage.getItem(KEY)||'{}');}catch{}
const state={...defaults,...retained};for(const key of ['watchlist','authors','alerts','saved'])if(!Array.isArray(state[key]))state[key]=[];
if(!['zh','en'].includes(state.lang))state.lang='zh';if(!['dark','light'].includes(state.theme))state.theme='dark';
let displayState='ready',cleanup,currentRoute,pendingStockReturn;
const scrollPositions=new Map();
window.addEventListener('scroll',()=>{if(currentRoute)scrollPositions.set(currentRoute,window.scrollY);},{passive:true});
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{toast(t('common.storageUnavailable'));}};
function resetDemo(){for(const key of ['watchlist','authors','alerts','saved'])state[key]=[];for(const key of ['watchUI','stockUI','exploreUI','creatorsUI','activityUI','todayUI','stockReturn'])delete state[key];state.scenario='new';displayState='ready';scrollPositions.clear();save();}
const navigation=[['today','home'],['watchlist','list'],['explore','compass'],['calendar','calendar'],['creators','users']];
const views={today:mountToday,watchlist:mountWatchlist,explore:mountExplore,calendar:mountCalendar,creators:mountCreators,stock:mountStock,alerts:mountAlerts};
function validReturn(value){return value&&[...navigation.map(([name])=>name),'alerts'].includes(value.name)&&typeof value.href==='string'&&value.href.startsWith('#/'+value.name);}
function stockReturn(){const entry=history.state?.duckyStockReturn;return validReturn(entry)?entry:{href:'#/explore',name:'explore'};}
function rememberStockEntry(path){
 const [destination,ticker]=path.replace(/^#\/?/,'').split('?')[0].split('/'),from=route();
 if(destination!=='stock')return;
 const source=from.name==='stock'?stockReturn():{href:location.hash,name:from.name};
 if(validReturn(source))pendingStockReturn={...source,ticker};
}
function routeKey(params){
 if(params.name==='stock')return 'stock/'+params.ticker+'?tab='+(params.query.get('tab')||'overview');
 if(params.name==='explore')return 'explore?view='+(params.query.get('view')||state.exploreUI?.view||'summary');
 if(params.name==='watchlist')return 'watchlist?view='+(params.query.get('view')||state.watchUI?.view||'list');
 return params.name;
}
function replaceRoute(hash){
 if(currentRoute)scrollPositions.set(currentRoute,window.scrollY);
 history.replaceState(history.state,'',hash);currentRoute=routeKey(route());
}
function navigate(path){rememberStockEntry(path);document.querySelectorAll('dialog[open]').forEach(d=>d.close());location.hash='#/'+path;}
function toggleWatch(ticker){if(!stock(ticker))return;const exists=state.watchlist.includes(ticker);state.watchlist=exists?state.watchlist.filter(x=>x!==ticker):[...state.watchlist,ticker];state.scenario=state.watchlist.length?'custom':'new';save();render(true);toast(t(exists?'common.removed':'common.added',{ticker}));}
function loadDemo(){state.watchlist=['NVDA','MU','AMD','ORCL','META','MSFT'];state.scenario='returning';save();render(true);toast(t('common.demoLoaded'));}
const ctx={state,stocks,stock,save,stockReturn,replaceRoute,rerender:()=>render(true),navigate,toggleWatch,openSearch,openAlert,loadDemo};
function route(){const [path,q='']=location.hash.replace(/^#\/?/,'').split('?');const [name='today',ticker,sub]=path.split('/');return {name:name||'today',ticker:ticker?.toUpperCase(),sub,query:new URLSearchParams(q)};}
async function language(lang){state.lang=lang;save();const response=await fetch('../../i18n/'+lang+'.json');if(!response.ok)throw Error('locale');setStrings(await response.json());document.documentElement.lang=lang;render(true);}
function render(preserve=false){
 const y=window.scrollY;const focused=document.activeElement?.getAttribute('data-focus');cleanup?.();cleanup=null;
 document.documentElement.dataset.theme=state.theme;const params=route(),name=params.name;
 if(name==='stock'&&pendingStockReturn?.ticker?.toUpperCase()===params.ticker){const {ticker,...entry}=pendingStockReturn;history.replaceState({...history.state,duckyStockReturn:entry},'',location.hash);}
 pendingStockReturn=null;const active=name==='stock'?stockReturn().name:name;
 const nextRoute=routeKey(params);if(currentRoute&&nextRoute!==currentRoute)scrollPositions.set(currentRoute,y);currentRoute=nextRoute;
 const app=document.getElementById('app');app.replaceChildren();
 const skip=link(t('common.skip'),'#main','skip-link');skip.addEventListener('click',e=>{e.preventDefault();document.getElementById('main')?.focus();});app.append(skip);
 const navItems=(mobile=false)=>navigation.map(([key,glyph])=>link([icon(glyph,mobile?20:18),h('span',{},t('nav.'+key)),!mobile&&key==='watchlist'&&state.watchlist.length?h('span',{class:'nav-count'},state.watchlist.length):null],'#/'+key,(mobile?'':'nav-item ')+(active===key?'active':'')));
 const help=()=>showDialog({title:t('common.aboutTitle'),content:h('div',{class:'stack'},badge(t('common.prototype'),'accent'),h('p',{},t('common.aboutBody')),h('p',{class:'muted'},t('common.aboutData')),h('div',{class:'form-note'},t('common.aboutSave')),button(t('common.startAgain'),()=>{resetDemo();navigate('today');render();document.querySelectorAll('dialog[open]').forEach(d=>d.close());},'btn btn-quiet'))});
 const sidebar=h('aside',{class:'sidebar'},link([h('img',{src:'../../public/duck-head-cutout-v1.png',alt:''}),h('span',{},'Ducky Bot')],'#/today','brand'),h('div',{class:'sidebar-caption eyebrow'},t('common.workspace')),h('nav',{class:'primary-nav','aria-label':t('common.navigation')},...navItems()),h('div',{class:'sidebar-lower'},link([icon('bell'),t('nav.alerts'),state.alerts.length?h('span',{class:'nav-count'},state.alerts.length):null],'#/alerts','nav-item '+(active==='alerts'?'active':'')),button([icon('info'),t('common.about')],help,'nav-item'),h('div',{class:'sidebar-hint'},h('p',{},t('common.sidebarHint')),h('p',{class:'small'},'UX LAB / 2026.09'))));
 app.append(sidebar);
 const search=button([icon('search',16),h('span',{},t('common.search')),h('kbd',{},'⌘ K')],openSearch,'search-launch');search.setAttribute('aria-label',t('common.search'));
 const theme=button(icon(state.theme==='dark'?'sun':'moon'),()=>{state.theme=state.theme==='dark'?'light':'dark';save();render(true);},'icon-btn');theme.setAttribute('aria-label',t('common.switchTheme'));
 const lang=button(state.lang==='zh'?'EN':'中',()=>language(state.lang==='zh'?'en':'zh'),'icon-btn lang-btn');lang.setAttribute('aria-label',t('common.switchLanguage'));
 const alerts=button(icon('bell'),()=>navigate('alerts'),'icon-btn');alerts.setAttribute('aria-label',t('nav.alerts'));
 const top=h('header',{class:'topbar'},h('div',{class:'breadcrumb'},h('span',{},t('common.workspace')),h('span',{},'/'),h('strong',{},name==='stock'?params.ticker:t('nav.'+name))),h('div',{class:'top-actions'},search,alerts,theme,lang,h('span',{class:'avatar','aria-hidden':'true'},'D')));
 const scenario=h('select',{'aria-label':t('common.experience'),onChange:e=>{if(e.target.value==='returning')loadDemo();else{resetDemo();render();}}},h('option',{value:'new',selected:state.scenario==='new'},t('common.newUser')),h('option',{value:'returning',selected:state.scenario!=='new'},t('common.returning')));
 const states=h('select',{class:'state-selector','aria-label':t('common.dataState'),onChange:e=>{displayState=e.target.value;render(true);}},...['ready','loading','error'].map(k=>h('option',{value:k,selected:displayState===k},t('common.state.'+k))));
 const lab=h('div',{class:'lab-bar'},h('div',{class:'lab-label'},h('span',{class:'lab-dot'}),h('span',{},t('common.prototype'))),h('div',{class:'lab-controls'},scenario,states));
 const main=h('main',{id:'main',class:'page-content',tabindex:'-1'});
 const footer=h('footer',{class:'page-footer'},h('span',{},t('common.footer')),h('span',{class:'mono'},'DUCKY BOT / DESIGN PREVIEW 01'));
 app.append(h('div',{class:'app-body'},top,lab,main,footer),h('nav',{class:'mobile-nav','aria-label':t('common.mobileNav')},...navItems(true)));
 const retry=()=>{displayState='ready';render(true);};
 if(displayState==='loading'){main.append(h('div',{class:'page-heading'},h('h1',{},t('nav.'+name))),h('section',{class:'panel','aria-busy':'true'},h('p',{},t('common.loading')),h('div',{class:'skeleton'}),h('div',{class:'skeleton'}),h('div',{class:'skeleton'}),button(t('common.finishLoading'),retry,'btn btn-quiet')));}
 else {if(displayState==='error')main.append(h('div',{class:'notice-bar',role:'status'},h('span',{},t('common.error')),button(t('common.retry'),retry,'btn btn-quiet')));
  const viewRoot=h('div',{id:'route-view'});main.append(viewRoot);const renderer=views[name];if(renderer)cleanup=renderer(viewRoot,ctx,params);else main.append(h('section',{class:'empty-state'},h('h1',{},t('common.notFound')),link(t('nav.today'),'#/today','btn btn-primary')));
 }
 document.querySelectorAll('.primary-nav a.active,.mobile-nav a.active').forEach(x=>x.setAttribute('aria-current','page'));
 if(preserve)window.scrollTo(0,y);else{window.scrollTo(0,scrollPositions.get(currentRoute)||0);main.focus({preventScroll:true});}
 if(focused)Array.from(document.querySelectorAll('[data-focus]')).find(e=>e.getAttribute('data-focus')===focused)?.focus({preventScroll:true});
}
function openSearch(){
 const results=h('div',{class:'search-results'});const input=h('input',{type:'search',placeholder:t('common.searchPlaceholder'),'aria-label':t('common.searchPlaceholder')});
 let dialog;function fill(){const q=input.value.trim().toLowerCase();results.replaceChildren();const matches=stocks.filter(s=>(s.ticker+' '+s.name+' '+t(s.sector)).toLowerCase().includes(q));
 for(const s of matches){const followed=state.watchlist.includes(s.ticker);const add=button(followed?icon('check',16):icon('plus',16),()=>{toggleWatch(s.ticker);fill();},'icon-btn');add.setAttribute('aria-label',t(followed?'common.unfollowStock':'common.followStock',{ticker:s.ticker}));add.setAttribute('aria-pressed',String(followed));
 results.append(h('div',{class:'search-result'},link([h('span',{class:'stock-avatar',style:{color:s.color}},s.ticker.slice(0,2)),h('span',{},h('strong',{class:'mono'},s.ticker),h('p',{},s.name))],'#/stock/'+s.ticker,'search-identity'),add));}
 if(!matches.length)results.append(h('p',{class:'muted'},t('common.noResults')));
 results.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>dialog.close()));}
 input.addEventListener('input',fill);fill();dialog=showDialog({title:t('common.searchTitle'),content:h('div',{},h('div',{class:'search-box'},icon('search'),input),h('p',{class:'muted small'},t('common.searchHint')),results)});input.focus();
}
function openAlert(ticker='NVDA',referencePrice,requestedCondition){
 const s=stock(ticker)||stocks[0],existing=state.alerts.find(x=>x.ticker===s.ticker);
 const price=h('input',{type:'number',min:'.01',step:'.01',required:true,value:referencePrice??existing?.price??s.reference?.[1]??s.price??'','aria-label':t('alert.price')});
 const symbol=h('select',{'aria-label':t('alert.stock'),onChange:e=>{const next=e.target.value;dialog.close();openAlert(next);}},...stocks.map(item=>h('option',{value:item.ticker,selected:item.ticker===s.ticker},item.ticker+' · '+item.name)));
 const initialCondition=['above','below'].includes(requestedCondition)?requestedCondition:Number.isFinite(referencePrice)&&Number.isFinite(s.price)?(referencePrice>s.price?'above':'below'):existing?.condition||'below';
 const condition=h('select',{'aria-label':t('alert.when')},h('option',{value:'below',selected:initialCondition==='below'},t('alert.below')),h('option',{value:'above',selected:initialCondition==='above'},t('alert.above')));
 const expiry=h('input',{type:'date',required:true,min:'2026-09-28',value:existing?.expiry||'2026-10-09'});
 const note=h('textarea',{rows:2,placeholder:t('alert.notePlaceholder'),value:existing?.note||''});
 const feedback=h('p',{class:'negative small',role:'alert'});
 let dialog;const form=h('form',{class:'stack',onSubmit:e=>{e.preventDefault();if(!form.reportValidity())return;const value=Number(price.value);if(!Number.isFinite(value)||value<=0){feedback.textContent=t('alert.invalid');return;}
 const entry={id:existing?.id||'plan-'+Date.now(),ticker:s.ticker,price:value,condition:condition.value,expiry:expiry.value,note:note.value,status:'local'};state.alerts=[...state.alerts.filter(x=>x.ticker!==s.ticker),entry];save();dialog.close();render(true);toast(t('alert.saved'));}},
 h('label',{class:'form-field'},t('alert.stock'),symbol),h('span',{class:'muted small'},t('alert.quote',{price:money(s.price)})),h('p',{class:'form-note'},t('alert.localNotice')),
 h('div',{class:'two-col'},h('label',{class:'form-field'},t('alert.when'),condition),h('label',{class:'form-field'},t('alert.price'),price)),h('label',{class:'form-field'},t('alert.expiry'),expiry),h('label',{class:'form-field'},t('alert.note'),note),feedback,
 h('div',{class:'form-actions'},button(t('common.cancel'),()=>dialog.close(),'btn btn-quiet'),h('button',{type:'submit',class:'btn btn-primary'},t('alert.save'))));
 dialog=showDialog({title:t(existing?'alert.edit':'alert.title'),content:form});
}
function mountAlerts(root){
 root.append(h('div',{class:'page-heading'},h('div',{class:'stack'},h('h1',{},t('nav.alerts')),h('p',{class:'muted'},t('alert.intro'))),button([icon('plus'),t('alert.add')],()=>openAlert(),'btn btn-primary')));
 if(!state.alerts.length){root.append(h('section',{class:'empty-state'},icon('bell',28),h('h2',{},t('alert.emptyTitle')),h('p',{},t('alert.emptyBody')),link(t('alert.browse'),'#/explore','btn btn-primary')));return;}
 const list=h('div',{class:'alert-list'});for(const a of state.alerts)list.append(h('article',{class:'alert-row'},h('div',{},h('div',{class:'row'},stockLink(a.ticker),badge(t('alert.localOnly'),'accent')),h('h3',{},t(a.condition==='above'?'alert.rowAbove':'alert.rowBelow',{price:money(a.price)})),h('p',{},t('alert.validUntil',{date:a.expiry})),a.note?h('p',{},a.note):null),h('div',{class:'row'},button(t('common.edit'),()=>openAlert(a.ticker),'btn btn-quiet'),button(t('common.remove'),()=>{state.alerts=state.alerts.filter(x=>x.id!==a.id);save();render(true);toast(t('alert.deleted'));},'btn btn-quiet'))));root.append(list,h('p',{class:'muted small',style:{marginTop:'20px'}},t('alert.localNotice')));
}
document.addEventListener('click',event=>{const anchor=event.target.closest?.('a[href^="#/stock/"]');if(anchor)rememberStockEntry(anchor.getAttribute('href'));},true);
window.addEventListener('hashchange',()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());render();});
window.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!document.querySelector('dialog[open]'))openSearch();}});
try {await language(state.lang);}catch{document.getElementById('app').textContent='The local preview could not load. Reload to try again.';}
