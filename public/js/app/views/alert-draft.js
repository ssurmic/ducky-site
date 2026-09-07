import {s,LANG} from '../strings.js';
import * as api from '../api.js';
import * as store from '../store.js';
import {el,clear,toast} from '../ui.js';

const EXAMPLES=['rsi','relative','vol','weekly'];
const unwrap = r => api.isAccepted(r) ? r.body : r;

export function mountDraft(root,{onCreated,signal,company=''}={}) {
  let stopped=false, revision=0, draft=null, timer=null, busy=false, confirming=false;
  const epoch=store.epoch();
  const card=el('section.card.alert-composer');
  const subject=el('input.input',{type:'text',value:company,maxlength:100,autocomplete:'off',placeholder:s('alertdraft.company_ph')});
  const text=el('textarea.input.alert-prompt',{rows:3,maxlength:500,required:true,placeholder:s('alertdraft.prompt_ph')});
  const submit=el('button.btn.btn-primary',{type:'submit'},s('alertdraft.translate'));
  const result=el('div.alert-translation',{'aria-live':'polite'});
  const form=el('form.alert-draft-form',el('label',el('span',s('alertdraft.prompt')),text),
    el('div.alert-draft-footer',el('label',el('span',s('alertdraft.company')),subject),submit));
  const examples=el('div.alert-examples',{role:'group','aria-label':s('alertdraft.examples')});
  EXAMPLES.forEach(key=>examples.append(el('button.example-chip',{type:'button',onclick:()=>{
    if(confirming)return;subject.value='';text.value=s('alertdraft.example_'+key);invalidate();text.focus();
  }},s('alertdraft.chip_'+key))));
  card.append(el('h2',s('alertdraft.title')),el('p.muted.small',s('alertdraft.help')),form,
    el('details.alert-example-options',el('summary',s('alertdraft.examples')),examples),result);root.append(card);
  function live(my=revision){return !stopped && !signal?.aborted && epoch===store.epoch() && my===revision;}
  function stopTimer(){if(timer)clearTimeout(timer);timer=null;}
  function invalidate(){revision++;draft=null;busy=false;stopTimer();submit.disabled=false;clear(result);}
  [text,subject].forEach(field=>field.addEventListener('input',invalidate));
  function errorMessage(error){
    const code=error.body?.error;
    return code==='draft_expired'?s('alertdraft.expired'):code==='translator_busy'?s('alertdraft.busy'):
      code==='draft_not_ready'?s('alertdraft.not_ready'):error.status===402?s('alertdraft.cap'):s('alertdraft.failed');
  }
  function pollLater(my){
    stopTimer();if(!live(my)||document.visibilityState==='hidden')return;
    timer=setTimeout(async()=>{
      timer=null;if(!live(my)||!draft)return;
      try {const data=await api.get('/alerts/drafts/'+draft.id);if(live(my))show(data,my);}
      catch(error){if(live(my)){clear(result);result.append(el('p.err',{role:'alert'},errorMessage(error)));busy=false;submit.disabled=false;}}
    },5000);
  }
  function show(data,my){
    if(!live(my))return;draft=data;clear(result);
    if(['queued','running'].includes(data.status)){
      result.append(el('div.translation-progress',el('span.spinner',{'aria-hidden':'true'}),el('p',{role:'status'},s('alertdraft.processing'))),el('p.muted.small',s('alertdraft.not_active')));
      pollLater(my);return;
    }
    busy=false;submit.disabled=false;stopTimer();
    if(data.status==='error'){result.append(el('p.err',{role:'alert'},s(data.error==='translator_busy'?'alertdraft.busy':'alertdraft.failed')));return;}
    const proposal=data.proposal;
    if(!proposal){result.append(el('p.err',s('alertdraft.failed')));return;}
    if(data.status==='needs_input'){
      result.append(el('h3',s('alertdraft.clarify')));
      for(const issue of proposal.issues || [])result.append(el('p',s('alertdraft.issue_'+issue)));
      if((proposal.candidates||[]).length>1)result.append(el('div.alert-examples',...proposal.candidates.map(c=>el('button.example-chip',{type:'button',onclick:()=>{
        subject.value=c.ticker;invalidate();submit.focus();
      }},c.name+' · '+c.ticker))));
      result.append(el('p.muted.small',s('alertdraft.edit_help')));return;
    }
    if(data.status!=='ready')return;
    const stock=proposal.candidates?.[0];
    result.append(el('div.translation-heading',el('div',el('p.eyebrow',s('alertdraft.review')),el('h3',stock?.name || ''),el('span.muted.mono',stock?.ticker || '')),el('span.chip',s('alertdraft.not_active_short'))));
    result.append(el('p.small',s(proposal.predicate?.op==='or'?'alertdraft.any':'alertdraft.all')));
    const metrics=el('div.translated-metrics');
    for(const metric of proposal.metrics || []){
      const title=metric[LANG==='en'?'en':'zh'];
      const op=s('alertdraft.cmp_'+({'<':'lt','<=':'le','>':'gt','>=':'ge','==':'eq','!=':'ne'}[metric.cmp]));
      const unit=metric.unit==='pp'?s('alertdraft.pp'):['%','USD'].includes(metric.unit)?metric.unit:'';
      const meaning=metric.field==='rs20' && metric.value<0 && ['<','<='].includes(metric.cmp)
        ?s('alertdraft.lag',{n:Math.abs(metric.value)})+(metric.cmp==='<'?s('alertdraft.strict'):s('alertdraft.inclusive'))
        :op+' '+metric.value+(unit?' '+unit:'');
      metrics.append(el('article.translated-metric',el('h4',title),el('strong',meaning),el('p.muted.small',s('alertdraft.metric_'+metric.field))));
    }
    result.append(metrics);
    if(proposal.benchmark)result.append(el('p.benchmark-note',s('alertdraft.benchmark')+' '+(proposal.benchmark.symbols||[]).join(' · '),el('br'),el('span.small',s('alertdraft.benchmark_note'))));
    if(proposal.defaults?.length)result.append(el('div.translation-defaults',el('strong',s('alertdraft.defaults')),...proposal.defaults.map(key=>el('p.small',s('alertdraft.default_'+key)))));
    result.append(el('p.muted.small',s('alertdraft.schedule')));
    const confirm=el('button.btn.btn-primary',{type:'button'},s('alertdraft.confirm'));
    const edit=el('button.btn.btn-ghost',{type:'button',onclick:()=>{invalidate();text.focus();}},s('alertdraft.edit'));
    confirm.addEventListener('click',async()=>{
      if(confirming||!live(my)||draft?.id!==data.id)return;
      confirming=true;confirm.disabled=true;edit.disabled=true;text.disabled=true;subject.disabled=true;submit.disabled=true;
      try {
        const created=await api.post('/alerts/drafts/'+data.id+'/confirm',{});
        if(!live(my))return;
        text.value='';subject.value='';invalidate();toast(s('alertdraft.created'),'ok');
        await onCreated?.(created);
      }catch(error){if(live(my))result.append(el('p.err',{role:'alert'},errorMessage(error)));}
      finally{confirming=false;if(live(my)){confirm.disabled=false;edit.disabled=false;}text.disabled=false;subject.disabled=false;submit.disabled=false;}
    });
    result.append(el('div.cta-row',edit,confirm));
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||confirming||text.value.trim().length<3)return;
    invalidate();const my=revision;busy=true;submit.disabled=true;
    result.append(el('p',{role:'status'},s('alertdraft.processing')));
    try {
      const response=unwrap(await api.post('/alerts/translate',{text:text.value.trim(),company:subject.value.trim(),lang:LANG}));
      if(live(my))show(response,my);
    }catch(error){if(live(my)){clear(result);result.append(el('p.err',{role:'alert'},errorMessage(error)));busy=false;submit.disabled=false;}}
  });
  const resume=()=>{if(live()&&draft&&['queued','running'].includes(draft.status))pollLater(revision);};
  document.addEventListener('visibilitychange',resume);window.addEventListener('online',resume);
  const dispose=()=>{stopped=true;revision++;stopTimer();document.removeEventListener('visibilitychange',resume);window.removeEventListener('online',resume);};
  signal?.addEventListener('abort',dispose,{once:true});return dispose;
}
