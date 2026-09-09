import { s } from "../strings.js";
import * as api from "../api.js";
import * as auth from "../auth.js";
import * as router from "../router.js";
import { el } from "../ui.js";
import { takeTarget } from "../login-target.js";

export async function mount(root, { query = new URLSearchParams(), signal } = {}) {
  const provider=query.get("provider")==="x"?"x":"google";
  const card = el("section.card.login", el("h1", s(provider+".title")));
  const status = el("p", { role: "status" }, s(provider+".working"));
  card.append(status); root.append(card);
  const fail = code => {
    code=String(code||"").replace(/^x_/,"google_");
    const key=code === "google_cancelled" ? "cancelled"
      : code === "google_identity_conflict" ? "conflict"
      : ["google_invalid_state","google_session_expired","google_link_expired"].includes(code) ? "expired" : "failed";
    status.textContent=s(provider+"."+key);
    card.append(el("a.btn.btn-primary", { href: "#/login" }, s("recovery.back")));
  };
  if (query.get("error")) { fail(query.get("error")); return; }
  try {
    const response = await api.auth.googleSession(provider);
    if (signal?.aborted) return;
    await auth.establish(response);
    const target = takeTarget();
    router.go(query.get("linked") === "1" ? "#/profile" : target);
  } catch (error) { if (!signal?.aborted) fail(error.body?.error); }
}
