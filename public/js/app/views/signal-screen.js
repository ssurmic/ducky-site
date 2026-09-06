// One condition model from radar preview through saved filters and reminders.
import { s, LANG } from '../strings.js';
import * as api from '../api.js';
import * as store from '../store.js';
import { el, clear, spinner, toast, confirm } from '../ui.js';

const EVENTS=['insider','stake','partner','13f','political'];
export const defaults=()=>({scope:'covered',sector:'',cap_min:null,cap_max:null,events:[],event_op:'and',days:30,institutional_change:'all',
  oversold:false,rsi_max:null,iv_hv_max:null,drawdown_min:null,insider_min:200000});
export const presets={
  insider:()=>({...defaults(),events:['insider'],oversold:true}),
  institution:()=>({...defaults(),sector:'Technology',events:['stake'],cap_min:2e9}),
  volatility:()=>({...defaults(),iv_hv_max:1,drawdown_min:20}),
};
export function routePreset(value){
  if(value==='insider-oversold')return presets.insider();
  if(value==='institution-oversold')return {...defaults(),events:['stake','13f'],event_op:'or',oversold:true};
  return null;
}
const textDate=value=>value?new Intl.DateTimeFormat(LANG==='en'?'en-US':'zh-CN',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'—';
const money=value=>value==null?'—':new Intl.NumberFormat(LANG==='en'?'en-US':'zh-CN',{notation:'compact',style:'currency',currency:'USD',maximumFractionDigits:1}).format(value);
const sectorName=value=>{const label=s('radar.sector_'+value);return label==='radar.sector_'+value?value:label;};
const link=(href,label)=>el('a.btn.btn-ghost.btn-sm',{href},label);
function sourceLink(url,label){try{const parsed=new URL(url);if(parsed.protocol==='https:')return el('a',{href:parsed.href,target:'_blank',rel:'noopener noreferrer'},label);}catch{}return el('span',label);}

export function configSummary(c){
  const parts=[];
  if(c.scope==='watchlist')parts.push(s('screen.scope_watchlist'));
  if(c.sector)parts.push(sectorName(c.sector));
  if(c.cap_min!=null || c.cap_max!=null)parts.push(s('screen.cap_summary',{low:money(c.cap_min??0),high:c.cap_max==null?s('screen.no_limit'):money(c.cap_max)}));
  if(c.oversold)parts.push(s('screen.oversold'));
  if(c.rsi_max!=null)parts.push('RSI ≤ '+c.rsi_max);
  if(c.iv_hv_max!=null)parts.push('IV/HV ≤ '+c.iv_hv_max);
  if(c.drawdown_min!=null)parts.push(s('screen.drawdown_summary',{n:c.drawdown_min}));
  if(c.events?.length)parts.push(s('screen.events_summary',{days:c.days,events:c.events.map(k=>s('screen.event_'+k)).join(s('screen.join_'+c.event_op))}));
  if(c.events?.includes('13f') && c.institutional_change && c.institutional_change!=='all')parts.push(s('screen.institutional_change_'+c.institutional_change));
  return parts.join(' · ') || s('screen.no_conditions');
}

export function mountScreen(root,{signal,query}={}){
  let alive=true,request=0,current=defaults(),saved=[],lastPreview=null;
  const epoch=store.epoch(), screenId=query?.get('screen');
  const expanded=Boolean(screenId || query?.get('screening'));
  const box=el('details.signal-screen',{open:expanded},el('summary',el('strong',s('screen.title')),el('span.muted',s('screen.subtitle'))));
  root.append(box);
  const presetsRow=el('div.screen-presets',...Object.keys(presets).map(key=>el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>{fill(presets[key]());clearResults();}},s('screen.preset_'+key))));
  const fields={};
  const field=(name,node)=>{fields[name]=node;return el('label.screen-field',el('span',s('screen.'+name)),node);};
  const select=(name,values)=>field(name,el('select.input',{name,'aria-label':s('screen.'+name)},...values.map(v=>el('option',{value:v},s('screen.'+name+'_'+v)))));
  const number=(name,max,step='any')=>field(name,el('input.input',{type:'number',name,min:0,max,step,placeholder:s('screen.optional')}));
  const sector=field('sector',el('select.input',{name:'sector','aria-label':s('screen.sector')},el('option',{value:''},s('radar.sector_all'))));
  const oversold=el('input',{type:'checkbox',name:'oversold'});fields.oversold=oversold;
  const eventBoxes={};
  const eventChoice=el('fieldset.screen-events',el('legend',s('screen.event_label')),...EVENTS.map(kind=>{
    const node=el('input',{type:'checkbox',name:'event_'+kind});eventBoxes[kind]=node;
    return el('label',node,el('span',s('screen.event_'+kind)));
  }));
  const form=el('form.screen-form',
    el('div.screen-grid',select('scope',['covered','watchlist']),sector,number('cap_min',1000000),number('cap_max',1000000)),
    el('div.screen-technical',el('label.screen-check',oversold,el('span',s('screen.oversold'))),
      el('div.screen-grid',number('rsi_max',100),number('iv_hv_max',10),number('drawdown_min',100))),
    eventChoice,el('div.screen-grid',select('event_op',['and','or']),select('days',[7,30,90]),number('insider_min',1000000),select('institutional_change',['all','increased','decreased'])),
    el('details.screen-method',el('summary',s('market.details')),
      el('p.muted.small',s('screen.cap_note')),el('p.muted.small',s('screen.event_note'))));
  const status=el('p.screen-status',{role:'status','aria-live':'polite'}),results=el('div.screen-results');
  const preview=el('button.btn.btn-primary',{type:'submit'},s('screen.preview'));
  const reset=el('button.btn.btn-ghost',{type:'button',onclick:()=>{fill(defaults());clearResults();}},s('radar.reset'));
  form.append(el('div.screen-actions',preview,reset));
  const saveName=el('input.input',{name:'screen_name',maxlength:60,placeholder:s('screen.name_hint'),'aria-label':s('screen.name')});
  const notify=el('input',{type:'checkbox',name:'screen_notify'});
  const saveButton=el('button.btn.btn-primary',{type:'submit'},s('screen.save'));
  const saveForm=el('form.screen-save',el('h3',s('screen.save_title')),el('p.screen-save-summary'),
    el('label.screen-field',el('span',s('screen.name')),saveName),el('label.screen-check',notify,el('span',s('screen.notify'))),
    el('p.muted.small',s('screen.notify_note')),el('div.screen-actions',saveButton,link('#/profile',s('screen.delivery_settings'))));
  saveForm.hidden=true;
  const savedChoice=el('select.input',{'aria-label':s('screen.saved')},el('option',{value:''},s('screen.saved')));
  savedChoice.addEventListener('change',()=>{const row=saved.find(x=>String(x.id)===savedChoice.value);if(row){fill(row.config);saveName.value=row.name;clearResults();runPreview();}});
  box.append(el('div.screen-body',el('p',s('screen.explanation')),presetsRow,savedChoice,form,status,results,saveForm));
  fill(current);
  if(routePreset(screenId))fill(routePreset(screenId));
  form.addEventListener('submit',event=>{event.preventDefault();runPreview();});
  form.addEventListener('input',clearResults);
  form.addEventListener('change',clearResults);
  saveForm.addEventListener('submit',async event=>{
    event.preventDefault();if(!lastPreview || !saveName.reportValidity())return;
    if(!saveName.value.trim()){saveName.setCustomValidity(s('screen.name_required'));saveName.reportValidity();return;}
    saveButton.disabled=true;
    try{
      const row=await api.post('/screens',{name:saveName.value.trim(),config:lastPreview.config,notify:notify.checked},{signal});
      if(!valid())return;
      // Server may return an existing idempotent save with different notification
      // settings. Report what actually exists rather than a local checkbox.
      notify.checked=row.notify;toast(s(row.notify?'screen.saved_notify':'screen.saved_only'));
      await loadSaved();saveButton.textContent=s('screen.saved_open');saveButton.disabled=false;
    }catch(err){if(valid())toast(s('common.error',{msg:err.message}),'err');}
    finally{if(valid())saveButton.disabled=false;}
  });
  saveName.addEventListener('input',()=>saveName.setCustomValidity(''));
  api.get('/public/radar/facets.json',{auth:false,signal}).then(doc=>{
    if(!valid())return;
    for(const value of doc.sectors || [])if(!Array.from(fields.sector.options).some(o=>o.value===value))fields.sector.append(el('option',{value},sectorName(value)));
    fields.sector.value=current.sector;
  }).catch(()=>{});
  if(store.get('token'))loadSaved();
  const cleanup=()=>{alive=false;request++;};signal?.addEventListener('abort',cleanup,{once:true});return cleanup;

  function valid(){return alive && epoch===store.epoch();}
  function clearResults(){request++;lastPreview=null;saveForm.hidden=true;clear(results);status.textContent='';preview.disabled=false;}
  function fill(c){
    current={...defaults(),...c};
    for(const [key,node] of Object.entries(fields)){
      if(key==='oversold')node.checked=current[key];
      else if(key==='sector'){
        if(current[key] && !Array.from(node.options).some(o=>o.value===current[key]))node.append(el('option',{value:current[key]},sectorName(current[key])));
        node.value=current[key];
      }else node.value=current[key]==null?'':(['cap_min','cap_max'].includes(key)?current[key]/1e9:key==='insider_min'?current[key]/1e6:current[key]);
    }
    for(const [key,node] of Object.entries(eventBoxes))node.checked=current.events.includes(key);
  }
  function read(){
    const c=defaults();for(const [key,node] of Object.entries(fields)){
      if(key==='oversold')c[key]=node.checked;
      else if(node.type==='number')c[key]=node.value===''?null:Number(node.value)*(['cap_min','cap_max'].includes(key)?1e9:key==='insider_min'?1e6:1);
      else c[key]=key==='days'?Number(node.value):node.value;
    }
    c.events=EVENTS.filter(k=>eventBoxes[k].checked);return c;
  }
  async function loadSaved(){
    try{
      const doc=await api.get('/screens',{signal});if(!valid())return;saved=doc.items || [];
      clear(savedChoice);savedChoice.append(el('option',{value:''},s('screen.saved')),...saved.map(row=>el('option',{value:row.id},row.name)));
      if(screenId && !lastPreview){const row=saved.find(r=>String(r.id)===screenId);if(row){savedChoice.value=screenId;fill(row.config);saveName.value=row.name;runPreview();}}
    }catch{}
  }
  async function runPreview(){
    if(!store.isPro()){
      clearResults();status.replaceChildren(el('span',s('screen.pro')),link('#/billing',s('nav.billing')));return;
    }
    current=read();fields.cap_max.setCustomValidity(current.cap_min!=null && current.cap_max!=null && current.cap_min>=current.cap_max?s('screen.cap_error'):'');
    fields.insider_min.setCustomValidity(current.insider_min!=null && current.insider_min<200000?s('screen.insider_error'):'');
    if(!form.reportValidity())return;
    clearResults();const id=++request;preview.disabled=true;status.replaceChildren(spinner());
    try{
      const doc=await api.post('/screens/preview',{config:current},{signal});if(!valid() || id!==request)return;
      if(doc.status!=='ready'){status.textContent=s('screen.status_'+doc.status);return;}
      lastPreview=doc;saveForm.hidden=false;saveForm.querySelector('.screen-save-summary').textContent=configSummary(doc.config);
      if(!saveName.value)saveName.value=configSummary(doc.config).slice(0,60);
      status.textContent=s('screen.matches',{n:doc.total})+' · '+s('screen.as_of',{date:textDate(doc.built_at)});
      if(!doc.items?.length)results.append(el('div.screen-empty',el('p',s(doc.config.scope==='watchlist' && !doc.checked_tickers?'screen.watchlist_empty':'screen.empty')),
        doc.config.scope==='watchlist' && !doc.checked_tickers?link('#/watchlist',s('nav.watchlist')):null));
      else for(const item of doc.items)results.append(resultCard(item));
      if(doc.total>100)results.append(el('p.muted',s('screen.first_100')));
      const coverage=el('details.screen-coverage',el('summary',s('market.details')),
        el('p.small.muted',s('screen.result_count',{n:doc.total,unknown:doc.unknown_count,coverage:doc.coverage.tickers??'—',checked:doc.checked_tickers??'—'})),
        el('p.small.muted',s('screen.historical_note')));
      if(doc.coverage.event_stocks)coverage.append(el('p.muted.small',s('screen.source_coverage')+' '+EVENTS.map(k=>s('screen.event_'+k)+': '+(doc.coverage.event_stocks[k]??'—')).join(' · ')));
      results.append(coverage);
      if(doc.unknown_count){const unknown=el('details.screen-unknown',el('summary',s('screen.unknown_count',{n:doc.unknown_count})),el('p',s('screen.unknown_note')));
        for(const row of doc.unknown || [])unknown.append(el('p.small',row.ticker+' · '+row.reasons.map(r=>s('screen.unknown_'+r)).join(' · ')));
        results.append(unknown);
      }
    }catch(err){if(valid() && id===request)status.textContent=s('common.error',{msg:err.message});}
    finally{if(valid() && id===request)preview.disabled=false;}
  }
}

