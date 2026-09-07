import {s} from './strings.js';
import * as api from './api.js';
import * as store from './store.js';
import {el, clear} from './ui.js';

const CHANNELS = ['email', 'telegram'];
const STATES = {email:new Set(['ready','disabled','unverified','binding_changed']),
  telegram:new Set(['ready','disabled','unlinked','unreachable'])};
const TERMINAL = new Set(['accepted','failed','cancelled','unknown']);

function settings(value) {
  if (!value || CHANNELS.some(c => typeof value[c+'_enabled'] !== 'boolean' ||
      typeof value[c+'_available'] !== 'boolean' || !STATES[c].has(value[c+'_status']))) {
    throw new Error('unconfirmed_settings');
  }
  return value;
}

export function mountNotificationSettings(root, {signal} = {}) {
  const ctl = new AbortController(), epoch = store.epoch(), token = store.get('token');
  const owner = store.get('me')?.user_id ?? store.get('me')?.id;
  const route = location.hash;
  const card = el('section.notification-settings');
  root.append(card);
  let timer, disposed = false, current = null, messageId = null, receipt = null, busy = false, polling = false, checking = false, requestedChannels = [];
  let submission = null;
  const unresolved = () => !!submission || !!messageId && (!receipt || !receipt.completed || receipt.channels.some(row => row.status === 'unknown'));
  const session = () => store.epoch() === epoch && store.get('token') === token &&
    (store.get('me')?.user_id ?? store.get('me')?.id) === owner;
  const valid = () => !disposed && !ctl.signal.aborted && session() && root.isConnected &&
    root.contains(card) && location.hash === route;
  const opts = {signal:ctl.signal, silent402:true};
  const unsubs = [];
  function cleanup() {
    if (disposed) return;
    disposed = true; clearTimeout(timer); ctl.abort();
    signal?.removeEventListener('abort', cleanup);
    unsubs.splice(0).forEach(fn => fn());
  }
  signal?.addEventListener('abort', cleanup, {once:true});
  unsubs.push(store.subscribe('token', () => { if (!session()) cleanup(); }),
    store.subscribe('me', () => { if (!session()) cleanup(); }));
  if (signal?.aborted) { cleanup(); return cleanup; }

  function errorText(error) {
    if (error?.status === 429) return s('notify.rate_limited');
    if (['email_unverified','no_email','binding_changed'].includes(error?.body?.error)) return s('notify.verify_first');
    return s('notify.unavailable');
  }

  async function load() {
    if (!valid() || busy) return;
    busy = true; render();
    try {
      const result = settings(await api.notifications.get(opts));
      if (!valid()) return;
      current = result; busy = false; render();
    } catch (error) {
      if (!valid()) return;
      busy = false; render(errorText(error));
    }
  }

  function render(error = '', saved = false) {
    if (!valid()) return;
    clear(card);
    card.append(el('h2', s('notify.title')), el('p.muted.small', s('notify.description')));
    if (!current) {
      card.append(el('p', {role:'status'}, busy ? s('common.loading') : error || s('notify.unavailable')));
      if (!busy) card.append(el('button.btn.btn-ghost.btn-sm', {type:'button', onclick:load}, s('common.retry')));
      return;
    }
    const form = el('form.form'), controls = {};
    for (const channel of CHANNELS) {
      const enabled = current[channel+'_enabled'], available = current[channel+'_available'];
      const checkbox = el('input', {type:'checkbox', name:channel+'_enabled', checked:enabled,
        disabled:busy || (!available && !enabled)});
      controls[channel] = checkbox;
      const state = current[channel+'_status'];
      form.append(el('div.notification-channel', el('label.check', checkbox, ' '+s('notify.'+channel)),
        el('p.muted.small', s('notify.state.'+(!available && ['ready','disabled'].includes(state) ? 'unavailable' : state)))));
    }
    const save = el('button.btn.btn-primary.btn-sm', {type:'submit', disabled:busy}, s('notify.save'));
    form.append(save);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!valid() || busy) return;
      const body = Object.fromEntries(CHANNELS.map(c => [c+'_enabled', controls[c].checked]));
      busy = true; render();
      try {
        await api.notifications.save(body, opts);
        if (!valid()) return;
        const result = settings(await api.notifications.get(opts));
        if (!valid()) return;
        current = result; busy = false;
        render(CHANNELS.some(c => result[c+'_enabled'] !== body[c+'_enabled']) ? s('notify.unavailable') : '',
          CHANNELS.every(c => result[c+'_enabled'] === body[c+'_enabled']));
      } catch (error) { if (valid()) { busy = false; render(errorText(error)); } }
    });
    card.append(form);
    if (error || saved) card.append(el('p', {role:'status', class:error?'err':'ok'}, error || s('notify.saved')));
    const enabled = CHANNELS.filter(c => current[c+'_enabled'] && current[c+'_available']);
    const uncertain = unresolved();
    const tests = el('div.cta-row');
    for (const channel of enabled) tests.append(el('button.btn.btn-ghost.btn-sm', {
      type:'button', disabled:busy || polling || uncertain, onclick:() => sendTest([channel])
    }, s('notify.test_channel',{channel:s('notify.'+channel)})));
    if (enabled.length === 2) tests.append(el('button.btn.btn-ghost.btn-sm', {
      type:'button', disabled:busy || polling || uncertain, onclick:() => sendTest(enabled)
    }, s('notify.test_both')));
    card.append(tests, el('p.muted.small', s('notify.test_hint')));
    if (submission && !busy) card.append(el('p', {role:'status'}, s('notify.submit_unconfirmed')),
      el('button.btn.btn-ghost.btn-sm', {type:'button', onclick:() => submitTest(submission)}, s('notify.retry_test')));
    if (messageId) {
      card.append(el('div.notification-receipt', {role:'status', 'aria-live':'polite'},
        el('p', s(polling ? 'notify.checking' : 'notify.test_recorded')),
        (receipt?.channels || []).map(row => el('p.small', s('notify.'+row.channel)+': '+s('notify.delivery.'+row.status))),
        el('p.muted.small', s('notify.acceptance_note'))));
      if (!polling) card.append(el('button.btn.btn-ghost.btn-sm', {type:'button', disabled:busy,
        onclick:() => checkDelivery(0)}, s('notify.refresh_delivery')));
    }
  }

  async function sendTest(channels) {
    if (!valid() || busy || polling || unresolved()) return;
    try { submission = {key:crypto.randomUUID(), channels:[...channels]}; }
    catch (_) { render(s('notify.unavailable')); return; }
    await submitTest(submission);
  }

  async function submitTest(request) {
    if (!valid() || busy || polling || request !== submission) return;
    busy = true; messageId = null; receipt = null; requestedChannels = [...request.channels]; clearTimeout(timer); render();
    try {
      const response = await api.notifications.test(request.channels, {...opts, idempotencyKey:request.key});
      if (!valid()) return;
      const result = api.isAccepted(response) ? response.body : null;
      if (!result || result.status !== 'queued' || !Number.isSafeInteger(result.message_id) || result.message_id <= 0) {
        throw new Error('unconfirmed_test');
      }
      messageId = String(result.message_id); submission = null; busy = false;
      await checkDelivery(0);
    } catch (error) { if (valid()) {
      if (error?.status >= 400 && error.status < 500 && error.status !== 408) submission = null;
      busy = false; polling = false; render(errorText(error));
    } }
  }

  async function checkDelivery(attempt) {
    if (!valid() || !messageId || busy || checking) return;
    clearTimeout(timer); polling = true; checking = true; render();
    try {
      const result = await api.notifications.delivery(messageId, opts);
      if (!valid()) return;
      const allowed = new Set(['pending','claimed','retry','accepted','failed','cancelled','unknown']);
      if (String(result?.message_id) !== messageId || typeof result?.completed !== 'boolean' ||
          !Array.isArray(result.channels) || !result.channels.length ||
          result.channels.some(row => !CHANNELS.includes(row.channel) || !allowed.has(row.status)) ||
          new Set(result.channels.map(row=>row.channel)).size !== result.channels.length ||
          result.channels.map(row=>row.channel).sort().join(',') !== [...requestedChannels].sort().join(',') ||
          result.completed !== result.channels.every(row=>TERMINAL.has(row.status))) throw new Error('unconfirmed_delivery');
      receipt = result;
      polling = !result.completed && attempt < 12;
      render();
      if (polling) timer = setTimeout(() => checkDelivery(attempt+1), 2000);
    } catch (error) { if (valid()) { polling = false; render(errorText(error)); } }
    finally { checking = false; }
  }
  load();
  return cleanup;
}
