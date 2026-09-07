const params=new URLSearchParams(location.search),frame=document.getElementById('phone');
frame.style.width=(params.get('width')||390)+'px';frame.style.colorScheme=params.get('theme')||'light';frame.src='/'+(params.get('lang')||'zh')+'.html?'+params;
for(const size of [320,390,1000]){const b=document.createElement('button');b.id='resize-'+size;b.textContent='QA resize '+size;b.style.cssText='position:fixed;left:0;top:'+([320,390,1000].indexOf(size)*35)+'px';b.onclick=()=>frame.style.width=size+'px';document.body.append(b);}
