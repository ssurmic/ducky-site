// Preserve the response timestamp and limit browser reuse across view changes.
export function unpackSnapshot(response, now = Date.now()) {
  const data = response?.snapshot || response || {};
  return {...data, research_access: response?.access?.locked?.length ? 'basic' : 'full', built_at: response?.built_at || data.built_at || null, fetched_at: now};
}
export function reusableSnapshot(snapshot, now = Date.now()) {
  return Boolean(snapshot?.ok && Number.isFinite(snapshot.fetched_at)
    && now >= snapshot.fetched_at && now - snapshot.fetched_at < 60000);
}
