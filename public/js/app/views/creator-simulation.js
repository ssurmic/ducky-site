import {s} from '../strings.js';
import {el,clear,pct,px} from '../ui.js';
import * as api from '../api.js';
import * as store from '../store.js';
import {metric,dateTime,safeSource} from './creator-research.js';

export function simulate(points,config,stance) {
  const {capital,cash,stock,dca,budget,cadence,reduce,trim,pause,accelerate,fee}=config;
  if(!Array.isArray(points)||points.length<2||points.some((p,i)=>!Number.isFinite(p.stock)||!Number.isFinite(p.spy)||p.stock<=-100||p.spy<=-100||(i>0&&p.d<=points[i-1].d)))throw Error('invalid_path');
  if(points[0].stock!==0||points[0].spy!==0)throw Error('invalid_base');
  if(![capital,cash,stock,budget,cadence,trim,fee].every(Number.isFinite)||capital<=0||capital>1e9||cash<0||stock<0||cash+stock>100||budget<0||budget>100||trim<0||trim>100||fee<0||fee>100||![1,5,20].includes(cadence))throw Error('invalid_config');
  const initialCash=capital*cash/100,allocation=initialCash*budget/100;
  const slots=Math.floor((points.length-1)/cadence),installment=slots?allocation/slots:0;
  return ['hold','dca','reaction'].map(mode=>{
    let money=initialCash,units=capital*stock/100,other=capital*(100-cash-stock)/100,cost=0,trades=0,spent=0;
    const path=points.map((p,i)=>{
      const price=1+p.stock/100;
      function buy(amount){const spend=Math.min(money,amount);if(spend<=0)return;const feePaid=spend*fee/10000;units+=(spend-feePaid)/price;money-=spend;cost+=feePaid;spent+=spend;trades++;}
      if(mode==='reaction'&&i===0&&stance==='bear'&&reduce&&trim>0){const sold=units*trim/100;const gross=sold*price;units-=sold;money+=gross*(1-fee/10000);cost+=gross*fee/10000;if(sold>0)trades++;}
      if(mode==='reaction'&&i===0&&stance==='bull'&&accelerate&&dca)buy(allocation);
      if(mode!=='hold'&&dca&&i>0&&i%cadence===0&&!(mode==='reaction'&&stance==='bear'&&pause))buy(Math.min(installment,Math.max(0,allocation-spent)));
      return {d:p.d,value:money+units*price+other*(1+p.spy/100)};
    });
    let peak=capital,drawdown=0;
    for(const p of path){peak=Math.max(peak,p.value);drawdown=Math.min(drawdown,(p.value/peak-1)*100);}
    return {mode,path,value:path.at(-1).value,ret:(path.at(-1).value/capital-1)*100,drawdown,cash:money,cost,trades};
  });
}

export function simulationRows(items,kolId='') {
  const first=new Map();
  for(const p of [...items].sort((a,b)=>a.revision_id-b.revision_id))if(p.calls?.length&&p.revision_id===p.first_verified_revision_id&&!first.has(p.id))first.set(p.id,p);
  return [...first.values()].filter(p=>!kolId||p.kol_id===kolId).flatMap(post=>post.calls.filter(c=>['bull','bear'].includes(c.stance)&&c.comparison_eligible!==false).map(call=>({post,call})));
}
const DEMO=[0,-1,-2,-1,-3,-5,-4,-6,-7,-5,-4,-3,-5,-6,-4,-2,-1,0,1,2,3].map((stock,i)=>({d:'D'+String(i).padStart(2,'0'),stock,spy:i*.12}));
const DEFAULT_CONFIG={capital:10000,cash:20,stock:40,dca:true,budget:40,cadence:5,reduce:true,trim:50,pause:true,accelerate:false,fee:10};

