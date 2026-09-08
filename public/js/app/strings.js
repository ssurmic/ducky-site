// strings.js — bilingual copy for /app/. build.py renders templates/app.html once per language and
// the template embeds the app.* keys from i18n/<lang>.json as a non-executed JSON data block
// (<script type="application/json" id="ducky-strings">), which CSP does not treat as a script.
const el = document.getElementById("ducky-strings");
let table = {};
try { table = el ? JSON.parse(el.textContent) : {}; } catch (e) { table = {}; }

export const LANG = document.documentElement.getAttribute("data-lang") || "zh";
export const CFG = window.DUCKY || { API_BASE: "", BOT: "", MINIAPP: "app", PRICES: null };

const missing = new Set();
/** The build audits literal and catalogue keys; unexpected server states still stay readable. */
export function s(key, vars) {
  const found=Object.prototype.hasOwnProperty.call(table,key);
  if(!found&&!missing.has(key)){missing.add(key);console.warn('Missing translation:',key);}
  let str = found ? table[key] : LANG==='en'?'Information unavailable':'资料暂不可用';
  if (vars) {
    for (const k of Object.keys(vars)) str = str.split("{" + k + "}").join(String(vars[k]));
  }
  return str;
}
export function has(key) { return Object.prototype.hasOwnProperty.call(table, key); }
