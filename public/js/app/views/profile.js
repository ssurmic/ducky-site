// views/profile.js — §14 member profile: email (required before billing), display name, language, country,
// marketing opt-in; 6-digit email verification; /deleteme. Server validates; this view only draws.
import { s } from "../strings.js";
import * as api from "../api.js";
import * as auth from "../auth.js";
import * as store from "../store.js";
import * as router from "../router.js";
import { el, clear, toast, spinner, errorBox, confirm } from "../ui.js";

export async function mount(root) {
  const card = el("section.card.profile");
  root.appendChild(card);
  card.appendChild(spinner());
  let prof = null;
  try { prof = await api.profile.get(); } catch (e) { clear(card); card.appendChild(errorBox(e, () => mount(root))); return; }
  render();

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
      const body = { email: email.el.value.trim(), display_name: name.el.value.trim(), lang: lang.value, country: country.el.value.trim(), marketing_opt_in: !!form.querySelector("[name=marketing_opt_in]").checked };
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) { toast(s("profile.email_invalid"), "err"); email.el.focus(); return; }
      try {
        prof = await api.profile.save(body);
        toast(s("profile.saved"), "ok");
        await auth.refreshMe();
        render();
      } catch (err) { toast(s("common.error", { msg: err.message }), "err"); }
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
        try {
          const res = await api.profile.verify(code.value.trim());
          // the verify route returns the full profile view; re-fetch if an older backend only sent the flags
          prof = (res && res.email !== undefined) ? res : await api.profile.get();
          toast(s("profile.verified"), "ok"); await auth.refreshMe(); render();
        } catch (err) { toast(s("common.error", { msg: err.message }), "err"); }
      });
      resend.addEventListener("click", async () => {
        try { await api.profile.resend(); toast(s("profile.resent"), "ok"); } catch (err) { toast(s("common.error", { msg: err.message }), "err"); }
      });
      v.append(el("div.cta-row", code, btn, resend));
    } else if (prof.email && prof.email_verified) {
      v.append(el("p.ok", "✅ " + s("profile.verified_badge", { email: prof.email })));
    }
    card.appendChild(v);

    const next = new URLSearchParams(location.hash.split("?")[1] || "").get("next");
    if (next) card.appendChild(el("p", el("a.btn.btn-ghost.btn-sm", { href: "#/" + next }, s("profile.continue"))));

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
        await api.profile.setPassword(body);
        toast(s("profile.pw_saved"), "ok");
        prof.has_password = true; newPw.value = ""; oldPw.value = "";
        render();
      } catch (err) { toast(s("common.error", { msg: err.message }), "err"); }
      finally { pwBtn.disabled = false; }
    });
    const pwRow = el("div.cta-row");
    if (prof.has_password) pwRow.appendChild(oldPw);
    pwRow.append(newPw, pwBtn);
    pw.appendChild(pwRow);
    card.appendChild(pw);

    // §web-push — browser notifications without Telegram (progressive: hidden where unsupported).
    if ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window) {
      const ps = el("section.pushsec");
      ps.append(el("h2", s("profile.push_title")), el("p.muted.small", s("profile.push_hint")));
      const pbtn = el("button.btn.btn-primary.btn-sm", { type: "button" }, s("profile.push_btn"));
      pbtn.addEventListener("click", () => enableWebPush(pbtn));
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

// Enable Web Push: fetch the VAPID public key, ask permission, register the SW, subscribe, POST it. Fires a
// test push on success. No-ops gracefully where push isn't configured on the backend yet (button stays usable).
async function enableWebPush(btn) {
  btn.disabled = true;
  try {
    const cfg = await api.push.config();
    if (!cfg || !cfg.enabled || !cfg.vapid_public) { toast(s("profile.push_soon")); return; }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { toast(s("profile.push_denied"), "err"); return; }
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(cfg.vapid_public) });
    await api.push.subscribe(sub.toJSON());
    toast(s("profile.push_on"), "ok");
    try { await api.push.test(); } catch (e) { /* best-effort test ping */ }
  } catch (err) {
    toast(s("common.error", { msg: (err && err.message) || "push" }), "err");
  } finally { btn.disabled = false; }
}
