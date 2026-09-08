import {el, px} from '../ui.js';
import {s} from '../strings.js';

const finite = value => typeof value === 'number' && Number.isFinite(value);
const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

/** Retain missing observations as gaps; reject ambiguous ordering and duplicate dates. */
export function pricePoints(rows) {
  if (!Array.isArray(rows) || rows.length < 2 || rows.length > 520) return null;
  let previous = '';
  const points = [];
  for (const row of rows) {
    if (!row || !day(row.date) || row.date <= previous) return null;
    previous = row.date;
    points.push({date:row.date, close:finite(row.close) && row.close > 0 ? row.close : null});
  }
  return points.filter(point => point.close !== null).length >= 2 ? points : null;
}

/** A current moving-average value is a dated horizontal reference, never a historical curve. */
export function priceTrend(rows, {reference=null} = {}) {
  const host = el('figure.opportunity-plot');
  const points = pricePoints(rows);
  if (!points) { host.append(el('p.data-notice', s('opportunities.chart_missing'))); return host; }
  const values = points.filter(point => point.close !== null);
  const first = values[0], last = values.at(-1);
  const ref = reference && finite(reference.value) && reference.value > 0 &&
    day(reference.date) && reference.date === last.date && typeof reference.label === 'string' &&
    reference.label.trim() ? reference : null;
  const heading = el('figcaption.opportunity-plot-heading',
    el('span', s('opportunities.close_history')),
    el('span.opportunity-plot-reading', `${last.date} · ${px(last.close)}`));
  const reading = heading.lastChild;
  const ns = 'http://www.w3.org/2000/svg';
  function shape(tag, attrs, text) {
    const node = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (text !== undefined) node.textContent = text;
    return node;
  }
  const svg = shape('svg', {viewBox:'0 0 540 148', preserveAspectRatio:'none', role:'img',
    'aria-label':s('opportunities.chart_description', {start:first.date, end:last.date})});
  const scaleValues = [...values.map(point => point.close), ...(ref ? [ref.value] : [])];
  const low = Math.min(...scaleValues), high = Math.max(...scaleValues);
  const pad = Math.max((high - low) * .12, high * .01);
  const x = date => 44 + (Date.parse(date) - Date.parse(points[0].date)) /
    (Date.parse(points.at(-1).date) - Date.parse(points[0].date)) * 484;
  const y = value => 136 - (value - low + pad) / (high - low + pad * 2) * 120;
  for (const value of [low, high]) {
    svg.append(shape('line', {x1:44, x2:528, y1:y(value), y2:y(value), class:'opportunity-plot-grid'}),
      shape('text', {x:38, y:y(value) + 4, 'text-anchor':'end', class:'opportunity-plot-axis'},
        value.toLocaleString(undefined, {maximumFractionDigits:value < 10 ? 2 : 0})));
  }
  if (ref) svg.append(shape('line', {x1:44, x2:528, y1:y(ref.value), y2:y(ref.value),
    class:'opportunity-plot-reference', 'stroke-dasharray':'5 5'}));
  let path = '', previous = null;
  for (const point of points) {
    if (point.close === null) { previous = null; continue; }
    // A long unobserved interval is not shown as a continuously observed price path.
    const continuous = previous && Date.parse(point.date) - Date.parse(previous.date) <= 10 * 86400000;
    path += `${continuous ? 'L' : 'M'}${x(point.date).toFixed(2)} ${y(point.close).toFixed(2)} `;
    previous = point;
  }
  svg.append(shape('path', {d:path.trim(), fill:'none', class:'opportunity-plot-price',
    'data-direction':last.close < first.close ? 'down' : 'up'}));
  const cursor = shape('circle', {r:4, cx:x(last.date), cy:y(last.close), class:'opportunity-plot-cursor'});
  svg.append(cursor);
  const slider = el('input.opportunity-plot-slider', {type:'range', min:0, max:points.length - 1,
    step:1, value:points.length - 1, 'aria-label':s('opportunities.chart_date')});
  const select = () => {
    const point = points[Number(slider.value)];
    if (!point) return;
    const label = `${point.date} · ${point.close === null ? s('opportunities.price_missing') : px(point.close)}`;
    reading.textContent = label; slider.setAttribute('aria-valuetext', label);
    cursor.setAttribute('visibility', point.close === null ? 'hidden' : 'visible');
    if (point.close !== null) { cursor.setAttribute('cx', x(point.date)); cursor.setAttribute('cy', y(point.close)); }
  };
  slider.addEventListener('input', select); select();
  host.append(heading, svg, el('div.opportunity-plot-dates',
    el('span', points[0].date), el('span', points.at(-1).date)), slider);
  if (ref) host.append(el('p.opportunity-plot-legend',
    el('span', {'aria-hidden':'true'}, '┄'), `${ref.label} · ${px(ref.value)} · ${ref.date}`));
  if (points.some(point => point.close === null)) host.append(el('p.small.muted', s('opportunities.price_gaps')));
  host.append(el('p.opportunity-plot-basis', s('opportunities.price_basis')));
  return host;
}
