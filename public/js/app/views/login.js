// views/login.js — web login: (a) Telegram Login Widget (lazy, redirect mode — auth.js consumes the return on boot),
// (b) "Open in Telegram" nonce flow with 5 s poll; the browser shows the confirmation code the bot echoes.
import { s, CFG } from "../strings.js";
import * as auth from "../auth.js";
import * as tg from "../tg.js";
import * as router from "../router.js";
import { el, clear, toast, spinner } from "../ui.js";

export async function mount(root) {
  let nonceCtl = null;
  const done = () => { toast(s("login.ok"), "ok"); router.go("#/watchlist"); };

  const card = el("section.card.login");
  card.append(el("h1", s("login.title")), el("p.muted", s("login.sub")));

  if (tg.inTG) {
    // Mini App launched but /auth/miniapp failed (auth.boot already tried) — offer a retry.
    const msg = el("p.errbox", s("login.miniapp_failed"));
    const retry = el("button.btn.btn-primary", { type: "button" }, s("common.retry"));
    retry.addEventListener("click", async () => {
      retry.disabled = true;
      try { await auth.establish(await (await import("../api.js")).auth.miniapp(tg.initData)); done(); }
      catch (e) { toast(s("login.failed", { msg: e.message })); retry.disabled = false; }
    });
    card.append(msg, retry);
    root.appendChild(card);
    return;
  }

  // (a) Login Widget — injected only on click (keeps the third-party script off the page until needed).
  //     Redirect mode: Telegram sends the user back to /app/?tglogin=1&id=…&hash=…; auth.boot() finishes the login.
  const widgetHost = el("div.widget-host");
  const widgetBtn = el("button.btn.btn-primary.btn-lg", { type: "button" }, s("login.widget"));
  widgetBtn.addEventListener("click", () => {
    widgetBtn.hidden = true;
    clear(widgetHost);
    widgetHost.appendChild(spinner(s("login.widget_loading")));
    const sc = auth.injectWidget(widgetHost);
    sc.addEventListener("load", () => {
      const sp = widgetHost.querySelector(".spinner-row"); if (sp) sp.remove();
      widgetHost.appendChild(el("p.muted.small", s("login.widget_hint")));
    });
    sc.addEventListener("error", () => { clear(widgetHost); widgetHost.appendChild(el("p.errbox", s("login.widget_blocked"))); });
  });
  card.append(el("div.login-block", widgetBtn, widgetHost));
  card.append(el("div.login-or.mono", s("login.or")));

  // (b) Nonce — zero-script fallback for mainland users.
  const nonceHost = el("div.nonce-host");
  const nonceBtn = el("button.btn.btn-ghost.btn-lg", { type: "button" }, s("login.open_tg"));
  nonceBtn.addEventListener("click", () => {
    nonceBtn.disabled = true;
    clear(nonceHost);
    nonceHost.appendChild(spinner());
    if (nonceCtl) nonceCtl.stop();
    nonceCtl = auth.startNonceLogin({
      onLink(link, nonce, code) {
        clear(nonceHost);
        const a = el("a.btn.btn-primary", { href: link, target: "_blank", rel: "noopener" }, s("login.open_tg"));
        const cmd = "/start login_" + nonce;
        nonceHost.append(a,
          el("p.nonce-code", s("login.nonce_code", { code: "" }), el("strong.mono", code || "—")),
          el("p.muted.small", s("login.nonce_manual", { bot: CFG.BOT, cmd: "" }), el("code.mono", cmd)),
          el("p.waiting.mono", { "data-wait": "" }, s("login.waiting", { s: 120 })));
        try { a.click(); } catch (e) { /* popup blocked: user taps */ }
      },
      onTick(left) { const w = nonceHost.querySelector("[data-wait]"); if (w) w.textContent = s("login.waiting", { s: left }); },
      onDone: done,
      onExpired() { clear(nonceHost); nonceHost.appendChild(el("p.errbox", s("login.expired"))); nonceBtn.disabled = false; },
      onError(e) { clear(nonceHost); nonceHost.appendChild(el("p.errbox", s("login.failed", { msg: e.message }))); nonceBtn.disabled = false; },
    });
  });
  card.append(el("div.login-block", nonceBtn, el("p.muted.small", s("login.nonce_hint")), nonceHost));
  root.appendChild(card);
  return () => { if (nonceCtl) nonceCtl.stop(); };
}
