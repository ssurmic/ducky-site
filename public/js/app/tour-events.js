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

// A grouped source is still the exact tour target. First guide the reader to
// its outermost closed folder; opening it does not claim the source was read.
export function tourReadingTarget(element){
  let target=element;
  for(let parent=element?.parentElement;parent;parent=parent.parentElement){
    if(parent.tagName==='DETAILS'&&!parent.open)target=parent.querySelector(':scope > summary')||target;
  }
  return target;
}
