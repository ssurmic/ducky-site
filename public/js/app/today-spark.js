// today-spark.js — a small paired chart for the Today tiles: bars for one day-to-day change (net liquidity
// in $B, or the 10-year yield in bp) and a line for the same days' QQQ return, so a reader can see with
// their own eyes whether the two moved together or against each other. Pure SVG in the app's tokens,
// no library, no animation. Descriptive: a correlation over past sessions is not a forecast.
const NS='http://www.w3.org/2000/svg';
const svg=(tag,attrs={},...children)=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))if(v!==null&&v!==undefined)n.setAttribute(k,String(v));for(const c of children)if(c!==null&&c!==undefined)n.append(c);return n;};
const OK=v=>typeof v==='number'&&Number.isFinite(v);
const fix=n=>Number(n).toFixed(2);

// Pearson correlation of two equal-length series; null under three pairs or a flat series.
export function pearson(xs,ys){
  const pairs=xs.map((x,i)=>[x,ys[i]]).filter(([x,y])=>OK(x)&&OK(y));
  const n=pairs.length;if(n<3)return null;
  const mx=pairs.reduce((a,[x])=>a+x,0)/n,my=pairs.reduce((a,[,y])=>a+y,0)/n;
  let sxy=0,sxx=0,syy=0;
  for(const [x,y] of pairs){sxy+=(x-mx)*(y-my);sxx+=(x-mx)**2;syy+=(y-my)**2;}
  if(!sxx||!syy)return null;
  return Math.round(sxy/Math.sqrt(sxx*syy)*100)/100;
}

// Day-to-day pairs from the macro history: {date, change (of `pick`), ret (QQQ % that day)}.
export function dailyPairs(history,pick,{sessions=60}={}){
  const rows=(history||[]).filter(r=>r&&r.date);
  const out=[];
  for(let i=1;i<rows.length;i++){
    const a=pick(rows[i-1]),b=pick(rows[i]),q0=rows[i-1].qqq_index,q1=rows[i].qqq_index;
    if(!OK(a)||!OK(b)||!OK(q0)||!OK(q1)||q0<=0)continue;
    out.push({date:rows[i].date,change:b-a,ret:Math.round((q1/q0-1)*10000)/100});
  }
  return out.slice(-sessions);
}

// How the two moved on the days both moved: the share of days they went opposite ways.
export function oppositeShare(pairs){
  const moved=pairs.filter(p=>p.change!==0&&p.ret!==0);
  if(moved.length<5)return null;
  return Math.round(moved.filter(p=>Math.sign(p.change)!==Math.sign(p.ret)).length/moved.length*100);
}

export function summary(pairs){
  return {n:pairs.length,correlation:pearson(pairs.map(p=>p.change),pairs.map(p=>p.ret)),opposite:oppositeShare(pairs),
    last:pairs.length?pairs[pairs.length-1]:null};
}

// The chart itself. `unit` names the bar series ("$B", "bp"); `labels` are the two series' names for the
// legend and the tooltips; `fmtChange` formats a bar value.
export function sparkPair(pairs,{unit='',labels={bars:'',line:''},fmtChange=v=>String(v),fmtDate=d=>d}={}){
  const W=240,H=78,PAD_L=4,PAD_R=4,TOP=8,BOT=14,mid=TOP+(H-TOP-BOT)/2,half=(H-TOP-BOT)/2;
  const root=svg('svg',{class:'today-spark',viewBox:`0 0 ${W} ${H}`,role:'img'});
  if(!pairs.length){root.setAttribute('aria-hidden','true');return root;}
  const n=pairs.length,step=(W-PAD_L-PAD_R)/n,bw=Math.max(1.5,step*0.62);
  const maxC=Math.max(...pairs.map(p=>Math.abs(p.change)),1e-9),maxR=Math.max(...pairs.map(p=>Math.abs(p.ret)),1e-9);
  root.append(svg('line',{class:'today-spark-zero',x1:PAD_L,y1:fix(mid),x2:W-PAD_R,y2:fix(mid)}));
  pairs.forEach((p,i)=>{
    const x=PAD_L+i*step+(step-bw)/2,h=Math.abs(p.change)/maxC*half;
    const bar=svg('rect',{class:'today-spark-bar '+(p.change>0?'is-up':p.change<0?'is-down':'is-flat'),x:fix(x),y:fix(p.change>=0?mid-h:mid),width:fix(bw),height:fix(Math.max(h,0.6)),rx:1});
    bar.append(svg('title',{},`${fmtDate(p.date)} · ${labels.bars} ${fmtChange(p.change)} · ${labels.line} ${p.ret>0?'+':''}${p.ret}%`));
    root.append(bar);
  });
  const points=pairs.map((p,i)=>`${fix(PAD_L+i*step+step/2)},${fix(mid-p.ret/maxR*half)}`).join(' ');
  root.append(svg('polyline',{class:'today-spark-line',points,fill:'none'}));
  const last=pairs[n-1];
  root.append(svg('circle',{class:'today-spark-dot',cx:fix(PAD_L+(n-1)*step+step/2),cy:fix(mid-last.ret/maxR*half),r:2.4}));
  root.append(svg('text',{class:'today-spark-axis',x:PAD_L,y:H-3},fmtDate(pairs[0].date)),
    svg('text',{class:'today-spark-axis',x:W-PAD_R,y:H-3,'text-anchor':'end'},fmtDate(last.date)));
  return root;
}

