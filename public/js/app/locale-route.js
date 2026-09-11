// Existing Chinese OAuth callbacks and password-reset emails use /app/.
// English callbacks already use /en/app/. Preserve those issued links while
// ordinary no-prefix visits now use English; move before any auth exchange.
export function legacyAuthLocaleTarget(location) {
  if (!/^\/app(?:\/|\/index\.html)?$/.test(location.pathname)) return null;
  if (!/^#\/(?:oauth|reset)(?:\?|$)/.test(location.hash)) return null;
  return '/zh/app/' + location.search + location.hash;
}
