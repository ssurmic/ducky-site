import { s, LANG } from "../strings.js";
import * as api from "../api.js";
import * as auth from "../auth.js";
import * as store from "../store.js";
import { el, clear } from "../ui.js";

export async function mount(root, { query = new URLSearchParams() } = {}) {
  const resetting = location.hash.startsWith("#/reset");
  let token = query.get("token") || "";
  // The emailed credential is in the fragment, never a server request/referrer.
  // Remove it from this history entry as soon as it has been read.
  if (resetting && token) history.replaceState(null, "", "#/reset");
  const languageLinks = resetting ? [...document.querySelectorAll("[data-lang-toggle], [data-lang-toggle-footer]")] : [];
  const switchLanguage = event => {
    event.preventDefault();
    const base = event.currentTarget.getAttribute("href").split("#")[0];
    location.assign(base + (token ? "#/reset?token=" + encodeURIComponent(token) : "#/forgot"));
  };
  for (const link of languageLinks) {
    link.setAttribute("href", link.getAttribute("href").split("#")[0] + "#/reset");
    link.addEventListener("click", switchLanguage);
  }
  const card = el("section.card.login.recovery");
  const title = el("h1", s(resetting ? "recovery.reset_title" : "recovery.title"));
  const status = el("p.recovery-status", { role: "status", "aria-live": "polite" });
  const back = el("a", { href: "#/login" }, s("recovery.back"));
  card.append(title, el("p.muted", s(resetting ? "recovery.reset_hint" : "recovery.hint")));
  root.appendChild(card);
  if (["localhost", "127.0.0.1"].includes(location.hostname) && api.base() === "https://api.duckybot.app") {
    card.append(el("p.errbox", s("recovery.preview")), el("a.btn.btn-primary", {
      href: "https://duckybot.app/" + (LANG === "en" ? "en/" : "") + "app/#/forgot"
    }, s("recovery.live")));
    return;
  }
  const form = el("form.login-block");
  const control = el("input.input", resetting
    ? { type: "password", name: "password", autocomplete: "new-password", minlength: "8", maxlength: "1024", required: "" }
    : { type: "email", name: "email", autocomplete: "email", required: "" });
  const confirm = resetting ? el("input.input", { type: "password", name: "confirm", autocomplete: "new-password", required: "" }) : null;
  const button = el("button.btn.btn-primary", { type: "submit" }, s(resetting ? "recovery.save" : "recovery.send"));
  form.append(el("label.login-label", s(resetting ? "recovery.new_password" : "recovery.email"), control));
  if (confirm) form.append(el("label.login-label", s("recovery.confirm"), confirm));
  form.append(button); card.append(form, status);
  if (!resetting) card.append(el("details.recovery-help", el("summary", s("recovery.no_email")),
    el("p.muted.small", s("recovery.help"))));
  card.append(back);
  if (resetting && !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    form.hidden = true; status.textContent = s("recovery.invalid");
    card.append(el("a", { href: "#/forgot" }, s("recovery.request_again")));
  }
  let stopped = false;
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (button.disabled) return;
    status.textContent = "";
    if (confirm && confirm.value !== control.value) { status.textContent = s("recovery.mismatch"); return; }
    button.disabled = true;
    try {
      if (resetting) await api.auth.confirmReset(token, control.value);
      else await api.auth.requestReset(control.value.trim());
      if (stopped) return;
      control.value = ""; if (confirm) confirm.value = "";
      form.hidden = true;
      status.textContent = s(resetting ? "recovery.done" : "recovery.sent");
      if (resetting) {
        token = ""; store.bumpEpoch(); auth.clearToken(); store.set("token", null); store.set("me", null);
        store.set("watchlist", []); store.set("alerts", []); store.set("snapshots", {});
      } else card.append(el("p.small.muted", s("recovery.delivery_help")));
    } catch (err) {
      if (stopped) return;
      const key = err.body?.error;
      status.textContent = s(key === "reset_invalid" ? "recovery.invalid"
        : key === "password_too_weak" ? "recovery.weak"
        : err.status === 429 ? "login.rate_limited"
        : key === "recovery_unavailable" ? "recovery.unavailable" : "login.try_again");
      if (key === "reset_invalid") card.append(el("a", { href: "#/forgot" }, s("recovery.request_again")));
      button.disabled = false;
    }
  });
  return () => { stopped = true; token = ""; languageLinks.forEach(link => link.removeEventListener("click", switchLanguage)); clear(form); };
}