// Three lines on one chart, each scaled to its own range over the window (0 = the period's low,
// 100 = its high): the dollar net liquidity level next to the QQQ and SPY index levels, so a reader can
// see whether they moved together or against each other. Comparable shapes, never comparable units.
// `primary` is the tile's own series: net liquidity ($B) or the 10-year yield (%); the indexes ride along.
export const PRIMARY={liquidity:r=>r?.metrics?.net_liquidity_bn,yield:r=>r?.metrics?.nominal_10y};
export function normalizedLines(history,{sessions=10,primary='liquidity'}={}){
  const rows=(history||[]).filter(r=>r&&r.date).slice(-sessions);
  const pick={[primary]:PRIMARY[primary]||PRIMARY.liquidity,qqq:r=>r?.qqq_index,spy:r=>r?.spy_index};
  const series=[];
  for(const [key,fn] of Object.entries(pick)){
    const raw=rows.map(fn);
    const known=raw.filter(OK);if(known.length<3)continue;
    const lo=Math.min(...known),hi=Math.max(...known),span=hi-lo;
    const change=raw.map((v,i)=>i>0&&OK(v)&&OK(raw[i-1])?(key==='liquidity'?v-raw[i-1]:key==='yield'?Math.round((v-raw[i-1])*100):raw[i-1]>0?Math.round((v/raw[i-1]-1)*10000)/100:null):null);
    series.push({key,values:raw.map(v=>OK(v)&&span>0?Math.round((v-lo)/span*1000)/10:null),raw,change,last:known[known.length-1],lo,hi});
  }
  return {dates:rows.map(r=>r.date),series};
}

// The nearest date to a pointer position over the chart; the last date when the chart has no size yet.
export function cursorIndex(x,width,n){
  if(!(width>0)||n<2)return n-1;
  return Math.max(0,Math.min(n-1,Math.round(x/width*(n-1))));
}

export function sparkLines({dates,series},{labels={},fmtDate=d=>d}={}){
  const W=240,H=88,PAD_L=4,PAD_R=4,TOP=6,BOT=14,inner=H-TOP-BOT;
  const root=svg('svg',{class:'today-lines',viewBox:`0 0 ${W} ${H}`,role:'img'});
  const n=dates.length;if(n<3||!series.length){root.setAttribute('aria-hidden','true');return root;}
  const step=(W-PAD_L-PAD_R)/(n-1),y=v=>TOP+inner*(1-v/100);
  for(const g of [0,50,100])root.append(svg('line',{class:'today-lines-grid',x1:PAD_L,y1:fix(y(g)),x2:W-PAD_R,y2:fix(y(g))}));
  for(const s of series){
    const pts=s.values.map((v,i)=>OK(v)?`${fix(PAD_L+i*step)},${fix(y(v))}`:null).filter(Boolean).join(' ');
    const line=svg('polyline',{class:'today-lines-line is-'+s.key,points:pts,fill:'none'});
    line.append(svg('title',{},`${labels[s.key]||s.key} · ${fmtDate(dates[0])} → ${fmtDate(dates[n-1])}`));
    root.append(line);
    // A marker on every session when the window is short: a finger can land on a day.
    if(n<=15)s.values.forEach((v,i)=>{if(OK(v))root.append(svg('circle',{class:'today-lines-dot is-'+s.key+(i===n-1?' is-last':''),cx:fix(PAD_L+i*step),cy:fix(y(v)),r:i===n-1?2.6:1.7}));});
    else{const lastIndex=s.values.map((v,i)=>OK(v)?i:-1).filter(i=>i>=0).pop();if(lastIndex>=0)root.append(svg('circle',{class:'today-lines-dot is-'+s.key+' is-last',cx:fix(PAD_L+lastIndex*step),cy:fix(y(s.values[lastIndex])),r:2.4}));}
  }
  // Every session labelled by its day of month when the window is two weeks; the ends otherwise.
  if(n<=15)dates.forEach((d,i)=>root.append(svg('text',{class:'today-spark-axis',x:fix(PAD_L+i*step),y:H-3,'text-anchor':i===0?'start':i===n-1?'end':'middle'},String(Number(d.slice(-2))))));
  else root.append(svg('text',{class:'today-spark-axis',x:PAD_L,y:H-3},fmtDate(dates[0])),svg('text',{class:'today-spark-axis',x:W-PAD_R,y:H-3,'text-anchor':'end'},fmtDate(dates[n-1])));
  // A cursor the caller moves: a vertical guide at one date, hidden until the pointer is over the chart.
  const cursor=svg('line',{class:'today-lines-cursor',x1:PAD_L,y1:TOP,x2:PAD_L,y2:TOP+inner,visibility:'hidden'});
  root.append(cursor);
  root.moveCursor=i=>{if(i===null){cursor.setAttribute('visibility','hidden');return;}const x=fix(PAD_L+i*step);cursor.setAttribute('x1',x);cursor.setAttribute('x2',x);cursor.setAttribute('visibility','visible');};
  return root;
}
