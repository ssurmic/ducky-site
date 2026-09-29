// Synthetic session fixture only; build.py never copies tests into production.
(function () {
 const query=new URLSearchParams(location.search),selected=query.get('qa_case');
 if(selected){
  sessionStorage.setItem('ducky.qa.entry',selected);
  localStorage.removeItem('ducky.token');localStorage.removeItem('ducky.logged-out');
  document.cookie='ducky_entry=; Path=/; Max-Age=0';
  if(['valid','expired','outage','revoked','logged-out'].includes(selected))localStorage.setItem('ducky.token','synthetic-session-only');
  if(selected==='cookie-only')document.cookie='ducky_entry=1; Path=/';
  if(selected==='logged-out')localStorage.setItem('ducky.logged-out','1');
  sessionStorage.setItem('ducky.qa.theme',query.get('qa_theme')||'light');
 }
 const mode=sessionStorage.getItem('ducky.qa.entry')||'signed-out';
 document.documentElement.dataset.theme=sessionStorage.getItem('ducky.qa.theme')||'light';
 window.fetch=async function(input){
  const url=new URL(typeof input==='string'?input:input.url,location.origin);
  if(url.origin!==location.origin)throw new Error('External traffic forbidden in fixture');
  const path=url.pathname.replace(/^\/qa-api/,'');
  if(path==='/auth/refresh'||path==='/me'){
   if(mode==='outage')return Response.json({error:'unavailable'},{status:503});
   if(['signed-out','revoked','logged-out'].includes(mode))return Response.json({error:'unauthorized'},{status:401});
   return Response.json(path==='/auth/refresh'?{token:'synthetic-renewed-only'}:{user_id:8888,tier:'pro',watch_cap:50,profile_complete:true,email_verified:true,access:{billing_enabled:false}});
  }
  return Response.json({items:[],posts:[]});
 };
 document.addEventListener('DOMContentLoaded',()=>{
  const marker=document.createElement('p');marker.textContent='LOCAL SESSION TEST · '+mode+' · No production connection';
  marker.id='qa-session-state';(document.querySelector('.app-foot')||document.body).append(marker);
 });
})();
