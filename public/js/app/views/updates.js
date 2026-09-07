import {el,clear,spinner} from '../ui.js';
import {s,LANG} from '../strings.js';
import * as store from '../store.js';
import * as api from '../api.js';
import {symbolPicker} from '../symbol-picker.js';

const tickerPattern=/^[A-Z][A-Z0-9.-]{0,9}$/;
const idPattern=/^[1-9][0-9]{0,15}$/;
const topicId=t=>t.topic_type+':'+t.topic_key;
const text=value=>typeof value==='string'?value:'';
export function updateDate(value){const d=new Date(value);return value&&!Number.isNaN(d.getTime())?d.toISOString().replace('T',' ').slice(0,16)+' UTC':s('updates.date_unknown');}
export function sourceURL(value,seconds){
  try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return null;
    if(Number.isFinite(seconds)&&seconds>=0&&seconds<=86400&&['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(u.hostname))u.searchParams.set('t',Math.floor(seconds)+'s');
    return u.href;
  }catch{return null;}
}
function validTopic(topic){return topic&&['ticker','sector'].includes(topic.topic_type)&&
  (topic.topic_type==='ticker'?tickerPattern.test(topic.topic_key):/^[a-z][a-z0-9_-]{0,60}$/.test(topic.topic_key));}
function decodeKey(value){if(typeof value!=='string'||!/^[\w-]+$/.test(value))throw Error('invalid_key');
  return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),c=>c.charCodeAt(0));}
function bounded(promise){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('timeout')),10000);})]).finally(()=>clearTimeout(timer));}

