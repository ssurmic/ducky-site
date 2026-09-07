// Shared selection logic for direct links and in-page radar filters.
export function selectNavigation(name, query=new URLSearchParams()) {
  if(name==='updates')name='alerts';
  if(name==='boards' && query.get('board')==='social')name='vibe';
  const board=query.get('board')||'all';
  document.querySelectorAll('.app-nav a[data-route]').forEach(a=>{
    const on=a.dataset.route===name && (!a.dataset.board || a.dataset.board===board);
    a.classList.toggle('on',on);
    if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  });
  const radarActive=name==='boards'||['market','macro','screens'].includes(name);
  document.querySelectorAll('.nav-radar').forEach(group=>{
    group.classList.toggle('on',radarActive);
    if(radarActive)group.open=true;
  });
  const more=document.querySelector('.nav-more');
  if(more){more.open=false;more.classList.toggle('on',!['watchlist','calendar','alerts','boards'].includes(name));}
}
