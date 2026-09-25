// Stay in the authenticated app when using its brand/home link.
export function renderBrandNavigation(me) {
  const brand=document.querySelector('.app-top .brand');
  if(!brand)return;
  brand.setAttribute('href',me?'#/watchlist':brand.dataset.homeHref);
  brand.title=me?brand.dataset.watchlistLabel:brand.dataset.homeLabel;
  brand.setAttribute('aria-label',brand.title);
}

// Shared selection logic for direct links and in-page radar filters.
export function selectNavigation(name, query=new URLSearchParams()) {
  if(document.querySelector('.focus-nav')){
    // Five destinations. Stock-scoped tools light the tab they belong to; account and
    // sign-in pages light nothing rather than pretending to be Explore.
    const account=['profile','billing','login','register','forgot','reset','oauth','recovery'];
    name=name==='stock'&&['today','explore'].includes(query.get('from'))?query.get('from'):
      ['today','watchlist','explore','calendar','creators'].includes(name)?name:
      ['stock','evidence','chart','research','alerts','updates','briefing'].includes(name)?'watchlist':
      account.includes(name)?'':'explore';
  }
  if(name==='updates')name='alerts';
  if(name==='boards' && query.get('board')==='social')name='vibe';
  const board=query.get('board')||'all';
  document.querySelectorAll('.app-nav a[data-route]').forEach(a=>{
    const on=a.dataset.route===name && (!a.dataset.board || a.dataset.board===board);
    a.classList.toggle('on',on);
    if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  });
}
