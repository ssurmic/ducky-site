// All public page templates, using real built content in local phone frames.
const pages=['/','/privacy/','/disclaimer/','/research-records/','/idea/','/trending/','/track-record/','/ideas/','/404.html'];
const jobs=['','/en'].flatMap(prefix=>pages.map(p=>prefix+p)),results=[],out=document.createElement('output');out.id='public-qa-results';document.body.prepend(out);
let page,started,timer;
function next(){page=jobs.shift();if(!page){clearInterval(timer);out.textContent=JSON.stringify({done:true,results});return;}started=Date.now();document.querySelectorAll('iframe').forEach(f=>{const theme=f.title.split(' ')[1];f.src='/public-frame?page='+encodeURIComponent(page)+'&theme='+theme;});}
timer=setInterval(()=>{if(!page||Date.now()-started<1500)return;const frames=[...document.querySelectorAll('iframe')].map(f=>{try{return {title:f.title,...JSON.parse(f.contentDocument.querySelector('#public-qa-status').textContent)};}catch{return null;}});if(!frames.every(Boolean)&&Date.now()-started<12000)return;results.push({page,frames});out.textContent=JSON.stringify({done:false,results});next();},250);next();
