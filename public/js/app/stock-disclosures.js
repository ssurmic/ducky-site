// Direct entry to the existing, server-filtered filing archive; no reads or inference.
import {el} from './ui.js';
import {s} from './strings.js';

const boards={insider:'insider',funds:'funds',politicians:'political'};
export function disclosureHref(ticker,kind){
  const symbol=String(ticker||'').toUpperCase();
  if(!/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)||!boards[kind])return '#/boards';
  return '#/boards?'+new URLSearchParams({board:boards[kind],ticker:symbol,mode:'archive',content:'all',purchases:'all'});
}
export function stockDisclosureLinks(ticker){
  return el('nav.stock-disclosure-links',{'aria-label':s('stockux.disclosures',{ticker})},
    el('span.stock-disclosure-label',s('explore.company_activity')),
    ...['insider','funds'].map(kind=>el('a',{href:disclosureHref(ticker,kind),'data-stock-disclosure':kind},
      el('span',s('stockux.disclosure_'+kind)),el('span',{'aria-hidden':'true'},'↗'))));
}
