{# Cloudflare Pages _headers — CSP exactly as SYSTEMDESIGN.md §5 (no X-Frame-Options: Telegram Web iframes Mini Apps) #}
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' https://telegram.org; connect-src 'self' {{ cfg.api_base }}; img-src 'self' data: https://t.me; style-src 'self' 'unsafe-inline'; frame-src https://oauth.telegram.org; frame-ancestors 'self' https://web.telegram.org
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/css/*
  Cache-Control: public, max-age=31536000, immutable

/js/*
  Cache-Control: public, max-age=600, stale-while-revalidate=86400

/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/config.js
  Cache-Control: public, max-age=300
