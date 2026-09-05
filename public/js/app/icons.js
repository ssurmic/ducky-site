// Shared, Lucide symbols. No font, emoji or remote icon dependency.
export function icon(name) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  for (const [key, value] of Object.entries({class: "app-icon", width: "20", height: "20",
    viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.75",
    "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", focusable: "false"})) svg.setAttribute(key, value);
  const use = document.createElementNS(ns, "use");
  use.setAttribute("href", "/vendor/lucide/icons.svg#" + name);
  svg.appendChild(use);
  return svg;
}
