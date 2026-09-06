// Local recording fixture only. Research components are imported unchanged from the release.
window.DUCKY = {API_BASE:'/fixture', PRICES:{pro:{monthly_usd:9,annual_usd:90,annual_cny:499}}};
const {el} = await import('/js/app/ui.js');
const store = await import('/js/app/store.js');
store.set('watchlist',['ORCL','NVDA']);
const root = document.querySelector('#stage-root');
const scene = new URLSearchParams(location.search).get('scene') || 'intro';
root.dataset.scene=scene;
const heading = (eyebrow,title,body) => root.append(el('p.stage-eyebrow',eyebrow),el('h1',title),el('p.stage-sub',body));

if(scene === 'newview') {
  const {mountNewView}=await import('/stage-flow.js?v=voice3');
  await mountNewView(root,'en');
} else if(scene === 'intro') {
  root.className = 'stage-hero';
  root.append(el('img',{src:'/avatar-160.jpg',alt:''}));
  heading('START WITH A STOCK YOU FOLLOW','Your stock. The views and events around it.','Bring together creator views, company events, market context, and the conditions you want to watch.');
  root.append(el('div.stage-story',...['Pick a stock','Check the original view','Explore market context','Set your conditions'].map(text=>el('span',text))));
} else if(scene === 'creator') {
  root.className = 'stage-source';
  root.innerHTML = await (await fetch('/source-video-en.html')).text();
  root.prepend(el('p.stage-label','Real public summary · Creator views retain their source and publication time · No stock recommendation'));
} else if(scene === 'simulation') {
  store.set('me',{tier:'free'});
  const {mountSimulation} = await import('/js/app/views/creator-simulation.js');
  await mountSimulation(root,{state:{demo:true}});
} else if(scene === 'screen') {
  store.set('me',{tier:'pro'});
  heading('YOUR CONDITIONS','Combine signals on the same stock.','Open-market insider buying and oversold conditions, with your sector and market-cap filters.');
  root.append(el('p.stage-label','Example configuration · No saved filter or alert · No claim of matching results'));
  const {mountScreen} = await import('/js/app/views/signal-screen.js');
  mountScreen(root,{query:new URLSearchParams('screen=insider-oversold')});
} else if(scene === 'calendar') {
  store.set('me',{tier:'pro'});
  root.append(el('p.stage-label','Public calendar · Records available at capture time · Check the original source for dates and release schedules'));
  const {mount} = await import('/js/app/views/calendar.js');
  await mount(root);
} else if(scene === 'briefing') {
  root.append(el('p.stage-label','Market context for daily and weekly briefings · Historical reconstruction, not a live trading signal'));
  const doc = await (await fetch('/macro-beta.json')).json();
  const {renderMacroBeta} = await import('/js/app/macro-beta.js');
  root.append(renderMacroBeta(doc));
} else {
  root.className = 'stage-hero';
  root.append(el('img',{src:'/avatar-160.jpg',alt:''}));
  heading('TRY IT WITH ONE STOCK','Start with a stock you follow.','Explore the calendar, basic stock data, delayed historical records, and three alerts for free. Choose Pro when you need full research.');
  root.append(el('div.stage-story',el('span','duckybot.app'),el('span','Pro $9 / month')));
}
