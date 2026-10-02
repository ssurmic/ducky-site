// alert-badge.js — unread count on the 「提醒」 navigation link. One cheap read (`limit=1`) per interval while a
// member is signed in and the page is visible; a 404/501 (feed not served yet) stops polling until the next sign-in.
import * as api from './api.js';
import * as store from './store.js';

let timer=null,available=true,polling=false;

export function renderAlertBadge(count){
  const link=document.querySelector('.app-nav a[data-route=alerts]');
  if(!link)return;
  let badge=link.querySelector('.nav-badge');
  const n=Number(count)||0;
  if(n<=0){badge?.remove();link.removeAttribute('data-unread');return;}
  if(!badge){badge=document.createElement('span');badge.className='nav-badge';badge.setAttribute('aria-hidden','true');link.append(badge);}
  badge.textContent=n>99?'99+':String(n);
  link.dataset.unread=String(n);
}

export function markAlertsSeen(){renderAlertBadge(0);}

export async function pollAlertBadge(){
  if(polling||!available||!store.get('me')||document.visibilityState==='hidden')return null;
  polling=true;
  try{
    const doc=await api.alertFeed.list({limit:1},{silent402:true,observe:false,skipUnauthorized:true});
    const unread=Number(doc?.unread_count);
    renderAlertBadge(Number.isFinite(unread)?unread:0);
    return doc;
  }catch(error){
    if([404,501].includes(error?.status))available=false;
    if([401,402,403].includes(error?.status))renderAlertBadge(0);
    return null;
  }finally{polling=false;}
}

function onVisible(){if(document.visibilityState!=='hidden')pollAlertBadge();}

export function startAlertBadge({interval=90000}={}){
  stopAlertBadge();
  // Only shells that show the 「提醒」 destination poll; a bare document (tests, previews) never does.
  if(!document.querySelector('.app-nav a[data-route=alerts]'))return;
  available=true;
  pollAlertBadge();
  timer=setInterval(pollAlertBadge,interval);
  timer.unref?.();   // never keep a process alive for the badge
  document.addEventListener('visibilitychange',onVisible);
}

export function stopAlertBadge(){
  if(timer){clearInterval(timer);timer=null;}
  document.removeEventListener('visibilitychange',onVisible);
  renderAlertBadge(0);
}
