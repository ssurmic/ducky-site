import { el } from '../ui.js';
import { s } from '../strings.js';

// The current provider has no stance evidence. Never turn an old attention
// score, missing count, or an unsupported future payload into directional data.
export function directionReading({ historical=false }={}) {
  return el('div.vibe-direction', {'data-sentiment-status':'unavailable'},
    el('strong.vibe-verdict',s('social.direction_unknown')),
    el('dl.vibe-balance',...['bulls','bears'].map(side=>el('div',
      el('dt',s('social.'+side)),el('dd','—')))),
    el('p.small.muted',s(historical?'social.direction_historical':'social.direction_missing')));
}

export function generalVibe() {
  return el('section.vibe-general',
    el('h2',s('social.general')),
    el('div.vibe-general-grid',...['market','semiconductors'].map(scope=>
      el('article.vibe-scope',{'data-vibe-scope':scope},el('h3',s('social.scope_'+scope)),
        el('p.vibe-scope-state',s('social.direction_unknown'))))),
    el('p.small.muted',s('social.general_missing')),
    el('details.vibe-contrarian',el('summary',s('social.contrarian')),
      el('p',s('social.contrarian_bears')),el('p',s('social.contrarian_bulls')),
      el('p.small.muted',s('social.contrarian_limit'))));
}
