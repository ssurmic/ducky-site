// Presentation only. Prices, aggregation and indicator calculations stay in their data modules.
const css = (name, fallback) => getComputedStyle(document.body).getPropertyValue(name).trim() || fallback;
export function chartPalette() {
  const token = (name, base, fallback) => css('--chart-' + name, css('--' + base, fallback));
  return {
    up: token('up', 'green', '#16836f'), down: token('down', 'red', '#bb556a'),
    grid: token('grid', 'border', '#e5eaf0'), text: css('--muted', '#64748b'),
    ink: css('--text', '#172334'), blue: token('indicator', 'blue', '#6477bc'),
    amber: token('reference', 'orange', '#a46b24'),
    histUp: token('hist-up', 'green', '#8ac9bd'), histDown: token('hist-down', 'red', '#dfabb7'),
    font: getComputedStyle(document.body).fontFamily || css('--font', 'Manrope, system-ui, sans-serif'),
  };
}
export function candleStyle(p) {
  return {upColor:p.up,downColor:p.down,borderVisible:false,wickUpColor:p.up,wickDownColor:p.down,priceLineColor:p.ink};
}
export function referenceScale(include, levels) {
  return original => {
    const result = original();
    if (!include || !result?.priceRange || !levels.length) return result;
    return {...result,priceRange:{minValue:Math.min(result.priceRange.minValue,...levels),maxValue:Math.max(result.priceRange.maxValue,...levels)}};
  };
}
