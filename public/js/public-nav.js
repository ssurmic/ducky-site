// Static product discovery: no session reads, paid payloads or authentication requests.
export function mountPublicNav(root=document) {
 const nav=root.querySelector('.public-nav'),menu=nav?.querySelector('[data-public-menu]');
 if(!menu)return()=>{};
 const win=root.defaultView||window,trigger=menu.querySelector('summary');
 const groups=[...menu.querySelectorAll('.public-tool-group')];
 const phone=win.matchMedia?.('(max-width: 700px)'),listeners=[];
 const on=(node,event,fn)=>{node.addEventListener(event,fn);listeners.push(()=>node.removeEventListener(event,fn));};
 const paint=()=>{root.documentElement.classList.toggle('public-menu-open',menu.open);};
 const close=(restore=false)=>{menu.open=false;paint();if(restore)trigger.focus({preventScroll:true});};
 const size=()=>{close();groups.forEach(group=>{
  group.open=!phone?.matches;
  group.querySelector('summary').tabIndex=phone?.matches?0:-1;
 });};
 size();on(menu,'toggle',paint);
 on(trigger,'click',()=>win.queueMicrotask(paint));
 on(root,'pointerdown',event=>{if(menu.open&&!menu.contains(event.target))close();});
 on(root,'keydown',event=>{if(event.key==='Escape'&&menu.open){event.preventDefault();close(true);}});
 on(menu,'click',event=>{if(event.target.closest('a'))close();});
 on(root,'focusin',event=>{if(menu.open&&!menu.contains(event.target))close();});
 groups.forEach(group=>{
  on(group.querySelector('summary'),'click',event=>{
   if(!phone?.matches){event.preventDefault();return;}
   if(!group.open)groups.filter(other=>other!==group).forEach(other=>other.open=false);
  });
 });
 if(phone?.addEventListener)on(phone,'change',size);
 on(win,'hashchange',()=>close());on(win,'popstate',()=>close());
 return()=>{close();listeners.forEach(fn=>fn());};
}
if(typeof document!=='undefined')mountPublicNav();
