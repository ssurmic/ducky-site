// Local browser layout sweep. Synthetic data never reaches the live API.
const routes=['watchlist','evidence/NVDA','briefing','chart/NVDA','calendar','boards','alerts','creators','profile','billing','opportunities','vibe','market','macro','screens','updates','research/NVDA','login','register','forgot'];
const jobs=['zh','en'].flatMap(lang=>routes.map(route=>({lang,route}))),results=[];
const output=document.createElement('pre');output.id='qa-results';document.body.prepend(output);
let job=null,started=0,timer;
function advance(){
 job=jobs.shift();if(!job){clearInterval(timer);output.textContent=JSON.stringify({done:true,results});return;}
 started=Date.now();document.querySelector('h3').textContent='LOCAL QA matrix · '+job.lang+' / '+job.route;
 document.querySelectorAll('iframe').forEach(f=>f.src='/qa-frame?lang='+job.lang+'&route='+job.route);
}
timer=setInterval(()=>{
 if(!job)return;
 const frames=[...document.querySelectorAll('iframe')].map(f=>{try{return JSON.parse(f.contentDocument.querySelector('#qa-status').textContent);}catch{return null;}});
 if(Date.now()-started<1000||!frames.every(f=>f&&f.route===job.route)){
  if(Date.now()-started>15000){results.push({...job,error:'route timed out'});advance();}return;
 }
 results.push({...job,frames:frames.map(f=>({width:f.width,height:f.height,theme:f.theme,header:f.header.h,main:f.main.h,firstY:f.firstContent?.y??null,overflow:f.overflow,errors:f.errors,nav:f.nav.map(n=>n.label),navMinHeight:Math.min(...f.nav.map(n=>n.h)),canvases:f.canvases.length}))});
 output.textContent=JSON.stringify({done:false,results});advance();
},250);advance();
