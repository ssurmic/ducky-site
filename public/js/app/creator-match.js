// Exact source-index symbols, never substring guesses (MU must not match "Musk").
// A tag locates content; it does not imply a verified directional investment view.
export function taggedTickers(post) {
  return [...new Set([...(Array.isArray(post.tickers)?post.tickers:[]),
    ...(post.calls || []).filter(c=>typeof c.evidence==='string'&&c.evidence.length>=12).map(c=>c.sym)]
    .filter(t=>typeof t==='string'&&/^[A-Za-z][A-Za-z0-9.-]{0,9}$/.test(t)).map(t=>t.toUpperCase()))];
}
export function matchesStocks(post,tickers=null) {
  return tickers===null || taggedTickers(post).some(t=>tickers.includes(t));
}
