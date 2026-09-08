import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const dom = new JSDOM('<html data-lang="en"><body><script id="ducky-strings"></script></body></html>', {url:'https://ducky.test/app/'});
for (const key of ['window','document','Node']) globalThis[key] = dom.window[key];
const copy = JSON.parse(readFileSync('i18n/en.json'));
document.querySelector('script').textContent = JSON.stringify(Object.fromEntries(
  Object.entries(copy).filter(([key]) => key.startsWith('app.')).map(([key,value]) => [key.slice(4),value])));
const {pricePoints,priceTrend} = await import('../public/js/app/views/opportunity-chart.js');
const rows = [{date:'2026-08-31',close:10}, {date:'2026-09-01',close:null}, {date:'2026-09-02',close:8}];

test('price chart preserves a missing day as a gap and exposes it through the date control', () => {
  const chart = priceTrend(rows);
  const path = chart.querySelector('.opportunity-plot-price');
  assert.equal((path.getAttribute('d').match(/M/g) || []).length, 2);
  assert.equal(path.dataset.direction, 'down');
  const slider = chart.querySelector('input');
  slider.value = '1'; slider.dispatchEvent(new dom.window.Event('input'));
  assert.match(slider.getAttribute('aria-valuetext'), /2026-09-01.*Price missing/);
  assert.equal(chart.querySelector('circle').getAttribute('visibility'), 'hidden');
  slider.value = '0'; slider.dispatchEvent(new dom.window.Event('input'));
  assert.match(slider.getAttribute('aria-valuetext'), /2026-08-31.*\$10.00/);
  assert.equal(chart.querySelector('circle').getAttribute('visibility'), 'visible');
});

test('ambiguous date ordering is rejected rather than drawing a misleading price trajectory', () => {
  for (const invalid of [[rows[2], rows[0]], [rows[0], rows[0]],
    [{date:'2026-02-30',close:8}, rows[2]], [{date:'2026-09-01T00:00:00Z',close:8}, rows[2]]]) {
    assert.equal(pricePoints(invalid), null);
    assert.equal(priceTrend(invalid).querySelector('svg'), null);
  }
  for (const close of [true, '8', Infinity, -2, 0]) {
    assert.equal(pricePoints([rows[0], {date:'2026-09-01',close}]), null);
  }
});

test('a dated current average is a horizontal reference and mismatched dates are not displayed', () => {
  const reference = {value:12,date:'2026-09-02',label:'252-session average'};
  const chart = priceTrend(rows, {reference});
  const line = chart.querySelector('.opportunity-plot-reference');
  assert.equal(line.getAttribute('y1'), line.getAttribute('y2'));
  assert.match(chart.querySelector('.opportunity-plot-legend').textContent, /252-session average.*2026-09-02/);
  for (const value of [{...reference,date:'2026-08-01'}, {...reference,value:null}, {...reference,value:Infinity}])
    assert.equal(priceTrend(rows,{reference:value}).querySelector('.opportunity-plot-reference'), null);
});

test('a long unobserved interval is not drawn as a continuous price path', () => {
  const chart = priceTrend([{date:'2026-08-01',close:10},{date:'2026-09-01',close:10}]);
  assert.equal((chart.querySelector('path').getAttribute('d').match(/M/g)||[]).length, 2);
  assert.ok(!chart.querySelector('svg').outerHTML.includes('NaN'));
});
