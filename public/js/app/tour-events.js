// Semantic events follow successful business operations, never simulated clicks.
export function tourEvent(step, details={}) {
  document.dispatchEvent(new window.CustomEvent('ducky:tour-progress', {detail:{step,...details}}));
}

export function tourTarget(element, name, details={}) {
  if (!element) return element;
  element.dataset.tour=name;
  for (const [key,value] of Object.entries(details)) if(value!=null) element.dataset[key]=String(value);
  return element;
}
