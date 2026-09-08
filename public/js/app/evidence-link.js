import {el} from './ui.js';
import {s} from './strings.js';
import {evidenceHref} from './evidence-route.js';
export {evidenceHref} from './evidence-route.js';
export function evidenceLink(ticker,source=''){
  const href=evidenceHref(ticker,source);
  return href?el('a.btn.btn-ghost.btn-sm',{href},s('evidence.title')):null;
}
