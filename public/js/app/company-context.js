// Current business identity and the evidence behind a comparison; no classification in the browser.
import { el, pct, num } from './ui.js';
import { s, LANG } from './strings.js';

export function companyContext(p, rs = {}) {
  const box = el('section.company-context', {'aria-label':s('company.title')});
  if (!p || p.status === 'pending') {
    box.append(el('p.muted.small',s('company.pending'))); return box;
  }
  const zh = LANG === 'zh';
  const label = (zh ? p.label_zh : p.label_en) || p.industry || (zh ? p.sector_zh : p.sector) || s('company.unknown');
  box.append(el('div.company-heading', el('strong',p.company || p.ticker), el('span.chip.chip-dim',label)));
  const business = zh ? p.business_zh : p.business_en;
  if (business) box.append(el('p.small',business));
  if (p.flow) {
    const flow = el('div.company-flow');
    for (const side of ['buy','sell']) {
      const text = p.flow[side+(zh?'_zh':'_en')];
      if (text) flow.append(el('div',el('strong.small',s('company.'+side)),el('p.small',text)));
    }
    box.append(flow);
  }
  const peers = p.peers || [];
  if (peers.length) {
    box.append(el('div.company-links',el('span.muted.small',s(p.comparison_enabled===false?'company.business_refs':'company.peers')),
      ...peers.map(t=>el('a.chip',{href:'#/chart/'+encodeURIComponent(t)},'$'+t))));
    if (rs.excess20 != null && peers.slice().sort().join() === (rs.symbols || []).slice().sort().join()) {
      box.append(el('p.small',s('company.comparison',{n:20,value:(rs.excess20>0?'+':'')+num(rs.excess20,1)})));
    }
  } else box.append(el('p.muted.small',s('company.no_peers')));
  if (p.related?.length) box.append(el('div.company-links',el('span.muted.small',s('company.related')),
    ...p.related.map(t=>el('a.chip',{href:'#/chart/'+encodeURIComponent(t)},'$'+t))));
  const details = el('details.company-evidence', el('summary',s('company.evidence')));
  const reason = zh ? p.reason_zh : p.reason_en;
  if (reason) details.append(el('p.small',reason));
  details.append(el('p.muted.small',s('company.related_note')));
  const when = p.reviewed_at || p.profile_as_of;
  if (when) details.append(el('p.muted.small',s('company.as_of',{date:String(when).slice(0,10)})));
  const w=rs.windows?.['20'];
  if(w?.start && w?.end) details.append(el('p.muted.small',s('company.window',{start:w.start,end:w.end})));
  for(const peer of w?.peers || []) details.append(el('p.small.mono',s('company.peer_return',{ticker:peer.ticker,value:pct(peer.return_pct)})));
  for (const source of [...(p.sources || []),...(p.peer_sources || [])]) {
    let url; try { url=new URL(source.url); } catch { continue; }
    if (url.protocol !== 'https:') continue;
    details.append(el('a.company-source.small',{href:url.href,target:'_blank',rel:'noopener noreferrer'},source.title || url.hostname));
  }
  box.append(details); return box;
}
