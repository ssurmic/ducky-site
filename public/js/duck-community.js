// A head pat starts/stops the duck. The animation uses the existing brand asset.
export function mountDuckCommunity(root) {
  const button=root.querySelector('[data-duck-pet]'), bubble=root.querySelector('[data-duck-bubble]');
  if(!button || !bubble)return ()=>{};
  let greetingTimer,alive=true;
  const copyButton=root.querySelector('[data-copy-address]'),copyStatus=root.querySelector('[data-copy-status]');
  async function copyAddress(){
    if(!copyStatus)return;
    const address=root.querySelector('[data-support-address]')?.textContent.trim();
    copyButton.disabled=true;
    try{
      if(!/^0x[0-9a-fA-F]{40}$/.test(address))throw Error('Invalid address');
      await root.ownerDocument.defaultView.navigator.clipboard.writeText(address);
      if(alive)copyStatus.textContent=copyStatus.dataset.success;
    }catch{
      if(alive)copyStatus.textContent=copyStatus.dataset.failure;
    }finally{if(alive)copyButton.disabled=false;}
  }
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
  copyButton?.addEventListener('click',copyAddress);
  return ()=>{alive=false;clearTimeout(greetingTimer);button.removeEventListener('click',pet);copyButton?.removeEventListener('click',copyAddress);};
}
if(typeof document!=='undefined')document.querySelectorAll('[data-duck-community]').forEach(mountDuckCommunity);
