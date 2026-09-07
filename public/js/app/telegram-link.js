import * as api from './api.js';
import * as store from './store.js';

const KEY = 'ducky.telegram-link';
const FIELDS = ['id','first_name','last_name','username','photo_url','auth_date','hash'];
const MAX_AGE = 10 * 60 * 1000;
let result = null;
const owner = () => store.get('me')?.user_id ?? store.get('me')?.id;
async function fingerprint(token) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export function clearTelegramLink(nonce) {
  try {
    const intent = JSON.parse(window.sessionStorage.getItem(KEY));
    if (!nonce || intent?.nonce === nonce) window.sessionStorage.removeItem(KEY);
  } catch (_) {}
}
export async function createTelegramLink() {
  const token = store.get('token'), uid = owner(), epoch = store.epoch();
  if (!token || uid == null) throw new Error('session_changed');
  const tokenHash = await fingerprint(token);
  if (store.get('token') !== token || owner() !== uid || store.epoch() !== epoch) throw new Error('session_changed');
  const intent = {nonce:crypto.randomUUID(), uid, tokenHash, at:Date.now()};
  window.sessionStorage.setItem(KEY, JSON.stringify(intent));
  const url = new URL(location.pathname, location.origin);
  url.searchParams.set('tglink','1'); url.searchParams.set('state',intent.nonce); url.hash='/profile';
  return {nonce:intent.nonce, url:url.href};
}

// A linking return is never allowed to fall through to a new Telegram login.
// Remove its signed fields before fetching anything; a failed handoff must be restarted explicitly.
export function readTelegramLinkReturn() {
  const params = new URLSearchParams(location.search);
  if (!params.has('tglink')) return null;
  let intent = null;
  try { intent = JSON.parse(window.sessionStorage.getItem(KEY)); } catch (_) {}
  clearTelegramLink();
  const user = Object.fromEntries(FIELDS.filter(key=>params.get(key)).map(key=>[key,params.get(key)]));
  const state = params.get('state');
  history.replaceState(null, '', location.pathname+'#/profile');
  return {intent, state, user};
}
export function failTelegramLink() { result = 'session'; }
export function takeTelegramLinkResult() { const value=result; result=null; return value; }

export async function finishTelegramLink(callback) {
  const token = store.get('token'), uid = owner(), epoch = store.epoch();
  const valid = () => store.get('token') === token && owner() === uid && store.epoch() === epoch;
  const {intent,state,user} = callback;
  const age = Date.now() - Number(intent?.at);
  if (!token || uid == null || !intent || intent.nonce !== state || intent.uid !== uid ||
      !Number.isFinite(age) || age < 0 || age > MAX_AGE || !user.id || !user.auth_date || !user.hash ||
      intent.tokenHash !== await fingerprint(token) || !valid()) {result='session';return false;}
  try {
    const response = await api.auth.linkTelegram(user, {silent402:true});
    if (!valid()) return false;
    if (response?.ok !== true || response.linked !== 'telegram' || !Array.isArray(response.identities)) throw new Error('unconfirmed_link');
    const me = await api.me({silent402:true});
    if (!valid()) return false;
    if ((me?.user_id ?? me?.id) !== uid) throw new Error('unconfirmed_account');
    store.set('me', me); result='linked'; return true;
  } catch (error) {
    if (valid()) result=error?.status===409 && error?.body?.error==='telegram_linked_elsewhere' ? 'elsewhere' : 'failed';
    return false;
  }
}
