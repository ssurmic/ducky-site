import {s} from './strings.js';

// Direction is supplied by the shared source classifier. The browser never
// derives sentiment from a name, transaction title, price or record's age.
export function ownershipEvent(e) {
  const d=e?.data;
  return e?.topic==='ownership_disclosure'&&d?.opinion_state==='not_stated'&&
    d.applicability==='historical_event'&&d.validity?.classification==='classified'&&
    d.validity?.source==='validated_source_fields'&&
    ['positive','negative','non_directional'].includes(d.event_direction)?d:null;
}

export function nodeEvent(node) {
  const events=(node.evidence||[]).map(ownershipEvent);
  if(!events.length||events.some(e=>!e))return null;
  const first=events[0];
  return events.every(e=>e.event_direction===first.event_direction&&e.event_date===first.event_date)&&
    ({positive:'support',negative:'counter',non_directional:'context'})[first.event_direction]===node.stance?first:null;
}

export function eventLabel(node) {
  const event=nodeEvent(node);
  return event?s('evidence.event_'+event.event_direction):s('evidence.'+node.stance);
}

export function eventDate(node) {
  const event=nodeEvent(node);
  return event&&/^\d{4}-\d{2}-\d{2}$/.test(event.event_date||'')?event.event_date:null;
}