export function resultCard(item){
  const tech=item.technical_status==='stale'?{}:(item.technical || {});
  const facts=[item.sector?sectorName(item.sector):s('screen.unknown_sector'),money(item.market_cap)];
  const card=el('article.card.screen-match',el('div.screen-match-head',el('div',el('a.ticker',{href:'#/chart/'+encodeURIComponent(item.ticker)},'$'+item.ticker),
    el('span',item.company || '')),link('#/boards?mode=archive&ticker='+encodeURIComponent(item.ticker),s('screen.records'))),
    el('p.muted.small',facts.join(' · ')),el('p.small',
      ['RSI '+(tech.rsi_d==null?'—':Number(tech.rsi_d).toFixed(1)), 'IV/HV '+(tech.iv_hv==null?'—':Number(tech.iv_hv).toFixed(2)),
        s('screen.oversold')+' '+s(tech.oversold==null?'screen.unknown':tech.oversold?'screen.yes':'screen.no')].join(' · ')));
  card.append(el('p.muted.small',s('screen.company_at',{date:textDate(item.company_as_of)})),el('p.muted.small',s('screen.technical_at',{date:textDate(item.snapshot_at)})));
  if(item.technical_status==='stale')card.append(el('p.muted.small',s('screen.unknown_technical_stale')));
  for(const event of item.events || [])card.append(el('div.screen-evidence',el('span',s('screen.event_'+event.kind)),
    sourceLink(event.source_url,s('screen.filed_at',{date:String(event.published_at).slice(0,10)})),
    event.value?el('span',money(event.value)):null,
    event.event_date?el('span.muted.small',s('screen.event_at',{date:event.event_date})):null));
  for(const event of item.events || [])if(event.kind==='13f' && event.position_change)card.append(el('p.muted.small',
    s('screen.position_'+event.position_change)+' · '+s('screen.shares',{old:event.prior_shares??'—',now:event.new_shares??'—'})));
  return card;
}

