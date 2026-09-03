{# Cloudflare Pages _headers — CSP exactly as SYSTEMDESIGN.md §5 (no X-Frame-Options: Telegram Web iframes Mini Apps) #}
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' https://telegram.org; connect-src 'self' {{ cfg.api_base }}; img-src 'self' data: https://t.me; style-src 'self' 'unsafe-inline'; frame-src https://oauth.telegram.org; frame-ancestors 'self' https://web.telegram.org
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/css/*
  Cache-Control: public, max-age=31536000, immutable

{# finding _headers.tpl:10 — /vendor/* (telegram-web-app.js, lightweight-charts, qrcode-generator) are the
   two largest assets and were getting Pages' revalidate-every-load default. All references carry ?v=<git sha>
   (build.py version_assets), so a new deploy busts the URL — immutable is safe. #}
/vendor/*
  Cache-Control: public, max-age=31536000, immutable

/js/*
  Cache-Control: public, max-age=600, stale-while-revalidate=86400

/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/config.js
  Cache-Control: public, max-age=300

{# finding _headers.tpl:25 — the SPA shells (index + /app/) had NO cache rule, so browsers held a stale HTML
   and kept importing the OLD ?v=<sha> module URLs even after a redeploy — users saw yesterday's app until a
   hard-refresh. no-cache = revalidate every load (304 when unchanged), so a normal refresh always picks up
   the newest shell → newest versioned modules. Content assets stay immutable/long-cache. #}
/app/*
  Cache-Control: no-cache, must-revalidate

/
  Cache-Control: no-cache, must-revalidate

/en/*
  Cache-Control: no-cache, must-revalidate
