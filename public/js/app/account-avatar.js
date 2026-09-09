import {s} from './strings.js';
export function renderAccountAvatar(me) {
  const link=document.getElementById('account-avatar');
  if(!link)return;
  link.replaceChildren();link.hidden=!me;
  if(!me)return;
  const name=me.account_name||me.first_name||me.username||'';
  link.title=name||s('account.profile');
  link.setAttribute('aria-label',name?`${s('account.profile')} · ${name}`:s('account.profile'));
  const fallback=document.createElement('span');
  fallback.textContent=[...name.trim()][0]?.toUpperCase()||'D';
  fallback.setAttribute('aria-hidden','true');link.append(fallback);
  try {
    const url=new URL(me.avatar_url);
    const allowed=url.hostname.endsWith('.googleusercontent.com')||url.hostname==='pbs.twimg.com';
    if(url.protocol!=='https:'||!allowed||url.username||url.password)return;
    const img=document.createElement('img');img.alt='';img.width=32;img.height=32;
    img.referrerPolicy='no-referrer';img.decoding='async';
    img.addEventListener('error',()=>img.remove(),{once:true});
    img.addEventListener('load',()=>{fallback.hidden=true;},{once:true});
    img.src=url.href;link.append(img);
  } catch {}
}
