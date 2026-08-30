// Serve the static detail page (/idea/index.html, built once per language by build.py) at /ideas/<slug>/.
// The page's JS reads the slug from location.pathname. /ideas/ itself (the list) falls through to the asset.
export function ideaRewrite(prefix) {
  return async function onRequest({ request, env, next }) {
    const url = new URL(request.url);
    const rest = url.pathname.slice(prefix.length).replace(/\/+$/, "");
    if (!rest || rest.indexOf("/") >= 0) return next();                 // "/ideas/" list page, or nested junk
    if (!/^[A-Za-z0-9._-]{1,80}$/.test(rest)) return next();            // 404 via static handler
    if (!url.pathname.endsWith("/")) return Response.redirect(url.origin + url.pathname + "/" + url.search, 301);
    const page = new URL(prefix.replace(/ideas\/$/, "idea/"), url.origin);
    const res = await env.ASSETS.fetch(new Request(page.toString(), { headers: request.headers }));
    return new Response(res.body, { status: res.status, headers: res.headers });
  };
}
