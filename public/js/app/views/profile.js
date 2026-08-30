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
