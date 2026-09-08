// Private editorial rehearsal; screenshots and dated price observations stay unchanged.
// No application APIs, delivery simulation, model work or research claims are added here.
const $ = id => document.getElementById(id);
const text = (tag, value, className) => {
  const node = document.createElement(tag);
  node.textContent = value;
  if (className) node.className = className;
  return node;
};
const svg = (name, attrs) => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
};

try {
  const [manifest, prices] = await Promise.all(['/manifest.json', '/coin.json'].map(async url => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Local source missing');
    return response.json();
  }));
  const bars = prices.bars;
  if (bars.length !== 21 || bars[0].date !== '2026-08-07' || bars.at(-1).date !== '2026-09-04' ||
      bars.some((b, i) => !Number.isFinite(b.Close) || b.Close <= 0 || (i && b.date <= bars[i - 1].date))) {
    throw new Error('The fixed historical window is incomplete');
  }
  const scenes = manifest.scenes;
  const starts = [];
  const total = scenes.reduce((sum, s) => { starts.push(sum); return sum + s.budget_seconds; }, 0);
  let lang = 'zh', time = 0, active = -1, playing = false, previousTick = null;
  let animate = () => {};
  const copy = {
    zh: [
      ['你的自选股', '哪些消息，跟你有关？'],
      ['信息导图 · COIN', '把相关信息放在一起'],
      ['历史回放 · 2026-08-08', '为什么看好 Coinbase？'],
      ['COIN · 完整观察区间', '后来的走势，也能回看'],
      ['另一只自选股 · AVGO', '博主之外，还有公司披露'],
      ['Reddit · AVGO', '提及次数，也有记录'],
      ['AI 观点速读', '先读概述，再查依据'],
      ['你选择的通知渠道', '重要更新，送到你这里'],
      ['Ducky Bot', '从你关注的股票开始'],
    ],
    en: [
      ['Your watchlist', 'Which updates matter to you?'],
      ['Information Map · COIN', 'Put the relevant updates together'],
      ['Historical replay · Aug 8, 2026', 'Why might Coinbase benefit?'],
      ['COIN · Full observation window', 'Follow what happened next'],
      ['Another watched stock · AVGO', 'Look at company filings, too'],
      ['Reddit · AVGO', 'See the recorded mentions'],
      ['AI perspective', 'Read the overview. Check the sources.'],
      ['Your chosen channels', 'Important updates, delivered to you'],
      ['Ducky Bot', 'Start with the stocks you care about'],
    ],
  };
  const labels = {zh: ['关注', '导图', '原话', '走势', '披露', 'Reddit', '概述', '通知', '开始'], en: ['Stocks', 'Map', 'Source', 'Price', 'Filings', 'Reddit', 'Overview', 'Delivery', 'Start']};
  const basis = () => lang === 'zh'
    ? '本地分镜预演 · 正式页面待重录 · 历史资料不代表当时已收录或已推送'
    : 'Private storyboard · Final UI capture pending · Historical sources do not prove contemporaneous capture or delivery';

  // Crop an unchanged archived screenshot inside the editorial frame. Source coordinates
  // are fractions of the original bitmap, not a fabricated or relabelled product UI.
  function shot(src, focus, note) {
    const host = text('div', '', 'shot');
    const img = document.createElement('img');
    img.alt = note;
    img.src = src;
    const layout = () => {
      if (!img.naturalWidth || !host.clientWidth) return;
      const scale = host.clientWidth / (img.naturalWidth * focus.w);
      if (focus.h) host.style.height = `${Math.min(host.parentElement.clientHeight, img.naturalHeight * focus.h * scale)}px`;
      img.style.width = `${img.naturalWidth * scale}px`;
      img.style.height = `${img.naturalHeight * scale}px`;
      img.style.left = `${-img.naturalWidth * focus.x * scale}px`;
      img.style.top = `${-img.naturalHeight * focus.y * scale}px`;
    };
    img.addEventListener('load', layout, {once: true});
    host.append(img, text('span', note, 'source-tag'));
    $('visual').append(host);
    layout();
    return p => { layout(); img.style.transform = `scale(${1 + p * .018})`; };
  }

  function pending(title, detail) {
    const box = text('div', '', 'pending');
    box.append(text('strong', title), text('p', detail));
    $('visual').append(box);
    return () => {};
  }

  function flow() {
    const host = text('div', '', 'duck-flow');
    const core = text('div', '', 'stock-core');
    core.append(text('span', lang === 'zh' ? '我的自选' : 'My stocks'), text('small', 'COIN · AVGO'));
    host.append(core);
    const items = (lang === 'zh' ? ['博主观点', '公司披露', '价格变化', 'Reddit 讨论'] : ['Creator views', 'Company filings', 'Price changes', 'Reddit discussions']).map((label, i) => {
      const node = text('div', '', 'floater');
      const img = document.createElement('img'); img.src = '/avatar.jpg'; img.alt = '';
      node.append(img, text('span', label));
      node.style.setProperty('--left', `${[3, 68, 7, 66][i]}%`);
      node.style.setProperty('--top', `${[13, 8, 69, 70][i]}%`);
      host.append(node); return node;
    });
    $('visual').append(host);
    return p => items.forEach((node, i) => {
      const approach = Math.min(1, p * 2.2);
      const from = i % 2 ? 70 : -70;
      node.style.transform = `translate(${from * (1 - approach)}px, ${Math.sin(p * 5 + i) * 7}px)`;
      node.style.opacity = String(.25 + .75 * approach);
    });
  }

  function chart() {
    const host = text('div', '', 'chart-wrap');
    const canvas = svg('svg', {viewBox: '0 0 1000 325', role: 'img', 'aria-label': lang === 'zh' ? 'COIN 全部21个收盘价，包含回落' : 'All 21 COIN closes, including declines'});
    const x = i => 55 + i / 20 * 885;
    const y = price => 276 - (price - 140) / 60 * 210;
    for (const value of [140, 160, 180, 200]) {
      canvas.append(svg('line', {x1: 55, x2: 940, y1: y(value), y2: y(value), class: 'chart-grid'}));
      const label = svg('text', {x: 5, y: y(value) + 5, class: 'chart-label'}); label.textContent = `$${value}`; canvas.append(label);
    }
    for (const i of [0, 10, 20]) {
      const label = svg('text', {x: x(i), y: 310, class: 'chart-label', 'text-anchor': i === 0 ? 'start' : i === 20 ? 'end' : 'middle'});
      label.textContent = bars[i].date.slice(5); canvas.append(label);
    }
    const line = svg('polyline', {class: 'chart-line'});
    const dot = svg('circle', {r: 6, class: 'chart-dot'});
    const number = svg('text', {class: 'chart-number', 'text-anchor': 'middle'});
    canvas.append(line, dot, number);
    const date = text('div', '', 'chart-date');
    const stat = text('div', '', 'chart-stat');
    host.append(canvas, date, stat); $('visual').append(host);
    $('basis').textContent = lang === 'zh'
      ? '2026-08-07 至 09-04 · 21 个日收盘价 · 起点早于视频发表，不是成交买价 · 单例股价变化，非投资收益'
      : 'Aug 7–Sep 4, 2026 · 21 daily closes · Baseline precedes publication, not an execution price · One stock path, not investment returns';
    return p => {
      const step = Math.min(20, Math.floor(Math.min(1, p / .78) * 20));
      line.setAttribute('points', bars.slice(0, step + 1).map((b, i) => `${x(i)},${y(b.Close)}`).join(' '));
      dot.setAttribute('cx', x(step)); dot.setAttribute('cy', y(bars[step].Close));
      number.setAttribute('x', Math.max(80, Math.min(915, x(step)))); number.setAttribute('y', y(bars[step].Close) - 17);
      number.textContent = `$${bars[step].Close.toFixed(2)}`;
      date.textContent = bars[step].date;
      host.dataset.revealedPoints = String(step + 1);
      if (step === 20 && !stat.childNodes.length) {
        stat.append(text('span', '+20.2%'), text('small', lang === 'zh' ? '窗口内收盘序列最大回撤 8.3%' : 'Largest close-to-close drawdown: 8.3%'));
      } else if (step < 20) stat.replaceChildren();
    };
  }

  function mount(index) {
    $('visual').replaceChildren();
    $('eyebrow').textContent = copy[lang][index][0]; $('headline').textContent = copy[lang][index][1];
    $('scene-count').textContent = `${String(index + 1).padStart(2, '0')} / 09`;
    $('subtitle').textContent = scenes[index][lang]; $('basis').textContent = basis();
    const cn = lang === 'zh';
    if (index === 0) return flow();
    if (index === 1) return shot('/frames/coin-map.png', {x: .325, y: .12, w: .437}, cn ? 'COIN · 正式站素材待重录' : 'COIN · final capture pending');
    if (index === 2) return shot('/frames/coin-source.png', {x: .329, y: .64, w: .43, h: .15}, cn ? '投资TALK君 · 24:22 原视频' : '投资TALK君 · original video at 24:22');
    if (index === 3) return chart();
    if (index === 4) return shot('/frames/avgo.png', {x: .327, y: .34, w: .435}, cn ? 'AVGO · 公司披露与作者观点' : 'AVGO · filing and creator view');
    if (index === 5) {
      $('basis').textContent = cn ? 'ApeWisdom · 2026-09-08 12:00 UTC 收录 · 精确统计截止未提供 · 样本不足，不能判断多空' : 'ApeWisdom · Captured Sep 8, 2026 at 12:00 UTC · Exact provider cutoff unknown · Insufficient sample; sentiment unavailable';
      return shot('/frames/reddit.png', {x: .338, y: .66, w: .205, h: .12}, cn ? 'AVGO · 已记录提及 · 样本不足' : 'AVGO · Recorded mentions · Insufficient sample');
    }
    if (index === 6) return shot('/frames/overview.png', {x: .324, y: .132, w: .44}, cn ? '上次分析 · 原始依据随引用保留' : 'Previous analysis · original evidence retained');
    if (index === 7) return pending(cn ? '待录制：真实收件' : 'Pending: real delivery receipts', cn ? '邮箱与 Telegram 分别验收后再录制。' : 'Capture after the designated email and Telegram receivers pass.');
    const end = text('div', '', 'end-card'); const img = document.createElement('img'); img.src = '/avatar.jpg'; img.alt = 'Ducky Bot';
    end.append(img, text('p', 'duckybot.app'), text('span', cn ? '免费开始 →' : 'Start free →', 'cta'));
    $('visual').append(end); return () => {};
  }

  const buttons = scenes.map((scene, i) => {
    const button = text('button', labels[lang][i]); button.type = 'button';
    button.onclick = () => { playing = false; time = starts[i]; paint(); };
    $('scenes').append(button); return button;
  });
  function paint() {
    const index = time >= total ? scenes.length - 1 : Math.max(0, starts.findLastIndex(start => time >= start));
    if (index !== active) { active = index; animate = mount(index); }
    const progress = Math.min(1, (time - starts[index]) / scenes[index].budget_seconds);
    animate(progress);
    $('stage').dataset.scene = scenes[index].name;
    $('stage').dataset.progress = progress.toFixed(4);
    $('seek').value = time; $('clock').textContent = `${time.toFixed(1)} / ${total.toFixed(1)}s`;
    $('play').textContent = playing ? (lang === 'zh' ? '暂停' : 'Pause') : time === total ? (lang === 'zh' ? '重播' : 'Replay') : (lang === 'zh' ? '播放' : 'Play');
    buttons.forEach((b, i) => { b.textContent = labels[lang][i]; b.setAttribute('aria-current', String(i === index)); });
  }
  $('language').onclick = () => { lang = lang === 'zh' ? 'en' : 'zh'; document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'; $('language').textContent = lang === 'zh' ? 'EN' : '中文'; active = -1; paint(); };
  $('seek').max = total;
  $('seek').oninput = e => { playing = false; time = Number(e.target.value); paint(); };
  $('play').disabled = false;
  $('play').onclick = () => { if (time >= total) time = 0; playing = !playing; previousTick = null; paint(); };
  $('status').textContent = '38.6 秒镜头预算 · 无配音 · 通知场景待验收';
  paint();
  function tick(now) {
    if (playing && previousTick !== null) { time = Math.min(total, time + Math.min(.15, (now - previousTick) / 1000)); if (time >= total) playing = false; paint(); }
    previousTick = now; requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
} catch (error) {
  $('status').textContent = `无法预演：${error.message}`;
}
