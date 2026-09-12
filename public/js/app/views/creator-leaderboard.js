import {s} from '../strings.js';
import {el,clear,pct} from '../ui.js';
import * as api from '../api.js';
import * as store from '../store.js';
import {dateTime,metric} from './creator-research.js';

export async function mountLeaderboard(root,{onSelect=()=>{},onSimulate=null}={}) {
  root.append(el('h2',s('creatorrank.title')),el('p.muted',s('creatorrank.intro')));
  const epoch=store.epoch(),target=el('div');root.append(target);target.append(el('p',{role:'status'},s('common.loading')));
  let doc;try{doc=await api.get('/kol/leaderboard');}catch{if(target.isConnected){clear(target);target.append(el('p.err',s('creators.research_error')));}return;}
  if(epoch!==store.epoch()||!target.isConnected)return;clear(target);
  if(doc.scope==='followed_creators')target.append(el('p.small.muted',s('creatorrank.followed_scope')));
  const rows=doc.rows || [],eligible=rows.filter(r=>r.eligible);
  target.append(el('div.evidence-metrics',metric(s('creatorrank.qualified'),eligible.length),metric(s('creatorrank.minimum'),'N ≥ 20'),metric(s('creatorrank.period'),'≥ 90 '+s('creatorrank.days')),metric(s('creatorrank.coverage'),'≥ 80%')),
    el('p.research-method',s('creatorrank.method')));
  if(!eligible.length)target.append(el('div.creator-ranking-empty',el('span.creator-ranking-mark',{'aria-hidden':'true'},'—'),el('div',el('h3',s('creatorrank.empty_title')),el('p.muted',s('creatorrank.empty_body')))));
  if(doc.truncated)target.append(el('p.err',s('creatorrank.truncated')));
  const table=el('div.creator-rank-list');
  const collecting=el('div.creator-rank-list');
  for(const row of rows){
    const rate=Number.isFinite(Number(row.rate))&&row.n?Number(row.rate):null;
    const art=el('article.creator-rank-row',{class:row.eligible?'is-eligible':'is-collecting'},
      el('strong.creator-rank-number',row.eligible?'#'+row.rank:'—'),
      el('div.creator-rank-main',
        el('div.creator-rank-head',el('button.creator-name',{type:'button',onclick:()=>onSelect(row.kol_id)},row.name),
          el('span.creator-rank-state',{class:row.eligible?'is-on':''},s(row.eligible?'creatorrank.ranked':'creatorrank.collecting'))),
        // The bar compares recorded direction agreement with the 50% mark; N sits beside it, as every rate must.
        rate===null?null:el('div.creator-rank-bar',{role:'img','aria-label':s('creatorrank.accuracy')+' '+rate+'% · N='+row.n},
          el('span.creator-rank-bar-track',el('span.creator-rank-bar-fill',{style:{width:Math.max(2,Math.min(100,rate)).toFixed(1)+'%'}}),el('span.creator-rank-bar-mid',{'aria-hidden':'true'})),
          el('span.creator-rank-bar-label',el('strong',rate+'%'),el('span.muted','N='+row.n))),
        el('p.muted.small.creator-rank-details',s('creatorrank.details',{pending:row.pending,missing:row.missing,repeated:row.repeated,flat:row.flat,coverage:row.coverage,days:row.span_days}))),
      el('div.creator-rank-stats',metric(s('creatorrank.accuracy'),row.n?row.rate+'%':'—'),metric(s('creatorrank.samples'),'N='+row.n),metric(s('creatorrank.wrong'),row.wrong)),
      el('div.creator-rank-actions',el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>onSelect(row.kol_id)},s('creators.research')),
        onSimulate?el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>onSimulate(row.kol_id)},s('creatorlab.tab')):null));
    (row.eligible?table:collecting).append(art);}
  target.append(table);
  if(rows.length>eligible.length)target.append(el('details.creator-rank-collecting',el('summary',s('creatorrank.progress',{n:rows.length-eligible.length})),el('p.muted.small',s('creatorrank.progress_hint')),collecting));
  target.append(el('details',el('summary',s('creatorrank.how')),el('p.muted.small',s('creatorrank.explanation'))),el('p.muted.small',s('creators.feed_asof')+' '+dateTime(doc.as_of)));
}
