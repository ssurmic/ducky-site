import { s } from "../strings.js";
import * as api from "../api.js";
import * as auth from "../auth.js";
import * as router from "../router.js";
import { el, toast } from "../ui.js";
import { verificationTarget } from "../login-target.js";
import { googleLogin } from '../google-login.js';

export async function mount(root, { signal } = {}) {
  const card = el("section.card.login", el("h1", s("register.title")), el("p.muted", s("register.sub")));
  const google = googleLogin({signal});card.append(google.element);
  const form = el("form.login-block");
  const email = el("input.input", { type: "email", name: "email", autocomplete: "email", maxlength: "254", required: "" });
  const password = el("input.input", { type: "password", name: "password", autocomplete: "new-password", minlength: "8", maxlength: "1024", required: "" });
  const confirm = el("input.input", { type: "password", name: "confirm", autocomplete: "new-password", required: "" });
  const button = el("button.btn.btn-primary", { type: "submit" }, s("register.submit"));
  const status = el("p", { role: "status" });
  form.append(el("label.login-label", s("register.email"), email),
    el("label.login-label", s("recovery.new_password"), password),
    el("label.login-label", s("recovery.confirm"), confirm), button, status);
  form.append(el("p.muted.small", s("register.verify_hint")));
  card.append(form, el("a", { href: "#/login" }, s("recovery.back"))); root.append(card);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (button.disabled) return;
    if (password.value !== confirm.value) { status.textContent = s("recovery.mismatch"); return; }
    button.disabled = true; status.textContent = "";
    try {
      const response = await api.auth.register(email.value.trim(), password.value);
      password.value = ""; confirm.value = "";
      if (signal?.aborted) return;
      await auth.establish(response);
      toast(s(response.email_sent ? "register.sent" : "register.unsent"), response.email_sent ? "ok" : "err");
      router.go(verificationTarget());
    } catch (error) {
      if (signal?.aborted) return;
      status.textContent = s(error.body?.error === "email_taken" ? "register.taken"
        : ["weak_password", "password_too_weak"].includes(error.body?.error) ? "recovery.weak"
        : error.status === 429 ? "login.rate_limited" : "login.try_again");
      button.disabled = false;
    }
  });
  return google.dispose;
}