export async function mountSimulation(root,{kolId='',allowedIds=null,tickers=null,state={},onStateChange=()=>{}}={}) {
  const epoch=store.epoch();let rows=[],active=null,demo=state.demo===true,horizon=state.horizon || '20';
  let config=state.config || {...DEFAULT_CONFIG};
  root.append(el('p',{role:'status'},s('common.loading')));
  if(store.get('me')) {
    try{const doc=await api.get('/kol/research'+(kolId?'?kol_id='+encodeURIComponent(kolId):''));rows=simulationRows(doc.items || [],kolId).filter(r=>(!allowedIds||allowedIds.includes(r.post.kol_id))&&(tickers===null||tickers.includes(r.call.sym)));}
    catch{if(root.isConnected){clear(root);root.append(el('p.err',s('creators.research_error')));}return;}
  }
  if(epoch!==store.epoch()||!root.isConnected)return;
  active=rows[0] || null;render();
  function render() {
    state.config=config;state.demo=demo;state.horizon=horizon;onStateChange();
    clear(root);
    root.append(el('div.creator-lab-intro',el('div',el('p.eyebrow',s('creatorlab.eyebrow')),el('h2',s('creatorlab.title')),el('p.muted',s('creatorlab.intro'))),el('span.evidence-badge',demo?s('creatorlab.demo_badge'):s('creatorlab.simulation_badge'))));
    const chooser=el('div.evidence-controls');
    if(rows.length){const select=el('select.input',{'aria-label':s('creatorlab.opinion')},...rows.map((r,i)=>el('option',{value:i,selected:active===r},r.post.kol_name+' · '+r.call.sym+' · '+s('creators.take_'+r.call.stance)+' · '+dateTime(r.post.recorded_at))));select.addEventListener('change',()=>{active=rows[Number(select.value)];demo=false;render();});chooser.append(select);}
    chooser.append(el('button.btn.btn-ghost.btn-sm',{type:'button','aria-pressed':String(demo),onclick:()=>{demo=!demo;render();}},s(demo?'creatorlab.leave_demo':'creatorlab.try_demo')));
    const period=el('select.input',{'aria-label':s('creators.horizon')},...[5,20].map(n=>el('option',{value:n,selected:horizon===String(n)},s('creators.trading_days',{n}))));period.addEventListener('change',()=>{horizon=period.value;render();});chooser.append(period);root.append(chooser);
    if(demo)root.append(el('p.creator-demo-notice',s('creatorlab.demo_notice')));
    else if(!active)root.append(el('p.creator-demo-notice',s('creatorlab.no_data')));
    else {root.append(el('div.creator-lab-source',el('b',active.post.kol_name+' · $'+active.call.sym),el('blockquote',active.call.evidence),el('p.small',s('creatorlab.recorded')+' '+dateTime(active.post.recorded_at))));const url=safeSource(active.post.url);if(url)root.append(el('a',{href:url,target:'_blank',rel:'noopener noreferrer'},s('creators.orig')+' ↗'));}
    const layout=el('div.creator-lab-layout'),form=el('form.creator-lab-config'),output=el('section.creator-lab-output',{'aria-live':'polite'});const settings=el('details.creator-sim-settings',el('summary',s('creatorpage.adjust')),form);layout.append(output,settings);root.append(layout);
    form.addEventListener('submit',e=>e.preventDefault());
    form.append(el('button.btn.btn-ghost.btn-sm.creator-result-jump',{type:'button',onclick:()=>output.scrollIntoView({behavior:'smooth',block:'start'})},s('creatorlab.jump')),el('h3',s('creatorlab.allocation')));
    const allocation=el('div.creator-allocation');
    function input(key,label,min,max,step=1){const node=el('input.input',{type:'number',value:config[key],min,max,step,'aria-label':s(label)});node.addEventListener('input',()=>{config[key]=node.value===''?NaN:Number(node.value);update();});return el('label.creator-field',el('span',s(label)),node);}
    form.append(input('capital','creatorlab.capital',1,1e9),input('cash','creatorlab.cash',0,100),input('stock','creatorlab.stock',0,100),allocation,el('p.muted.small',s('creatorlab.other_hint')));
    function toggle(key,label){const n=el('input',{type:'checkbox',checked:config[key]});n.addEventListener('change',()=>{config[key]=n.checked;update();});return el('label.creator-toggle',n,el('span',s(label)));}
    form.append(el('h3',s('creatorlab.dca_title')),toggle('dca','creatorlab.dca_toggle'),input('budget','creatorlab.budget',0,100));
    const cadence=el('select.input',{'aria-label':s('creatorlab.cadence')},...[1,5,20].map(n=>el('option',{value:n,selected:config.cadence===n},s('creators.trading_days',{n}))));cadence.addEventListener('change',()=>{config.cadence=Number(cadence.value);update();});
    form.append(el('label.creator-field',el('span',s('creatorlab.cadence')),cadence),el('p.muted.small',s('creatorlab.budget_hint')),el('h3',s('creatorlab.reaction_title')),toggle('reduce','creatorlab.reduce'),input('trim','creatorlab.trim',0,100),toggle('pause','creatorlab.pause'),toggle('accelerate','creatorlab.accelerate'),input('fee','creatorlab.fee',0,100),el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>{config={...DEFAULT_CONFIG};render();}},s('creatorlab.reset')));
    root.append(el('details.creator-lab-method',el('summary',s('creatorlab.method_title')),el('p.muted.small',s('creatorlab.method')),el('p.muted.small',s('creatorlab.privacy'))));
    function update(){
      clear(allocation);clear(output);
      if(!Number.isFinite(config.cash)||!Number.isFinite(config.stock)||config.cash+config.stock>100||config.cash<0||config.stock<0){output.append(el('p.err',s('creatorlab.invalid')));return;}
      for(const [key,value]of [['cash',config.cash],['stock',config.stock],['other',100-config.cash-config.stock]])allocation.append(el('span',{class:'allocation-'+key,style:{flexGrow:String(value || .001)}},value>8?value+'%':''));
      output.append(el('p.small',s('creatorlab.configuration',{cash:config.cash,stock:config.stock,other:100-config.cash-config.stock,budget:px(config.capital*config.cash/100*config.budget/100)})));
      const window=active?.call.windows?.recorded,out=window?.horizons?.[horizon];
      const points=demo?DEMO.slice(0,Number(horizon)+1):window?.status==='ready'&&out?.status==='ready'?out.path:null;
      if(!points){output.append(el('div.creator-lab-wait',el('h3',s('creatorlab.wait_title')),el('p.muted',active?s('creators.status_'+(window?.status==='ready'?(out?.status||'missing_price'):(window?.status||'time_unknown'))):s('creatorlab.wait_body'))));return;}
      let result;try{result=simulate(points,config,demo?'bear':active.call.stance);}catch{output.append(el('p.err',s('creatorlab.invalid')));return;}
      output.append(el('p.small.muted',s('creatorlab.window')+' '+points[0].d+' → '+points.at(-1).d),comparisonChart(result,config.capital),el('p.creator-lab-difference',s('creatorlab.difference',{value:(result[2].value<result[0].value?'-':'+')+px(Math.abs(result[2].value-result[0].value))})));
      const table=el('div.creator-sim-results');
      for(const r of result)table.append(el('article',el('h4',s('creatorlab.mode_'+r.mode)),metric(s('creatorlab.final'),px(r.value),r.ret),metric(s('creatorlab.change'),pct(r.ret),r.ret),el('p.small',s('creatorlab.result_detail',{drawdown:pct(r.drawdown),fees:px(r.cost),n:r.trades}))));
      output.append(table,el('p.muted.small',s('creatorlab.comparison_hint')));
    }
    update();
  }
}

