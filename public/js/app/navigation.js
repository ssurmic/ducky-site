// Shared selection logic for direct links and in-page radar filters.
export function selectNavigation(name, query=new URLSearchParams()) {
  if(document.querySelector('.focus-nav')){
    name=name==='stock'&&['today','explore'].includes(query.get('from'))?query.get('from'):
      ['today','watchlist','explore'].includes(name)?name:
      ['stock','evidence','chart','research','alerts','updates'].includes(name)?'watchlist':'explore';
  }
  if(name==='updates')name='alerts';
  if(name==='degen')name='vibe';
  if(name==='boards' && query.get('board')==='social')name='vibe';
  const board=query.get('board')||'all';
  document.querySelectorAll('.app-nav a[data-route]').forEach(a=>{
    const on=a.dataset.route===name && (!a.dataset.board || a.dataset.board===board);
    a.classList.toggle('on',on);
    if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  });
  document.querySelectorAll('.nav-tree').forEach(group=>{
    const active=Boolean(group.querySelector('a.on'));
    group.classList.toggle('on',active);
    group.open=active;
  });
  const more=document.querySelector('.nav-more');
  if(more){if(more.open&&more.querySelector('.nav-more-panel')?.contains(document.activeElement))more.querySelector('summary')?.focus({preventScroll:true});more.open=false;more.classList.toggle('on',![...document.querySelectorAll('.app-nav > [data-mobile-primary]')].some(link=>link.dataset.route===name));}
}
