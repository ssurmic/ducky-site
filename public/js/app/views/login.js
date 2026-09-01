// views/login.js — web login v2 (SYSTEMDESIGN §5.4 / §14.6):
//   ① QR / nonce — PRIMARY, auto-starts: scan with phone Telegram, tap Start, page polls and signs in
//   ② email + password (§14.6, verified email = username)
//   ③ Telegram Login Widget behind a fold (redirect mode; auth.js consumes the return on boot;
//      stays folded until BotFather /setdomain is done — the iframe errors before that)
// In-Telegram: retry initData only.
import { s, CFG } from "../strings.js";
import * as api from "../api.js";
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
    const msg = el("p.errbox", s("login.miniapp_failed"));
    const retry = el("button.btn.btn-primary", { type: "button" }, s("common.retry"));
    retry.addEventListener("click", async () => {
      retry.disabled = true;
      try { await auth.establish(await api.auth.miniapp(tg.initData)); done(); }
      catch (e) { toast(s("login.failed", { msg: e.message })); retry.disabled = false; }
    });
    card.append(msg, retry);
    root.appendChild(card);
    return;
  }

  // ── ⓪ Beta invite: a code + a username lets you start with NO Telegram and NO email ──
  const invForm = el("form.login-block.invite-form");
  const invCode = el("input.input.mono", { type: "text", placeholder: s("login.invite_code_ph"), autocomplete: "off", autocapitalize: "characters", spellcheck: "false", required: "" });
  const invUser = el("input.input", { type: "text", placeholder: s("login.invite_user_ph"), autocomplete: "off", autocapitalize: "none", spellcheck: "false", maxlength: "20", required: "" });
  const invBtn = el("button.btn.btn-primary.btn-lg", { type: "submit" }, s("login.invite_btn"));
  invForm.append(el("h2.login-h2", s("login.invite_title")), el("p.muted.small", s("login.invite_hint")), invCode, invUser, invBtn);
  invForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    invBtn.disabled = true;
    try {
      const resp = await auth.retryTransient(() => api.auth.redeem(invCode.value.trim(), invUser.value.trim()), 2);
      await auth.establish(resp);
      toast(s("login.invite_ok"), "ok");
      done();
    } catch (err) {
      const code = err.body && err.body.error;
      const msg = code === "username_taken" ? s("login.invite_taken")
        : code === "bad_username" ? s("login.invite_bad_user")
        : (code === "invite_invalid" || code === "invite_used") ? s("login.invite_bad_code")
        : err.status === 429 ? s("login.rate_limited")
        : (code === "no_code") ? s("login.invite_bad_code")
        : s("login.try_again");     // 404 (route not deployed) / 5xx / unknown → friendly, not a raw error
      toast(s("login.failed", { msg }), "err");
      invBtn.disabled = false;
    }
  });
  card.appendChild(invForm);
  card.append(el("div.login-or.mono", s("login.or")));

  // ── ① QR / nonce ──
  const qrBlock = el("div.login-block.qr-block");
  const qrHost = el("div.qr-host");
  const qrMeta = el("div.qr-meta");
  qrBlock.append(el("h2.login-h2", s("login.open_tg")), el("p.muted.small", s("login.qr_hint")), qrHost, qrMeta);
  card.appendChild(qrBlock);

  function startNonce() {
    if (nonceCtl) nonceCtl.stop();
    clear(qrHost); clear(qrMeta);
    qrHost.appendChild(spinner());
    nonceCtl = auth.startNonceLogin({
      onLink(link, nonce, code) {
        clear(qrHost);
        try {
          if (window.qrcode) {
            const q = window.qrcode(0, "M");
            q.addData(link); q.make();
            qrHost.innerHTML = q.createSvgTag(4, 8);
            const svg = qrHost.querySelector("svg");
            if (svg) { svg.removeAttribute("width"); svg.removeAttribute("height"); svg.classList.add("qr-svg"); }
          }
        } catch (e) { /* QR lib unavailable — the deep link below still works */ }
        const a = el("a.btn.btn-primary", { href: link, target: "_blank", rel: "noopener" }, s("login.open_tg"));
        const cmd = "/start login_" + nonce;
        qrMeta.append(a,
          el("p.nonce-code", s("login.nonce_code", { code: "" }), el("strong.mono", code || "—")),
          el("p.muted.small", s("login.nonce_manual", { bot: CFG.BOT, cmd: "" }), el("code.mono", cmd)),
          el("p.waiting.mono", { "data-wait": "" }, s("login.waiting", { s: 120 })));
      },
      onTick(left) { const w = qrMeta.querySelector("[data-wait]"); if (w) w.textContent = s("login.waiting", { s: left }); },
      onDone: done,
      onExpired() {
        clear(qrHost); clear(qrMeta);
        const again = el("button.btn.btn-primary", { type: "button" }, s("login.regen"));
        again.addEventListener("click", startNonce);
        qrMeta.append(el("p.errbox", s("login.expired")), again);
      },
      onError(e) {
        clear(qrHost); clear(qrMeta);
        const again = el("button.btn.btn-ghost.btn-sm", { type: "button" }, s("common.retry"));
        again.addEventListener("click", startNonce);
        qrMeta.append(el("p.errbox", s("login.failed", { msg: e.message })), again);
      },
    });
  }
  startNonce();

  card.append(el("div.login-or.mono", s("login.or")));

  // ── ② email + password ──
  const pwForm = el("form.login-block.pw-form");
  const email = el("input.input", { type: "email", name: "email", placeholder: s("login.pw_email"), autocomplete: "email", required: "" });
  const pass = el("input.input", { type: "password", name: "password", placeholder: s("login.pw_pass"), autocomplete: "current-password", required: "" });
  const pwBtn = el("button.btn.btn-ghost.btn-lg", { type: "submit" }, s("login.pw_btn"));
  pwForm.append(el("h2.login-h2", s("login.pw_title")), email, pass, pwBtn, el("p.muted.small", s("login.pw_hint")));
  pwForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    pwBtn.disabled = true;
    try {
      // retry a transient blip before surfacing an error, so a tunnel hiccup doesn't read as a login failure
      const resp = await auth.retryTransient(() => api.auth.password(email.value.trim(), pass.value), 2);
      await auth.establish(resp); done();
    } catch (err) {
      const msg = err.status === 401 ? s("login.pw_bad")
        : err.status === 429 ? s("login.rate_limited")
        : err.message;
      toast(s("login.failed", { msg }), "err");
      pwBtn.disabled = false;
    }
  });
  card.appendChild(pwForm);

  // ── ③ widget, folded ──
  const other = el("details.login-other", el("summary", s("login.other")));
  const widgetHost = el("div.widget-host");
  const widgetBtn = el("button.btn.btn-ghost", { type: "button" }, s("login.widget"));
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
  other.append(el("div.login-block", widgetBtn, widgetHost));
  card.appendChild(other);

  root.appendChild(card);
  return () => { if (nonceCtl) nonceCtl.stop(); };
}
