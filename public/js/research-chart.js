// Progressive enhancement of the frozen research chart. No request or new observations.
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const keys = ["nav", "spy", "qqq"];
  function attrs(node, values) {
    for (const [key, value] of Object.entries(values)) node.setAttribute(key, String(value));
    return node;
  }
  function svgNode(tag, values) { return attrs(document.createElementNS(NS, tag), values); }

  document.querySelectorAll("[data-research-chart]").forEach(figure => {
    const source = figure.querySelector("[data-os-points]");
    let data;
    try { data = JSON.parse(source.content.textContent); } catch { return; }
    const { rows, plot } = data;
    if (!rows?.length || rows.some(r => !/^\d{4}-\d{2}-\d{2}$/.test(r.d) || keys.some(k => !Number.isFinite(r[k])))) return;
    const svg = figure.querySelector(".os-chart");
    const slider = figure.querySelector(".os-date-slider");
    const cursor = figure.querySelector("[data-os-cursor]");
    const date = figure.querySelector("[data-os-date]");
    const values = keys.map(k => figure.querySelector(`[data-os-value="${k}"]`));
    let selected = rows.length - 1;
    let width = plot.w, height = plot.h, left = plot.left, bottom = plot.bottom;
    const x = i => left + (width - left - plot.right) * i / Math.max(1, rows.length - 1);
    const y = v => plot.top + (height - plot.top - bottom) * (plot.hi - v) / (plot.hi - plot.lo);
    const percent = v => { const n = (v - 1) * 100; return (n > 0 ? "+" : "") + n.toFixed(1) + "%"; };

    function select(index) {
      selected = Math.max(0, Math.min(rows.length - 1, Math.round(index)));
      const row = rows[selected];
      slider.value = String(selected);
      date.textContent = row.d;
      date.dateTime = row.d;
      keys.forEach((k, i) => {
        values[i].textContent = percent(row[k]);
        attrs(cursor.querySelector(`.os-dot-${k}`), { cx: x(selected), cy: y(row[k]) });
      });
      slider.setAttribute("aria-valuetext", row.d + "; " + keys.map((k, i) =>
        values[i].previousElementSibling.textContent + " " + percent(row[k])).join("; "));
      attrs(cursor.querySelector("line"), { x1: x(selected), x2: x(selected), y1: plot.top, y2: height - bottom });
      cursor.removeAttribute("hidden");
    }

    function draw() {
      // Match SVG units to CSS pixels: labels remain readable at every card width.
      width = Math.max(200, Math.round(svg.getBoundingClientRect().width || plot.w));
      height = width < 480 ? 260 : 320;
      left = width < 480 ? 50 : plot.left;
      bottom = 40;
      attrs(svg, { viewBox: `0 0 ${width} ${height}` });
      keys.forEach(k => attrs(svg.querySelector(`.os-line-${k}`), {
        points: rows.map((r, i) => `${x(i).toFixed(2)},${y(r[k]).toFixed(2)}`).join(" ")
      }));
      const yAxis = figure.querySelector("[data-os-y-axis]");
      yAxis.replaceChildren(...plot.ticks.map(t => {
        const group = svgNode("g", {});
        const label = svgNode("text", { class: "eq-axis", x: left - 10, y: y(t.value), "text-anchor": "end", "dominant-baseline": "middle" });
        label.textContent = t.label;
        group.append(svgNode("line", { class: "eq-grid", x1: left, x2: width - plot.right, y1: y(t.value), y2: y(t.value) }), label);
        return group;
      }));
      // First/last months always remain visible. Interior year labels are selected by
      // their actual session position, never distributed independently of the curve.
      const ticks = plot.dates;
      const visible = ticks.length ? [ticks[0]] : [];
      const end = ticks[ticks.length - 1];
      for (const tick of ticks.slice(1, -1)) {
        if (x(tick.i) - x(visible[visible.length - 1].i) >= 86 && x(end.i) - x(tick.i) >= 86) visible.push(tick);
      }
      if (end && end !== visible[0]) visible.push(end);
      figure.querySelector("[data-os-x-axis]").replaceChildren(...visible.map(t => {
        const group = svgNode("g", { "data-date": t.d });
        const label = svgNode("text", { class: "eq-axis", x: x(t.i), y: height - 12, "text-anchor": t.anchor });
        label.textContent = t.label;
        group.append(svgNode("line", { class: "eq-grid os-date-grid", x1: x(t.i), x2: x(t.i), y1: plot.top, y2: height - bottom }), label);
        return group;
      }));
      select(selected);
    }

    slider.addEventListener("input", () => select(Number(slider.value)));
    function inspect(event) {
      const rect = svg.getBoundingClientRect();
      const px = (event.clientX - rect.left) * width / rect.width;
      if (px >= left && px <= width - plot.right) select((px - left) / (width - left - plot.right) * (rows.length - 1));
    }
    svg.addEventListener("pointermove", event => { if (event.pointerType !== "touch") inspect(event); });
    svg.addEventListener("pointerdown", inspect);
    // Touch scrolling remains native; the labelled range is the precise touch/keyboard control.
    figure.querySelector("[data-os-inspector]").hidden = false;
    draw();
    if ("ResizeObserver" in window) {
      let lastWidth = width;
      new ResizeObserver(entries => {
        const next = Math.round(entries[0].contentRect.width);
        if (next && next !== lastWidth) { lastWidth = next; draw(); }
      }).observe(svg);
    } else window.addEventListener("resize", draw);
  });
})();