export function mountSavedScreens(root,{signal}={}){
  let alive=true;const epoch=store.epoch();
  const box=el('section.screen-saved',el('h2',s('screen.saved_title')),el('p.muted',s('screen.saved_note')),
    link('#/boards?screening=1',s('screen.new'))),list=el('div.screen-saved-list');box.append(list);root.append(box);
  const valid=()=>alive && epoch===store.epoch();
  async function load(){
    list.replaceChildren(spinner());
    try{
      const [doc,history]=await Promise.all([api.get('/screens',{signal}),store.isPro()?api.get('/screens/hits',{signal}):Promise.resolve({items:[]})]);
      if(!valid())return;clear(list);
      if(!doc.items.length)list.append(el('p.muted',s('screen.saved_empty')));
      if(!doc.evaluation_enabled)list.append(el('p.muted',s('screen.paused_tier')));
      for(const row of doc.items){
        const toggle=el('button.btn.btn-ghost.btn-sm',{type:'button',disabled:!doc.evaluation_enabled && !row.notify,onclick:async()=>{
          toggle.disabled=true;try{await api.post('/screens/'+row.id,{notify:!row.notify},{signal});if(valid())await load();}catch(err){if(valid()){toggle.disabled=false;toast(s('common.error',{msg:err.message}),'err');}}
        }},s(row.notify?'screen.pause':'screen.enable'));
        const del=el('button.btn.btn-ghost.btn-sm.danger',{type:'button',onclick:async()=>{
          if(!await confirm(s('screen.delete_confirm')))return;del.disabled=true;
          try{await api.del('/screens/'+row.id,{signal});if(valid())await load();}catch(err){if(valid()){del.disabled=false;toast(s('common.error',{msg:err.message}),'err');}}
        }},s('common.delete'));
        list.append(el('article.card.screen-saved-row',el('h3',row.name),el('p',configSummary(row.config)),
          el('p.muted.small',s(!row.last_checked?'screen.waiting':row.notify?'screen.monitoring':'screen.in_app_only')),
          row.last_checked?el('p.muted.small',s('screen.checked',{date:textDate(row.last_checked)})):null,
          el('div.screen-actions',link('#/boards?screen='+row.id,s('screen.open')),toggle,del)));
      }
      if(history.items.length){list.append(el('h3',s('screen.hit_history')));
        for(const hit of history.items){const details=el('details.screen-hit',el('summary',hit.ticker+' · '+hit.name+' · '+textDate(hit.matched_at)),
          el('p.small',s('screen.delivery_'+hit.delivery)),resultCard(hit.evidence));list.append(details);}
      }
    }catch(err){if(valid())list.replaceChildren(el('p',s('common.error',{msg:err.message})),el('button.btn.btn-ghost',{type:'button',onclick:load},s('common.retry')));}
  }
  load();const cleanup=()=>{alive=false;};signal?.addEventListener('abort',cleanup,{once:true});return cleanup;
}
