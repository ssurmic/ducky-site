// views/profile.js — §14 member profile: email (required before billing), display name, language, country,
// marketing opt-in; 6-digit email verification; /deleteme. Server validates; this view only draws.
import { s } from "../strings.js";
import * as api from "../api.js";
import * as auth from "../auth.js";
import * as store from "../store.js";
import * as router from "../router.js";
import { el, clear, toast, spinner, errorBox, confirm } from "../ui.js";
import { safeTarget } from "../login-target.js";

export async function mount(root, params = {}) {
  const lifetime = new AbortController();
  const owner = store.get('me')?.user_id ?? store.get('me')?.id;
  const initialEpoch = store.epoch(), initialToken = store.get('token');
  const cleanup = () => { lifetime.abort(); params.signal?.removeEventListener('abort', cleanup); };
  params.signal?.addEventListener('abort', cleanup, {once:true});
  if (params.signal?.aborted) { cleanup(); return cleanup; }
  const card = el("section.card.profile");
  root.appendChild(card);
  card.appendChild(spinner());
  const mounted = () => !lifetime.signal.aborted && root.isConnected && root.contains(card) &&
    owner === (store.get('me')?.user_id ?? store.get('me')?.id);
  const initialSession = () => mounted() && store.epoch() === initialEpoch && store.get('token') === initialToken;
  let prof = null;
  let providers = {};
  try { providers = await api.auth.providers(); } catch (_) {}
  if (!initialSession()) return cleanup;
  try { prof = await api.profile.get(); } catch (e) {
    if (initialSession()) { clear(card); card.appendChild(errorBox(e, () => { cleanup(); clear(root); mount(root, params); })); }
    return cleanup;
  }
  if (!initialSession()) return cleanup;
  render();
  return cleanup;

  function render() {
    clear(card);
    const me = store.get("me") || {};
    card.append(el("h1", s("profile.title")), el("p.muted", s("profile.sub")));
    const form = el("form.form", { novalidate: "" });
    const email = input("email", "email", prof.email || "", s("profile.email"), true);
    const name = input("display_name", "text", prof.display_name || me.first_name || "", s("profile.name"), false);
    const lang = el("select.input", { name: "lang" }, el("option", { value: "zh" }, "中文"), el("option", { value: "en" }, "English"));
    lang.value = prof.lang || (document.documentElement.lang || "zh").slice(0, 2);
    const country = input("country", "text", prof.country || "", s("profile.country"), false);
    const opt = el("label.check", el("input", { type: "checkbox", name: "marketing_opt_in", checked: prof.marketing_opt_in ? "" : null }), " " + s("profile.marketing"));
    form.append(email.wrap, name.wrap, field(s("profile.lang"), lang), country.wrap, opt,
      el("p.muted.small", s("profile.privacy")),
      el("div.cta-row", el("button.btn.btn-primary", { type: "submit" }, s("profile.save"))));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const save = form.querySelector("button[type=submit]");
      if (save.disabled) return;
      const body = { email: email.el.value.trim(), display_name: name.el.value.trim(), lang: lang.value, country: country.el.value.trim(), marketing_opt_in: !!form.querySelector("[name=marketing_opt_in]").checked };
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) { toast(s("profile.email_invalid"), "err"); email.el.focus(); return; }
      save.disabled = true;
      try {
        prof = await api.profile.save(body);
        toast(s(prof.send_error || prof.dry_run ? "recovery.unavailable" : "profile.saved"), prof.send_error || prof.dry_run ? "err" : "ok");
        await auth.refreshMe();
        render();
      } catch (err) { toast(s("common.error", { msg: err.message }), "err"); }
      finally { save.disabled = false; }
    });
    card.appendChild(form);

    // verification block
    const v = el("section.verify");
    if (prof.email && !prof.email_verified) {
      v.append(el("h2", s("profile.verify_title")), el("p.muted.small", s("profile.verify_sub", { email: prof.email })));
      const code = el("input.input.mono", { type: "text", inputmode: "numeric", maxlength: "6", placeholder: "123456", autocomplete: "one-time-code" });
      const btn = el("button.btn.btn-primary.btn-sm", { type: "button" }, s("profile.verify_btn"));
      const resend = el("button.btn.btn-ghost.btn-sm", { type: "button" }, s("profile.resend"));
      btn.addEventListener("click", async () => {
        if (btn.disabled) return;
        btn.disabled = true;
        try {
          const res = await api.profile.verify(code.value.trim());
          // the verify route returns the full profile view; re-fetch if an older backend only sent the flags
          prof = (res && res.email !== undefined) ? res : await api.profile.get();
          toast(s("profile.verified"), "ok"); await auth.refreshMe(); render();
        } catch (err) { toast(s("login.try_again"), "err"); }
        finally { btn.disabled = false; }
      });
      resend.addEventListener("click", async () => {
        if (resend.disabled) return;
        resend.disabled = true;
        try {
          const response = await api.profile.resend();
          const result = api.isAccepted(response) ? response.body : response;
          toast(s(result?.sent && !result?.dry_run ? "profile.resent" : "recovery.unavailable"),
            result?.sent && !result?.dry_run ? "ok" : "err");
        } catch (err) { toast(s(err.body?.error === "send_failed" ? "recovery.unavailable" : "login.try_again"), "err"); }
        finally { resend.disabled = false; }
      });
      v.append(el("div.cta-row", field(s("profile.code_label"), code), btn, resend));
    } else if (prof.email && prof.email_verified) {
      v.append(el("p.ok", "✅ " + s("profile.verified_badge", { email: prof.email })));
    }
    card.appendChild(v);

    const next = safeTarget("#/" + new URLSearchParams(location.hash.split("?")[1] || "").get("next"));
    if (next) card.appendChild(el("p", el("a.btn.btn-ghost.btn-sm", { href: next }, s("profile.continue"))));

    // §14.6 login password (web email+password sign-in)
    const pw = el("section.pwsec");
    pw.append(el("h2", s("profile.pw_title")), el("p.muted.small", s("profile.pw_hint")));
    const newPw = el("input.input", { type: "password", autocomplete: "new-password", placeholder: s("profile.pw_new") });
    const oldPw = el("input.input", { type: "password", autocomplete: "current-password", placeholder: s("profile.pw_old") });
    const pwBtn = el("button.btn.btn-primary.btn-sm", { type: "button" }, s("profile.pw_btn"));
    pwBtn.addEventListener("click", async () => {
      pwBtn.disabled = true;
      try {
        const body = { password: newPw.value };
        if (prof.has_password) body.old_password = oldPw.value;
        const response = await api.profile.setPassword(body);
        await auth.establish(response);
        toast(s("profile.pw_saved"), "ok");
        prof.has_password = true; newPw.value = ""; oldPw.value = "";
        render();
      } catch (err) { toast(s("common.error", { msg: err.message }), "err"); }
      finally { pwBtn.disabled = false; }
    });
    const pwRow = el("div.cta-row");
    if (prof.has_password) pwRow.appendChild(field(s("profile.pw_old"), oldPw));
    pwRow.append(field(s("profile.pw_new"), newPw), pwBtn);
    pw.appendChild(pwRow);
    pw.appendChild(el("p.small", el("a", { href: "#/forgot" }, s("recovery.forgot"))));
    card.appendChild(pw);

    if (providers.google) {
      const section = el("section.pwsec", el("h2", s("google.title")), el("p.muted.small", s("google.link_hint")));
      if (prof.google_linked) section.append(el("p.ok", s("google.linked")));
      else {
        const link = el("button.btn.btn-ghost", { type: "button" }, s("google.link"));
        link.addEventListener("click", async () => {
          if (link.disabled) return;
          link.disabled = true;
          try { const result = await api.auth.googleLink(); window.location.assign(result.url); }
          catch (_) { toast(s("google.failed"), "err"); link.disabled = false; }
        });
        section.append(link);
      }
      card.append(section);
    }

    // §web-push — browser notifications without Telegram (progressive: hidden where unsupported).
    if ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window) {
      const ps = el("section.pushsec");
      ps.append(el("h2", s("profile.push_title")), el("p.muted.small", s("profile.push_hint")));
      const pbtn = el("button.btn.btn-primary.btn-sm", { type: "button" }, s("profile.push_btn"));
      pbtn.addEventListener("click", () => enableWebPush(pbtn, {
        signal:lifetime.signal, mounted:() => mounted() && card.contains(pbtn),
      }));
      ps.appendChild(el("div.cta-row", pbtn));
      card.appendChild(ps);
    }

    const danger = el("details.danger", el("summary", s("profile.delete_title")), el("p.muted.small", s("profile.delete_sub")));
    const del = el("button.btn.btn-danger.btn-sm", { type: "button" }, s("profile.delete_btn"));
    del.addEventListener("click", async () => {
      if (!(await confirm(s("profile.delete_confirm")))) return;
      try { await api.profile.remove(); toast(s("profile.deleted"), "ok"); auth.logout(); } catch (err) { toast(s("common.error", { msg: err.message }), "err"); }
    });
    danger.appendChild(del);
    card.appendChild(danger);
  }

  function field(label, control) { return el("label.field", el("span.label", label), control); }
  function input(nm, type, value, label, required) {
    const e = el("input.input", { type, name: nm, value, required: required ? "" : null, autocomplete: nm === "email" ? "email" : "off" });
    return { el: e, wrap: field(label + (required ? " *" : ""), e) };
  }
}

