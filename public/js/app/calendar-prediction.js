import { el } from './ui.js';
import { s } from './strings.js';
import { readableDate } from './date-format.js';

export function predictionPanel(doc) {
  const box=el('section.prediction-panel',el('h4',s('market.probabilities')));
  const rows=Array.isArray(doc?.markets)?doc.markets:[];
  if(!rows.length) {
    box.append(el('p.small.muted',s('market.prediction_'+(doc?.status==='unsupported'?'unsupported':'missing'))));
    return box;
  }
  box.append(el('p.small',s('market.probability_method')),
    el('p.small.muted',s('market.observed',{date:readableDate(doc.observed_at)})+' · '+s('market.event_date',{date:doc.event_date||'—'})));
  if(doc.status==='stale')box.append(el('p.data-notice',{role:'status'},s('market.stale')));
  if(doc.historical)box.append(el('p.data-notice',s('market.historical_odds')));
  for(const market of rows) {
    const card=el('article.prediction-contract');
    card.append(el('h5',market.group_label||market.question));
    const outcomes=el('div.prediction-outcomes');
    for(const outcome of market.outcomes||[]) {
      const probability=outcome.probability;
      outcomes.append(el('span.prediction-outcome',el('span',outcome.label),
        el('strong.mono',typeof probability==='number'&&Number.isFinite(probability)&&probability>=0&&probability<=1?(probability*100).toFixed(1)+'%':'—')));
    }
    card.append(outcomes);
    if(market.status!=='ok')card.append(el('p.small.data-notice',s('market.contract_'+market.status)));
    const details=el('details',el('summary',s('market.question_rules')));
    details.append(el('p',market.question),el('p.small.muted',s('market.provider_updated',{date:readableDate(market.provider_updated_at)})),
      el('p.small',s('market.liquidity',{liquidity:money(market.liquidity_usd),volume:money(market.volume_24h_usd)})),
      el('p.small.muted',s('market.spread',{value:market.spread_pp??'—'})),
      el('p.small.prediction-rules',market.resolution_rules||s('market.rules_missing')));
    const url=source(market.source_url);
    if(url) details.append(el('a.small',{href:url,target:'_blank',rel:'noopener noreferrer'},s('market.contract_source')+' ↗'));
    card.append(details);box.append(card);
  }
  box.append(el('p.small.muted',s('market.independent_contracts')));
  box.append(el('a.small',{href:'#/boards'},s('market.context_link')+' →'));
  return box;
}

function source(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='polymarket.com'?u.href:null;}catch{return null;}}
function money(value){return typeof value==='number'&&Number.isFinite(value)?'$'+Math.round(value).toLocaleString():'—';}