export async function mount(root,route={}){
  const epoch=store.epoch(),token=store.get('token'),owner=store.get('me')?.user_id??store.get('me')?.id;
  const ctl=new AbortController(),opts={signal:ctl.signal};
  const query=route.query instanceof URLSearchParams?route.query:new URLSearchParams();
  const selectedId=idPattern.test(query.get('item')||'')?query.get('item'):'';
  let alive=true,locked=!store.isPro(),flight=null,mutation=false,deviceReady=false,pushBusy=false,picker=null;
  let deviceEndpoint='',previewBusy=false;
  let options={tickers:[],sectors:[],push_enabled:false},topics=[],items=[],cursor=null,unread=0,onlyUnread=false;
  let status='',loadError='',itemMissing=false,lastLoaded=0,ready=false,queuedRefresh=false,refreshTimer=null;
  let draftTicker=(query.get('ticker')||'').toUpperCase(),watchlistOpen=false;
  const disposers=[];
  const shell=el('div.updates-page');root.append(shell);
  const sessionValid=()=>alive&&!ctl.signal.aborted&&epoch===store.epoch()&&token===store.get('token')&&owner===(store.get('me')?.user_id??store.get('me')?.id);
  const valid=()=>sessionValid()&&!locked&&store.isPro();
  const visible=()=>document.visibilityState!=='hidden';
  const activeTopics=()=>topics.filter(t=>t.enabled);
  function clean(){if(!alive)return;alive=false;ctl.abort();clearTimeout(refreshTimer);picker?.dispose();disposers.forEach(fn=>fn());}
  function loseAccess(){queuedRefresh=false;clearTimeout(refreshTimer);locked=true;items=[];cursor=null;unread=0;status='';render();}
  function topicLabel(t){if(t.topic_type==='ticker')return '$'+t.topic_key;const sector=options.sectors.find(x=>x.key===t.topic_key);return text(sector?.['label_'+LANG])||s('updates.sector_'+t.topic_key);}
  const link=(href,label)=>el('a.btn.btn-ghost.btn-sm',{href},label);
  function render(){
    if(!sessionValid())return;
    const draft=shell.querySelector('[name=updates-ticker]');if(draft)draftTicker=draft.value;
    const watchChoices=shell.querySelector('.updates-watchlist');if(watchChoices)watchlistOpen=watchChoices.open;
    picker?.dispose();picker=null;clear(shell);
    const refresh=el('button.btn.btn-ghost.btn-sm',{type:'button',disabled:!!flight||mutation,'data-updates-refresh':'',onclick:()=>locked?loadManagement():load(false)},s('updates.refresh'));
    shell.append(el('div.view-head',el('div',el('a.small.muted',{href:'#/alerts'},s('updates.back')),el('h1',s('updates.title'))),refresh),
      el('p.view-intro.muted',s('updates.intro')));
    if(locked){shell.append(el('section.card.updates-gate',el('span.chip','Pro'),el('h2',s('updates.gate_title')),
      el('p',s('updates.gate_body')),el('ul',el('li',s('updates.gate_stock')),el('li',s('updates.gate_source')),el('li',s('updates.gate_inapp'))),
      link('#/billing',s('updates.upgrade')),link('#/creators?scope=discover',s('updates.browse_creators'))));
      if(flight)shell.append(spinner());
      if(status||loadError)shell.append(el('p.updates-status',{role:'status'},status||loadError));
      if(topics.length){const manage=el('section.card.updates-gate',el('h2',s('updates.manage_existing')),el('p.muted',s('updates.manage_hint')));
        for(const topic of topics)manage.append(el('div.updates-topic',el('strong',topicLabel(topic)),el('p.small.muted',s(topic.enabled?'updates.saved_inactive':'updates.paused')),
          topic.enabled?el('button.btn.btn-ghost.btn-sm',{type:'button',disabled:mutation||!!flight,'data-topic-pause':topicId(topic),onclick:()=>changeTopic({...topic,enabled:false,web_push:false})},s('updates.pause')):null,
          el('button.btn.btn-ghost.btn-sm',{type:'button',disabled:mutation||!!flight,'data-topic-remove':topicId(topic),onclick:()=>removeTopic(topic)},s('updates.remove'))));
        shell.append(manage);
      }return;}
    const notice=el('p.updates-status',{role:'status','aria-live':'polite'},status);shell.append(notice);
    if(loadError)shell.append(el('div.errbox',el('p',loadError),el('button.btn.btn-ghost',{type:'button',disabled:!!flight,onclick:()=>load(false)},s('common.retry'))));
    if(!ready){if(flight)shell.append(spinner());return;}
    const layout=el('div.updates-layout'),settings=el('aside.updates-settings'),feed=el('section.updates-feed');layout.append(settings,feed);shell.append(layout);
    if(topics.length){renderSavedTopics(settings);renderPush(settings);renderTopics(settings);}
    else{renderTopics(settings);renderPush(settings);}
    const counts=el('span.count.mono',s('updates.unread_count',{n:unread}));
    const unreadToggle=el('input',{type:'checkbox',checked:onlyUnread,'data-updates-unread':''});
    unreadToggle.addEventListener('change',()=>{onlyUnread=unreadToggle.checked;render();});
    feed.append(el('div.updates-feed-head',el('h2',s('updates.inbox')),counts),el('label.updates-check',unreadToggle,s('updates.only_unread')),
      el('p.small.muted',s('updates.inbox_basis')));
    if(itemMissing)feed.append(el('p.data-notice',s('updates.item_missing')));
    const shown=items.filter(row=>!onlyUnread||!row.read_at);
    if(!shown.length)feed.append(el('div.card.updates-empty',el('h3',s(onlyUnread?'updates.no_unread':'updates.empty_title')),
      el('p.muted',s(activeTopics().length?'updates.empty_following':'updates.empty_setup'))));
    for(const row of shown)feed.append(renderItem(row));
    if(cursor)feed.append(el('button.btn.btn-ghost',{type:'button',disabled:!!flight||mutation,'data-updates-more':'',onclick:()=>load(true)},s('updates.more')));
    if(flight)feed.append(el('p.small.muted',{role:'status'},s('common.loading')));
  }
  function renderTopics(target){
    const box=el('section.card.updates-topic-picker',el('h2',s('updates.topics')),el('p.small.muted',s('updates.topics_hint')));
    const input=el('input.input',{type:'text',name:'updates-ticker',value:draftTicker,maxlength:80,placeholder:s('updates.ticker_placeholder'),'aria-label':s('updates.ticker_label'),autocomplete:'off'});
    picker=symbolPicker(input,()=>activeTopics().filter(t=>t.topic_type==='ticker').map(t=>t.topic_key));
    const add=el('button.btn.btn-primary',{type:'submit',disabled:mutation||!!flight},s('updates.add'));
    const form=el('form.updates-add',picker.wrap,add);form.addEventListener('submit',event=>{
      event.preventDefault();const key=input.value.trim().replace(/^\$/,'').toUpperCase();
      if(!tickerPattern.test(key)){status=s('updates.ticker_invalid');render();return;}
      if(activeTopics().some(topic=>topic.topic_type==='ticker'&&topic.topic_key===key)){status=s('updates.already_following',{ticker:key});render();return;}
      changeTopic({topic_type:'ticker',topic_key:key,enabled:true,web_push:false});
    });box.append(form);
    const choices=el('fieldset.updates-choices',el('legend',s('updates.from_watchlist')));
    const available=options.tickers.filter(row=>tickerPattern.test(row.ticker));
    if(!available.length)choices.append(el('p.small.muted',s('updates.watchlist_empty')),link('#/watchlist',s('updates.open_watchlist')));
    for(const row of available){const current=topics.find(t=>t.topic_type==='ticker'&&t.topic_key===row.ticker);
      const check=el('input',{type:'checkbox',checked:!!current?.enabled,disabled:mutation||!!flight,'data-topic-choice':row.ticker});
      check.addEventListener('change',()=>changeTopic({topic_type:'ticker',topic_key:row.ticker,enabled:check.checked,web_push:current?.web_push===true}));
      choices.append(el('label.updates-choice',check,el('span',el('strong.mono',row.ticker),text(row.name)&&row.name!==row.ticker?el('small.muted',text(row.name)):null)));
    }
    box.append(el('details.updates-watchlist',{open:watchlistOpen},el('summary',s('updates.from_watchlist'),' ',el('span.count.mono',available.length)),choices));
    if(options.sectors.length){const sectors=el('fieldset.updates-choices',el('legend',s('updates.sectors')));
      for(const sector of options.sectors){if(!/^[a-z][a-z0-9_-]{0,60}$/.test(sector.key))continue;
        const current=topics.find(t=>t.topic_type==='sector'&&t.topic_key===sector.key),check=el('input',{type:'checkbox',checked:!!current?.enabled,disabled:mutation||!!flight,'data-sector-choice':sector.key});
        check.addEventListener('change',()=>changeTopic({topic_type:'sector',topic_key:sector.key,enabled:check.checked,web_push:current?.web_push===true}));
        sectors.append(el('label.updates-choice',check,text(sector['label_'+LANG])||s('updates.sector_'+sector.key)));
      }box.append(sectors,el('p.small.muted',s('updates.sector_note')));
    }
    target.append(box);
  }
  function renderSavedTopics(target){
    const box=el('section.card.updates-saved',el('h2',s('updates.saved_topics')));
    for(const topic of [...topics].sort((a,b)=>topicId(a).localeCompare(topicId(b)))){const push=el('input',{type:'checkbox','aria-label':s('updates.push_topic_for',{topic:topicLabel(topic)}),checked:topic.web_push===true,disabled:mutation||!!flight||(!topic.web_push&&(!deviceReady||!options.push_enabled||!topic.enabled))});
        push.addEventListener('change',()=>changeTopic({...topic,web_push:push.checked}));
        box.append(el('div.updates-topic',el('div.updates-topic-head',el('strong',topicLabel(topic)),el('span.small.muted',s(topic.enabled?'updates.inapp_on':'updates.paused'))),
          el('p.small.muted',s('updates.notify_from',{date:updateDate(topic.notify_from)})),
          el('div.updates-topic-actions',el('label.updates-check',push,s('updates.push_topic')),
            el('button.btn.btn-ghost.btn-sm',{type:'button',disabled:mutation||!!flight,'aria-label':s('updates.remove')+' '+topicLabel(topic),onclick:()=>removeTopic(topic)},s('updates.remove')))));
    }
    target.append(box);
  }
  function renderPush(target){
    const supported=typeof Notification!=='undefined'&&'serviceWorker' in navigator&&'PushManager' in window;
    const denied=supported&&Notification.permission==='denied';
    const key=!options.push_enabled?'push_unavailable':!supported?'push_unsupported':denied?'push_denied':deviceReady?'push_ready':'push_hint';
    target.append(el('section.card.updates-push',el('h2',s('updates.push_title')),el('p.small.muted',s('updates.'+key)),
      el('button.btn.btn-ghost',{type:'button',disabled:pushBusy||deviceReady||!supported||denied||!options.push_enabled,'data-updates-enable-push':'',onclick:enablePush},s(pushBusy?'common.loading':'updates.push_enable')),
      el('p.small.muted',s('updates.push_optional'))));
  }
  function renderItem(row){
    const selected=String(row.id)===selectedId,corrected=row.content_status==='superseded';
    const card=el('article.card.updates-item',{id:'update-'+row.id,'data-update-id':row.id,'data-unread':String(!row.read_at)});
    if(selected)card.classList.add('updates-selected');
    card.append(el('div.updates-item-top',el('span.updates-author',text(row.creator_name)||s('updates.creator_unknown')),
      el('span.chip',s(row.read_at?'updates.read':'updates.unread')),row.mode==='demo'?el('span.chip',s('updates.demo')):null,
      corrected?el('span.chip',s('updates.corrected')):null));
    // Superseded content must stay hidden even if an older response also carries its evidence.
    const reasons=(corrected?[]:Array.isArray(row.matched_reasons)?row.matched_reasons:[]).filter(r=>r&&['ticker','sector'].includes(r.type));
    const reasonList=el('div.updates-reasons');for(const reason of reasons){
      const label=reason.type==='ticker'&&tickerPattern.test(reason.key)?s('updates.direct',{ticker:reason.key}):reason.type==='sector'?s('updates.industry',{sector:reason.key==='semiconductors'?s('updates.sector_semiconductors'):text(reason.key)}):'';
      if(label)reasonList.append(el('span',{class:'updates-reason '+(reason.type==='ticker'?'updates-direct':'updates-sector')},label));
    }card.append(reasonList);
    card.append(el('h3',text(row.title)||s('updates.untitled')),
      el('p.small.muted',s('updates.published',{date:updateDate(row.published_at)})));
    const detail=el('details.updates-detail',{open:selected},el('summary',s(corrected?'updates.permalink':'updates.read_summary')));
    if(corrected)card.append(el('p.small.muted',s('updates.corrected_hint')));
    else{
      const summary=text(row.summary?.[LANG])||text(row.summary?.en)||text(row.summary?.zh);
      detail.append(el('p.updates-summary',summary||s('updates.summary_unavailable')),el('p.small.muted',s('updates.attributed')),
        el('p.small.muted',s('updates.transcript_basis',{source:s('updates.transcript_'+(row.transcript_source?.kind==='local_asr'?'asr':row.transcript_source?.kind==='youtube_captions'?(row.transcript_source.generated?'auto':'captions'):'unknown'))})+(text(row.transcript_source?.language)?' · '+text(row.transcript_source.language):'')));
    }
    const dates=el('dl.updates-dates',el('dt',s('updates.first_ready')),el('dd',updateDate(row.first_ready_at)),el('dt',s('updates.recorded')),el('dd',updateDate(row.created_at)));
    if(corrected&&row.correction?.corrected_at)dates.append(el('dt',s('updates.corrected_at')),el('dd',updateDate(row.correction.corrected_at)));
    detail.append(dates);
    if(reasons.length){detail.append(el('h4',s('updates.match_evidence')));
      for(const reason of reasons){const seconds=Number.isFinite(reason.start_seconds)&&reason.start_seconds>=0&&reason.start_seconds<=86400?reason.start_seconds:null;const url=sourceURL(row.source_url,seconds);
        detail.append(el('div.updates-evidence',text(reason.evidence)?el('blockquote',text(reason.evidence)):el('p.small.muted',s('updates.evidence_unavailable')),
          url&&seconds!==null?el('a',{href:url,target:'_blank',rel:'noopener noreferrer'},s('updates.source_time',{time:Math.floor(reason.start_seconds/60)+':'+String(Math.floor(reason.start_seconds%60)).padStart(2,'0')})):null));
      }
    }
    if(reasons.some(reason=>reason.type==='sector'))detail.append(el('p.small.muted',s('updates.sector_note')));
    card.append(detail);
    const actions=el('div.updates-item-actions'),source=sourceURL(row.source_url);
    if(source)actions.append(el('a.btn.btn-ghost.btn-sm',{href:source,target:'_blank',rel:'noopener noreferrer'},s('updates.original')));
    if(/^[A-Za-z0-9_-]{1,100}$/.test(row.creator_id||''))actions.append(link('#/creators?scope=discover&creator='+encodeURIComponent(row.creator_id),s('updates.creator_page')));
    actions.append(link('#/updates?item='+row.id,s('updates.permalink')));
    if(deviceReady&&!corrected)actions.append(el('button.btn.btn-ghost.btn-sm',{type:'button',disabled:previewBusy||mutation||!!flight,'data-update-preview':row.id,onclick:()=>previewPush(row)},s('updates.test_push')));
    if(!row.read_at)actions.append(el('button.btn.btn-ghost.btn-sm',{type:'button',disabled:mutation||!!flight,'data-update-read':row.id,onclick:()=>markRead(row)},s('updates.mark_read')));
    card.append(actions);return card;
  }
  async function load(more=false){
    if(!valid()||!visible()||flight||mutation)return flight;
    const before=more?cursor:null;if(more&&!before)return;
    flight=(async()=>{
      const requests=more?[api.creatorNotifications.inbox(before,opts)]:[
        api.creatorNotifications.options(opts),api.creatorNotifications.topics(opts),api.creatorNotifications.inbox(null,opts),
        ...(selectedId?[api.creatorNotifications.item(selectedId,opts)]:[])];
      const results=await Promise.allSettled(requests);if(!valid())return;
      if(results.some(result=>result.status==='rejected'&&result.reason?.status===402)){if(!more&&results[1]?.status==='fulfilled'&&Array.isArray(results[1].value?.topics))topics=results[1].value.topics.filter(validTopic);loseAccess();return;}
      loadError='';
      if(!more){
        if(results[0].status==='fulfilled')options={tickers:Array.isArray(results[0].value?.tickers)?results[0].value.tickers:[],sectors:Array.isArray(results[0].value?.sectors)?results[0].value.sectors:[],push_enabled:results[0].value?.push_enabled===true};
        if(results[1].status==='fulfilled')topics=(Array.isArray(results[1].value?.topics)?results[1].value.topics:[]).filter(validTopic);
        ready=results[0].status==='fulfilled'&&results[1].status==='fulfilled'||ready;
      }
      const inbox=results[more?0:2];
      if(inbox.status==='fulfilled'&&Array.isArray(inbox.value?.items)){
        const rows=inbox.value.items.filter(row=>idPattern.test(String(row?.id)));
        items=[...new Map((more?[...items,...rows]:rows).map(row=>[String(row.id),row])).values()];
        cursor=idPattern.test(String(inbox.value.next_cursor||''))?inbox.value.next_cursor:null;
        unread=Number.isSafeInteger(inbox.value.unread_count)?Math.max(0,inbox.value.unread_count):unread;
      }
      if(!more&&selectedId){const specific=results[3];itemMissing=specific.status==='rejected'&&specific.reason?.status===404;
        if(specific.status==='fulfilled'&&String(specific.value?.item?.id)===selectedId){items=items.filter(row=>String(row.id)!==selectedId);items.unshift(specific.value.item);}}
      if(results.some((r,i)=>r.status==='rejected'&&!(i===3&&r.reason?.status===404)))loadError=s('updates.load_error');
      lastLoaded=Date.now();
    })().catch(()=>{if(valid())loadError=s('updates.load_error');}).finally(()=>{flight=null;if(sessionValid()){render();pumpUpdates();}});
    render();return flight;
  }
  async function loadManagement(){
    if(!sessionValid()||!visible()||flight||mutation)return flight;
    flight=api.creatorNotifications.topics(opts).then(result=>{if(sessionValid()){topics=(Array.isArray(result?.topics)?result.topics:[]).filter(validTopic);loadError='';lastLoaded=Date.now();}})
      .catch(()=>{if(sessionValid())loadError=s('updates.load_error');}).finally(()=>{flight=null;if(sessionValid()){if(!locked&&!ready)load(false);else render();}});
    render();return flight;
  }
  async function mutate(operation,accept,management=false){
    const allowed=()=>sessionValid()&&(management||valid());
    if(!allowed()||mutation||flight)return;mutation=true;status=s('updates.saving');render();
    try{const result=await operation();if(!allowed())return;if(api.isAccepted(result))throw Error('pending');accept(result);status=s('updates.saved');}
    catch(error){if(allowed()){if(error.status===402){loseAccess();return;}status=s('updates.save_error');}}
    finally{mutation=false;if(sessionValid()){render();pumpUpdates();}}
  }
  function changeTopic(topic){
    if(!validTopic(topic)||(locked&&topic.enabled))return;
    const payload={topic_type:topic.topic_type,topic_key:topic.topic_key,enabled:topic.enabled===true,web_push:topic.web_push===true};
    if(payload.web_push&&!topics.find(t=>topicId(t)===topicId(topic))?.web_push&&!deviceReady)return;
    return mutate(()=>api.creatorNotifications.save(payload,opts),response=>{
      if(!validTopic(response?.topic))throw Error('invalid_response');
      topics=topics.filter(t=>topicId(t)!==topicId(response.topic));topics.push(response.topic);
    },!payload.enabled);
  }
  function removeTopic(topic){return mutate(()=>api.creatorNotifications.remove(topic.topic_type,topic.topic_key,opts),()=>{topics=topics.filter(t=>topicId(t)!==topicId(topic));},true);}
  function markRead(row){if(items.find(item=>String(item.id)===String(row.id))?.read_at)return;return mutate(()=>api.creatorNotifications.read(row.id,opts),response=>{
    if(response?.ok!==true)throw Error('invalid_response');items=items.map(item=>String(item.id)===String(row.id)?{...item,read_at:new Date().toISOString()}:item);unread=Math.max(0,unread-1);
  });}
  async function enablePush(){
    if(!valid()||pushBusy||!options.push_enabled||typeof Notification==='undefined')return;
    pushBusy=true;status='';render();
    try{
      // The permission prompt is reached only from this explicit button, before any network await.
      const permission=await Notification.requestPermission();if(!valid())return;
      if(permission!=='granted'){status=s('updates.push_denied');return;}
      const config=await api.push.config(opts);if(!valid())return;
      if(!config?.enabled||!config.vapid_public){status=s('updates.push_unavailable');return;}
      const registration=await bounded(navigator.serviceWorker.register('/sw.js'));if(!valid())return;
      await bounded(navigator.serviceWorker.ready);if(!valid())return;
      let subscription=await bounded(registration.pushManager.getSubscription());if(!valid())return;
      if(!subscription)subscription=await bounded(registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(config.vapid_public)}));
      if(!valid())return;
      const response=await api.push.subscribe(subscription.toJSON(),opts);if(!valid())return;
      if(api.isAccepted(response)||response?.subscribed!==true)throw Error('pending');
      deviceEndpoint=subscription.toJSON().endpoint;deviceReady=true;status=s('updates.push_ready');
    }catch{if(valid())status=s('updates.push_error');}
    finally{pushBusy=false;if(sessionValid())render();}
  }
  async function previewPush(row){
    if(!valid()||!deviceReady||!deviceEndpoint||previewBusy||row.content_status==='superseded'||items.find(item=>String(item.id)===String(row.id))?.content_status==='superseded')return;
    previewBusy=true;status=s('updates.test_sending');render();
    try{
      const response=await api.creatorNotifications.preview(row.id,deviceEndpoint,opts);if(!valid())return;
      status=s(response?.accepted===true?'updates.test_accepted':'updates.test_failed');
    }catch(error){if(valid())status=s(error?.status===429?'updates.test_cooldown':'updates.test_failed');}
    finally{previewBusy=false;if(sessionValid())render();}
  }
  function pumpUpdates(){
    if(!queuedRefresh||!valid()||!visible()||flight||mutation||refreshTimer)return;
    refreshTimer=setTimeout(()=>{refreshTimer=null;if(!valid()||!visible()||flight||mutation)return;queuedRefresh=false;load(false);},Math.max(0,2000-(Date.now()-lastLoaded)));
  }
  function incoming(event){
    if(event.data?.type!=='ducky-creator-update'||(event.origin&&event.origin!==location.origin)||!valid())return;
    queuedRefresh=true;pumpUpdates();
  }
  const worker=navigator.serviceWorker;
  if(worker?.addEventListener){worker.addEventListener('message',incoming);disposers.push(()=>worker.removeEventListener('message',incoming));}
  function onSession(){
    if(!sessionValid()){clean();clear(root).append(el('p.muted',s('updates.session_changed')),link('#/updates',s('updates.entry_open')));return;}
    if(!store.isPro())loseAccess();
    else if(locked){locked=false;ready=false;load(false);}
  }
  const resume=()=>{if(!visible()){clearTimeout(refreshTimer);refreshTimer=null;return;}
    if(queuedRefresh){pumpUpdates();return;}
    if(sessionValid()&&Date.now()-lastLoaded>30000){if(locked)loadManagement();else load(false);}};
  disposers.push(store.subscribe('me',onSession),store.subscribe('token',onSession));
  document.addEventListener('visibilitychange',resume);window.addEventListener('online',resume);
  disposers.push(()=>document.removeEventListener('visibilitychange',resume),()=>window.removeEventListener('online',resume));
  route.signal?.addEventListener('abort',clean,{once:true});
  if(route.signal?.aborted){clean();return clean;}
  render();if(locked)await loadManagement();else await load(false);return clean;
}
