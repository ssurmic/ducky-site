// Only public navigation choices belong in a shareable URL. Never include holdings,
// search text, credentials, or unpublished draft values.
export function creatorRoute(query = new URLSearchParams()) {
  const tab = ['feed', 'research', 'lab', 'rank'].includes(query.get('tab')) ? query.get('tab') : 'feed';
  const creator = query.get('creator') || '';
  return {
    tab,
    mine: !['discover','watchlist'].includes(query.get('scope')),
    watched: query.get('scope') === 'watchlist',
    ticker: /^[A-Za-z][A-Za-z0-9.-]{0,9}$/.test(query.get('ticker') || '') ? query.get('ticker').toUpperCase() : '',
    selected: /^[A-Za-z0-9_-]{1,100}$/.test(creator) ? creator : '',
    demo: tab === 'lab' && query.get('preview') === 'fictional',
    post: /^[A-Za-z0-9_-]{1,128}$/.test(query.get('post')||'') ? query.get('post') : '',
    point: /^[A-Za-z0-9:_-]{1,100}$/.test(query.get('point')||'') ? query.get('point') : '',
  };
}

export function creatorTarget(state) {
  const query = new URLSearchParams();
  if (['research', 'lab', 'rank'].includes(state.tab)) query.set('tab', state.tab);
  if (state.watched) query.set('scope', 'watchlist');
  else if (state.mine === false || state.ticker) query.set('scope', 'discover');
  if (/^[A-Z][A-Z0-9.-]{0,9}$/.test(state.ticker || '')) query.set('ticker', state.ticker);
  if (/^[A-Za-z0-9_-]{1,100}$/.test(state.selected || '')) query.set('creator', state.selected);
  if (state.tab === 'lab' && state.demo) query.set('preview', 'fictional');
  if(state.selected && state.tab==='feed' && /^[A-Za-z0-9_-]{1,128}$/.test(state.post||'')){
    query.set('post',state.post);
    if(/^[A-Za-z0-9:_-]{1,100}$/.test(state.point||''))query.set('point',state.point);
  }
  if(state.tab==='research' && /^[A-Za-z0-9:_-]{1,100}$/.test(state.point||''))query.set('point',state.point);
  return '#/creators' + (query.size ? '?' + query : '');
}

export function evidenceTarget(evidence){
  if(!/^[A-Za-z0-9_-]{1,100}$/.test(evidence?.creator_id||'') || !/^[A-Za-z0-9_-]{1,128}$/.test(evidence?.post_id||''))return null;
  return creatorTarget({tab:'feed',mine:false,selected:evidence.creator_id,post:evidence.post_id,point:evidence.point_id});
}
