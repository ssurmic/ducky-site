// store.js — tiny observable state. {me, watchlist, alerts, snapshots, token, route}
const state = {
  me: null,            // GET /me payload
  token: null,         // bearer
  watchlist: [],       // [ticker]
  alerts: [],          // [{id, ticker, condition, state}]
  snapshots: {},       // ticker -> snapshot JSON | {pending: true}
  route: null,         // {name, params}
};
const listeners = new Map(); // key -> Set<fn>

export function get(key) { return key ? state[key] : state; }

export function set(key, value) {
  if (state[key] === value && typeof value !== "object") return;
  state[key] = value;
  emit(key);
}

export function patch(key, partial) {
  state[key] = Object.assign({}, state[key] || {}, partial);
  emit(key);
}

export function subscribe(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(fn);
  return () => listeners.get(key).delete(fn);
}

function emit(key) {
  const fns = listeners.get(key);
  if (fns) for (const fn of Array.from(fns)) { try { fn(state[key]); } catch (e) { console.error(e); } }
  const any = listeners.get("*");
  if (any) for (const fn of Array.from(any)) { try { fn(key, state[key]); } catch (e) { console.error(e); } }
}

export function tier() { return (state.me && state.me.tier) || "free"; }
export function isPro() { return tier() === "pro"; }
export function isPaid() { const t = tier(); return t === "pro" || t === "paid"; }
