import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../public/js/research-chart.js', import.meta.url), 'utf8');
const rows = [
  { d: '2023-12-29', nav: 1, spy: 0.99, qqq: 0.98 },
  { d: '2024-01-02', nav: 1.1, spy: 1.02, qqq: 1.04 },
  { d: '2024-01-03', nav: 0.9, spy: 1.03, qqq: 1.01 },
  { d: '2024-01-05', nav: 1.2, spy: 1.01, qqq: 1.06 }
];
function fixture(points = rows) {
  const plot = { w: 720, h: 320, left: 64, right: 18, top: 24, bottom: 48, lo: 0.8, hi: 1.3,
    ticks: [{value: 1, label: '0%'}],
    dates: [{i:0,d:rows[0].d,label:'2023-12',anchor:'start'}, {i:1,d:rows[1].d,label:'2024-01',anchor:'middle'}, {i:3,d:rows[3].d,label:'2024-01',anchor:'end'}]
  };
  const dom = new JSDOM(`<figure data-research-chart>
    <svg class="os-chart"><g data-os-y-axis></g><g data-os-x-axis></g>
    ${['nav','spy','qqq'].map(k=>`<polyline class="os-line-${k}" points="0,0 1,1"/>`).join('')}
    <g data-os-cursor hidden><line/>${['nav','spy','qqq'].map(k=>`<circle class="os-dot-${k}"/>`).join('')}</g></svg>
    <div data-os-inspector hidden><time data-os-date></time><input class="os-date-slider" type="range" min="0" max="3" value="3"/>
    ${['nav','spy','qqq'].map(k=>`<span>${k}</span><b data-os-value="${k}"></b>`).join('')}</div>
    <template data-os-points>${JSON.stringify({rows:points,plot})}</template></figure>`, { runScripts: 'outside-only' });
  const doc = dom.window.document, svg = doc.querySelector('svg');
  let width = 720, observer;
  svg.getBoundingClientRect = () => ({width, left:0});
  dom.window.ResizeObserver = class { constructor(fn){observer=fn;} observe(){} };
  dom.window.eval(source);
  return {dom,doc,svg, resize(w){width=w;observer([{contentRect:{width:w}}]);},
    select(i){ const input=doc.querySelector('input'); input.value=i; input.dispatchEvent(new dom.window.Event('input')); }
  };
}

test('date inspector reads all three series from the same trading session, including losses', () => {
  const f=fixture();
  assert.equal(f.doc.querySelector('[data-os-date]').textContent,'2024-01-05');
  f.select(2);
  assert.equal(f.doc.querySelector('[data-os-date]').dateTime,'2024-01-03');
  assert.deepEqual([...f.doc.querySelectorAll('[data-os-value]')].map(n=>n.textContent),['-10.0%','+3.0%','+1.0%']);
  assert.match(f.doc.querySelector('input').getAttribute('aria-valuetext'),/2024-01-03; nav -10.0%/);
  f.select(0);
  assert.deepEqual([...f.doc.querySelectorAll('[data-os-value]')].map(n=>n.textContent),['0.0%','-1.0%','-2.0%']);
});

test('year tick, pointer selection and cursor align to the same session despite holiday gaps', () => {
  const f=fixture();
  const positions=f.doc.querySelector('.os-line-nav').getAttribute('points').split(' ').map(p=>p.split(',').map(Number));
  assert.ok(Math.abs(Number(f.doc.querySelector('[data-date="2024-01-02"] line').getAttribute('x1'))-positions[1][0])<0.01);
  const event=new f.dom.window.MouseEvent('pointerdown',{clientX:positions[1][0]});
  f.svg.dispatchEvent(event);
  assert.equal(f.doc.querySelector('[data-os-date]').textContent,'2024-01-02');
  assert.ok(Math.abs(Number(f.doc.querySelector('.os-dot-nav').getAttribute('cx'))-positions[1][0])<0.01);
});

test('narrow layout keeps endpoint dates, avoids collisions and preserves the selected day', () => {
  const f=fixture(); f.select(2); f.resize(236);
  assert.equal(f.svg.getAttribute('viewBox'),'0 0 236 260');
  assert.deepEqual([...f.doc.querySelectorAll('[data-os-x-axis] text')].map(n=>n.textContent),['2023-12','2024-01']);
  assert.equal(f.doc.querySelector('[data-os-date]').textContent,'2024-01-03');
  const points=f.doc.querySelector('.os-line-nav').getAttribute('points').split(' ').map(p=>p.split(',').map(Number));
  assert.ok(Math.abs(Number(f.doc.querySelector('.os-dot-nav').getAttribute('cx'))-points[2][0])<0.01);
  assert.equal(Number(f.doc.querySelector('[data-os-x-axis] g:last-child line').getAttribute('x1')),points[3][0]);
});

test('invalid observations leave the static chart available without a misleading inspector', () => {
  const f=fixture([{...rows[0], nav:null}]);
  assert.equal(f.doc.querySelector('[data-os-inspector]').hidden,true);
  assert.equal(f.doc.querySelector('.os-line-nav').getAttribute('points'),'0,0 1,1');
});
