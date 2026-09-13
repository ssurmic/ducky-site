// Keep the complete dated public fixture: scores, missingness, source dates,
// reconstruction basis and loss-inclusive validation belong to that snapshot.
import {renderMacroBeta} from './macro-beta.js';
import {el} from './ui.js';
import {s} from './strings.js';

export function mountMarketContext(root,doc){
  if(doc?.schema!=='macro-beta/1'||doc.mode!=='RECONSTRUCTED_LAGGED'||
      doc.coverage?.point_in_time_vintages!==false||!doc.history?.length||
      !doc.as_of||!doc.observed_at||!doc.sources||!doc.validation)
    throw Error('invalid_public_market_snapshot');
  const view=renderMacroBeta(doc);
  root.replaceChildren(view);
  return view;
}

const root=document.getElementById('market-context-preview');
if(root){
  try{
    mountMarketContext(root,JSON.parse(document.getElementById('market-context-data').textContent));
  }catch{
    root.replaceChildren(el('p.errbox',{role:'status'},s('preview.market_unavailable')));
  }
}
