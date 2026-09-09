// A head pat starts/stops the duck. The animation uses the existing brand asset.
export function mountDuckCommunity(root) {
  const button=root.querySelector('[data-duck-pet]'), bubble=root.querySelector('[data-duck-bubble]');
  if(!button || !bubble)return ()=>{};
  let greetingTimer;
  function pet(){
    clearTimeout(greetingTimer);
    const active=button.getAttribute('aria-pressed')!=='true';
    button.setAttribute('aria-pressed',String(active));
    button.setAttribute('aria-label',active?button.dataset.stopLabel:button.dataset.petLabel);
    button.classList.toggle('is-wobbling',active);
    bubble.hidden=false;
    if(active){
      bubble.textContent=bubble.dataset.quack;
      greetingTimer=setTimeout(()=>{bubble.textContent=bubble.dataset.wish;},700);
    }
  }
  button.addEventListener('click',pet);
  return ()=>{clearTimeout(greetingTimer);button.removeEventListener('click',pet);};
}
if(typeof document!=='undefined')document.querySelectorAll('[data-duck-community]').forEach(mountDuckCommunity);
