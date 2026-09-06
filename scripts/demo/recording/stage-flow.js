// Editorial demonstration for the video only. Animation timing is not service latency.
import {el} from '/js/app/ui.js';

export async function mountNewView(root,lang) {
  const en=lang==='en', base=en?'/en.html':'/';
  const html=await(await fetch(en?'/source-video-en.html':'/source-video.html')).text();
  const source=new DOMParser().parseFromString(html,'text/html');
  const date=source.querySelector('time');
  const original=source.querySelector('.video-example-card .cta-row a');
  root.className='stage-flow';
  root.append(el('p.stage-flow-label',en?'Illustrative flow · time compressed':'流程演示 · 时间已压缩'));
  root.append(el('h1',en?'Start with a new view. Keep the source in sight.':'看到新观点，接着核对它的依据。'));
  root.append(el('p.stage-sub',en?'From the original statement to your own stock research and conditions.':'从博主原话，继续查到自己的股票、事件和观察条件。'));
  const card=el('article.stage-flow-source',
    el('div.stage-flow-meta',el('span','YouTube'),el('strong','Wall Street Millennial'),el('time',{datetime:date.getAttribute('datetime')},date.textContent)),
    el('h2',source.querySelector('.video-example-card h3').textContent),
    el('p',source.querySelector('.video-takeaway').textContent),
    el('a',{href:original.href,target:'_blank',rel:'noopener noreferrer'},en?'Open the original statement ↗':'打开原视频核对 ↗'));
  root.append(card);
  const labels=en?[
    ['View published','Keep the author, publication date, and original video.'],
    ['Summary checked','Read the attributed summary and source timestamps.'],
    ['Research your stock','Check whether the view is directly relevant to your stock.'],
    ['Calendar and alerts','Review upcoming events and choose your own conditions.']
  ]:[
    ['观点发表','保留作者、发表时间和原始视频。'],
    ['摘要核对','摘要归属博主，重要观点能回到原文时间点。'],
    ['按股票查看','先核对这条观点与你关注的股票是否直接相关。'],
    ['日历与提醒','再看后续事件，设置自己的观察条件。']
  ];
  const steps=labels.map(([title,text],i)=>el('article.stage-flow-step',el('span.stage-flow-number',String(i+1).padStart(2,'0')),el('strong',title),el('p',text)));
  root.append(el('div.stage-flow-steps',...steps));
  root.append(el('p.stage-flow-note',en?
    'Illustrative flow, not a processing-speed test · Views belong to the original creator.':
    '流程示意 · 非处理速度实测；观点归属原作者。'));
  const controls=el('div.stage-flow-controls',
    el('a',{href:base+'?scene=creator'},en?'Check the summary →':'查看摘要与出处 →'),
    el('a',{href:base+'?scene=screen'},en?'Set stock conditions →':'设置股票条件 →'),
    el('a',{href:base+'?scene=calendar'},en?'Explore the calendar →':'继续查看日历 →'));
  root.append(controls);
  const query=new URLSearchParams(location.search), requested=Number(query.get('phase')||0);
  let phase=Number.isInteger(requested)?Math.max(0,Math.min(3,requested)):0;
  const advance=el('button.stage-flow-next',{type:'button',onclick:()=>{phase=phase===3?0:phase+1;paint();}},en?'Next step →':'下一步 →');
  controls.prepend(advance);
  const paint=()=>{
    steps.forEach((step,index)=>{step.classList.toggle('is-active',index===phase);step.classList.toggle('is-past',index<phase);});
    advance.textContent=phase===3?(en?'Replay the flow ↻':'重新演示 ↻'):(en?'Next step →':'下一步 →');
    root.dataset.phase=String(phase);
  };
  paint();
}
