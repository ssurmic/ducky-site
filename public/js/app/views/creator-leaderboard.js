import {s} from '../strings.js';
import {el,clear,pct} from '../ui.js';
import * as api from '../api.js';
import * as store from '../store.js';
import {dateTime,metric} from './creator-research.js';

export async function mountLeaderboard(root,{onSelect=()=>{}}={}) {
  root.append(el('p.eyebrow','LEADERBOARD'),el('h2',s('creatorrank.title')),el('p.muted',s('creatorrank.intro')));
  if(!store.isPro()){root.append(el('p',s('creators.research_pro')),el('a.btn.btn-primary',{href:'#/billing'},s('creators.upgrade')));return;}
  const epoch=store.epoch(),target=el('div');root.append(target);target.append(el('p',{role:'status'},s('common.loading')));
  let doc;try{doc=await api.get('/kol/leaderboard');}catch{if(target.isConnected){clear(target);target.append(el('p.err',s('creators.research_error')));}return;}
  if(epoch!==store.epoch()||!target.isConnected)return;clear(target);
  const rows=doc.rows || [],eligible=rows.filter(r=>r.eligible);
  target.append(el('div.evidence-metrics',metric(s('creatorrank.qualified'),eligible.length),metric(s('creatorrank.minimum'),'N ≥ 20'),metric(s('creatorrank.period'),'≥ 90 '+s('creatorrank.days')),metric(s('creatorrank.coverage'),'≥ 80%')),
    el('p.research-method',s('creatorrank.method')));
  if(!eligible.length)target.append(el('div.creator-ranking-empty',el('span.creator-ranking-mark',{'aria-hidden':'true'},'—'),el('div',el('h3',s('creatorrank.empty_title')),el('p.muted',s('creatorrank.empty_body')))));
  if(doc.truncated)target.append(el('p.err',s('creatorrank.truncated')));
  const table=el('div.creator-rank-list');
  for(const row of rows){const art=el('article.creator-rank-row',el('strong.creator-rank-number',row.eligible?'#'+row.rank:'—'),el('div',el('button.creator-name',{type:'button',onclick:()=>onSelect(row.kol_id)},row.name),el('p.muted.small',row.eligible?s('creatorrank.ranked'):s('creatorrank.collecting'))));
    const details=el('div.creator-rank-stats',metric(s('creatorrank.accuracy'),row.n?row.rate+'%':'—'),metric(s('creatorrank.samples'),'N='+row.n),metric(s('creatorrank.wrong'),row.wrong));
    art.append(details,el('p.muted.small',s('creatorrank.details',{pending:row.pending,missing:row.missing,repeated:row.repeated,flat:row.flat,coverage:row.coverage,days:row.span_days})));table.append(art);}
  target.append(table,el('details',el('summary',s('creatorrank.how')),el('p.muted.small',s('creatorrank.explanation'))),el('p.muted.small',s('creators.feed_asof')+' '+dateTime(doc.as_of)));
}
