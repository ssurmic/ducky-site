// Only public navigation choices belong in a shareable URL. Never include holdings,
// search text, credentials, or unpublished draft values.
export function creatorRoute(query = new URLSearchParams()) {
  const tab = ['feed', 'research', 'lab', 'rank'].includes(query.get('tab')) ? query.get('tab') : 'feed';
  const creator = query.get('creator') || '';
  return {
    tab,
    mine: query.get('scope') !== 'discover',
    selected: /^[A-Za-z0-9_-]{1,100}$/.test(creator) ? creator : '',
    demo: tab === 'lab' && query.get('preview') === 'fictional',
  };
}

export function creatorTarget(state) {
  const query = new URLSearchParams();
  if (['research', 'lab', 'rank'].includes(state.tab)) query.set('tab', state.tab);
  if (state.mine === false) query.set('scope', 'discover');
  if (/^[A-Za-z0-9_-]{1,100}$/.test(state.selected || '')) query.set('creator', state.selected);
  if (state.tab === 'lab' && state.demo) query.set('preview', 'fictional');
  return '#/creators' + (query.size ? '?' + query : '');
}
