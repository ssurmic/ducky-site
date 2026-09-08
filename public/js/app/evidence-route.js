export function evidenceHref(ticker,source=''){
  const tk=String(ticker||'').toUpperCase();
  if(!/^[A-Z][A-Z0-9.-]{0,9}$/.test(tk))return null;
  const ref=typeof source==='string'&&/^[A-Za-z0-9:_-]{1,100}$/.test(source)?source:'';
  return '#/evidence/'+tk+(ref?'?source='+encodeURIComponent(ref):'');
}