function urlB64ToUint8(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const b64s = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64s), arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// One explicit enable action belongs to the account, route and rendered button that started it.
// Browser permission/subscription promises cannot be cancelled, so check ownership after every await.
async function enableWebPush(btn, {signal, mounted}) {
  const epoch = store.epoch(), token = store.get('token');
  const owner = store.get('me')?.user_id ?? store.get('me')?.id;
  const route = location.hash;
  const ctl = new AbortController();
  const sameSession = () => mounted() && !signal.aborted && location.hash === route &&
    store.epoch() === epoch && store.get('token') === token &&
    owner === (store.get('me')?.user_id ?? store.get('me')?.id);
  const valid = () => !ctl.signal.aborted && sameSession();
  if (btn.disabled || !valid()) return;
  const unsubs = [];
  const detach = () => {
    unsubs.splice(0).forEach(unsubscribe => unsubscribe());
    signal.removeEventListener('abort', abort);
  };
  const abort = () => { ctl.abort(); detach(); };
  const onSession = () => { if (!sameSession()) abort(); };
  unsubs.push(store.subscribe('token', onSession), store.subscribe('me', onSession));
  signal.addEventListener('abort', abort, {once:true});
  const opts = {signal:ctl.signal, silent402:true};
  btn.disabled = true;
  try {
    const cfg = await api.push.config(opts);
    if (!valid()) return;
    if (!cfg || !cfg.enabled || !cfg.vapid_public) { toast(s("profile.push_soon")); return; }
    const perm = await Notification.requestPermission();
    if (!valid()) return;
    if (perm !== "granted") { toast(s("profile.push_denied"), "err"); return; }
    const reg = await navigator.serviceWorker.register("/sw.js");
    if (!valid()) return;
    await navigator.serviceWorker.ready;
    if (!valid()) return;
    let sub = await reg.pushManager.getSubscription();
    if (!valid()) return;
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(cfg.vapid_public) });
      if (!valid()) return; // A late local subscription must never be registered under the next account.
    }
    // raw avoids a late 401/402 invoking account-global handlers before the ownership check.
    const response = await api.push.subscribe(sub.toJSON(), {...opts, raw:true});
    if (!valid()) return;
    if (!response.ok || response.status === 202) throw new Error('push');
    toast(s("profile.push_on"), "ok");
  } catch (err) {
    if (valid()) toast(s("common.error", { msg: (err && err.message) || "push" }), "err");
  } finally {
    detach();
    if (valid()) btn.disabled = false;
  }
}