export function comparisonChart(results,capital) {
  const low=Math.min(capital,...results.flatMap(r=>r.path.map(p=>p.value))),high=Math.max(capital,...results.flatMap(r=>r.path.map(p=>p.value))),span=high-low||1;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 540 240');svg.setAttribute('role','img');svg.setAttribute('aria-label',results.map(r=>s('creatorlab.mode_'+r.mode)+' '+px(r.value)).join('; '));svg.classList.add('creator-sim-chart');
  const add=(tag,attrs,text)=>{const n=document.createElementNS(svg.namespaceURI,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text)n.textContent=text;svg.append(n);};
  const y=v=>22+(high-v)/span*174;
  for(const value of [...new Set([low,capital,high])]){add('line',{x1:65,x2:522,y1:y(value),y2:y(value),stroke:'var(--border)'});add('text',{x:58,y:y(value)+4,'text-anchor':'end',fill:'var(--muted)','font-size':11},Math.round(value).toLocaleString());}
  const colors=['var(--muted)','#7eafff','var(--accent)'];
  results.forEach((r,i)=>add('polyline',{points:r.path.map((p,j)=>`${65+j/(r.path.length-1)*457},${y(p.value)}`).join(' '),fill:'none',stroke:colors[i],'stroke-width':i===2?3:2,'stroke-dasharray':i===0?'5 4':i===1?'2 3':'none'}));
  for(const[x,text,anchor]of [[65,results[0].path[0].d,'start'],[522,results[0].path.at(-1).d,'end']])add('text',{x,y:224,'text-anchor':anchor,fill:'var(--muted)','font-size':11},text);
  return el('figure.creator-comparison',svg,el('figcaption',...results.map((r,i)=>el('span',{style:{color:colors[i]}},['┄ ','··· ','━ '][i]+s('creatorlab.mode_'+r.mode)))));
}
