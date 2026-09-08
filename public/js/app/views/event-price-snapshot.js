import {s} from '../strings.js';
import {el,px,pct} from '../ui.js';

function snapshotPercent(value) {
  if (!Number.isFinite(value)) return '—';
  let digits=1;
  // Preserve small recorded moves instead of displaying a signed zero.
  while (value!==0&&digits<4&&Number(value.toFixed(digits))===0) digits++;
  return pct(value===0?0:value,digits);
}

export function eventPriceSnapshot(context,{basis='publication',showWindow=false}={}) {
  context=context||{};
  const reference=context.publication_reference||{},latest=context.latest_close||{},change=context.since_publication||{};
  function price(label,value){return el('div',el('span.muted.small',s(label)),
    el('strong.mono',value.status==='ready'&&Number.isFinite(value.price)?px(value.price):'—'),
    el('span.muted.small',value.d||s('creators.price_waiting')));}
  const prices=el('div.study-price-snapshot',price(basis==='detection'?'social.detection_reference':'creators.publication_reference',reference),price('creators.latest_close',latest),
    el('div',el('span.muted.small',s('creators.since_publication')),
      el('strong.mono',{class:change.status==='ready'?(change.ret<0?'neg':change.ret>0?'pos':''):''},
        change.status==='ready'?snapshotPercent(change.ret):'—'),
      el('span.muted.small',s(change.status==='corporate_action_review'?'creators.price_review':'creators.raw_price_change'))));
  if(!showWindow)return prices;
  const window=context.publication_20||{};
  const result=window.status==='ready'?el('p.study-window',s(basis==='detection'?'social.twenty_day_result':'creators.twenty_day_result')+' ',
    el('strong.mono',{class:window.ret<0?'neg':window.ret>0?'pos':''},snapshotPercent(window.ret))):
    el('p.small.muted',s(window.status==='pending'?'social.twenty_day_pending':'social.price_pending'));
  return el('section.event-price-comparison',prices,result);
}
