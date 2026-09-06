window.DUCKY={API_BASE:'/fixture',PRICES:{pro:{monthly_usd:9,annual_usd:90,annual_cny:499}}};
const {el}=await import('/js/app/ui.js');const store=await import('/js/app/store.js');store.set('watchlist',['ORCL','NVDA']);
const root=document.querySelector('#stage-root'),scene=new URLSearchParams(location.search).get('scene')||'intro';
root.dataset.scene=scene;
const heading=(eyebrow,title,body)=>root.append(el('p.stage-eyebrow',eyebrow),el('h1',title),el('p.stage-sub',body));
if(scene==='newview'){const {mountNewView}=await import('/stage-flow.js?v=voice3');await mountNewView(root,'zh');}
else if(scene==='intro'){root.className='stage-hero';root.append(el('img',{src:'/avatar-160.jpg',alt:''}));heading('YOUR IDEA. YOUR RESEARCH.','你关注一只股票，我们跟进相关线索。','博主观点、公司事件、市场背景和你设置的提醒，围绕同一只股票连接起来。');root.append(el('div.stage-story',...['选一只股票','核对相关观点','看看市场背景','设置自己的条件'].map(x=>el('span',x))));}
else if(scene==='creator'){root.className='stage-source';root.innerHTML=await (await fetch('/source-video.html')).text();root.prepend(el('p.stage-label','真实公开摘要 · 作者观点保留来源和发表时间 · 不是股票推荐'));}
else if(scene==='simulation'){store.set('me',{tier:'free'});const {mountSimulation}=await import('/js/app/views/creator-simulation.js');await mountSimulation(root,{state:{demo:true}});}
else if(scene==='screen'){store.set('me',{tier:'pro'});heading('YOUR CONDITIONS','线索可以叠加，条件由你来定。','同一只股票：公开市场买入 + 超跌，再加上市值和板块。');root.append(el('p.stage-label','示例配置 · 未保存筛选、未创建提醒、没有匹配结果承诺'));const {mountScreen}=await import('/js/app/views/signal-screen.js');mountScreen(root,{query:new URLSearchParams('screen=insider-oversold')});}
else if(scene==='calendar'){store.set('me',{tier:'pro'});root.append(el('p.stage-label','公开日历 · 录制时已有记录 · 日期与发布安排以原始来源为准'));const {mount}=await import('/js/app/views/calendar.js');await mount(root);}
else if(scene==='briefing'){root.append(el('p.stage-label','每日／每周摘要中的市场背景 · 历史重建，非实时交易信号'));const doc=await (await fetch('/macro-beta.json')).json();const {renderMacroBeta}=await import('/js/app/macro-beta.js');root.append(renderMacroBeta(doc));}
else{root.className='stage-hero';root.append(el('img',{src:'/avatar-160.jpg',alt:''}));heading('START WITH ONE STOCK','先关注一只股票。','免费查看日历、基本数据和延迟历史记录，试用 3 条提醒。需要完整研究时，再选择 Pro。');root.append(el('div.stage-story',el('span','duckybot.app'),el('span','Pro $9 / 月')));}
