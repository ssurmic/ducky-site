// /go/<slug> — counted 302 to the bot deep link (SYSTEMDESIGN §1 funnel, §5 pages).
//   slug ∈ {xhs, x, wechat, tg, pricing, qr}  →  https://t.me/DuckyduckyTradeBot?start=src_<slug>
// If the ANALYTICS (Workers Analytics Engine) binding exists, one data point is written:
//   blobs: [slug, country, referer host]   doubles: [1]
// No cookies, no IP, no user id — nothing is stored per visitor.
const BOT = "DuckyduckyTradeBot";
const SLUGS = new Set(["xhs", "x", "wechat", "tg", "pricing", "qr"]);

function refererHost(request) {
  try { const r = request.headers.get("referer"); return r ? new URL(r).host : ""; } catch (e) { return ""; }
}

export async function onRequestGet({ request, params, env }) {
  const raw = String(params.slug || "").toLowerCase();
  const slug = SLUGS.has(raw) ? raw : "web";            // unknown slug → still lands on the bot, attributed as 'web'
  const target = `https://t.me/${BOT}?start=src_${slug}`;
  if (env && env.ANALYTICS && typeof env.ANALYTICS.writeDataPoint === "function") {
    try {
      env.ANALYTICS.writeDataPoint({
        blobs: [slug, (request.cf && request.cf.country) || "", refererHost(request)],
        doubles: [1],
        indexes: [slug],
      });
    } catch (e) { /* analytics must never break the redirect */ }
  }
  return new Response(null, {
    status: 302,
    headers: { Location: target, "Cache-Control": "no-store", "Referrer-Policy": "strict-origin-when-cross-origin" },
  });
}

export const onRequestHead = onRequestGet;
