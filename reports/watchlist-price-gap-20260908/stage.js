const p=new URLSearchParams(location.search),frame=document.getElementById('preview');
frame.style.width=(p.get('width')||1200)+'px';frame.src='/'+(p.get('lang')||'zh')+'.html?'+p;
