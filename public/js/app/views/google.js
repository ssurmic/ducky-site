import { s } from "../strings.js";
import * as api from "../api.js";
import * as auth from "../auth.js";
import * as router from "../router.js";
import { el } from "../ui.js";

export async function mount(root, { query = new URLSearchParams(), signal } = {}) {
  const card = el("section.card.login", el("h1", s("google.title")));
  const status = el("p", { role: "status" }, s("google.working"));
  card.append(status); root.append(card);
  const fail = code => {
    status.textContent = s(code === "google_cancelled" ? "google.cancelled"
      : code === "google_identity_conflict" ? "google.conflict"
      : ["google_invalid_state", "google_session_expired", "google_link_expired"].includes(code)
        ? "google.expired" : "google.failed");
    card.append(el("a.btn.btn-primary", { href: "#/login" }, s("recovery.back")));
  };
  if (query.get("error")) { fail(query.get("error")); return; }
  try {
    const response = await api.auth.googleSession();
    if (signal?.aborted) return;
    await auth.establish(response);
    router.go(query.get("linked") === "1" ? "#/profile" : "#/watchlist");
  } catch (error) { if (!signal?.aborted) fail(error.body?.error); }
}
