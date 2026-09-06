// Display dates without inventing a time for day-only source records.
export function readableDate(value) {
  if(!value || Number.isNaN(Date.parse(value)))return '—';
  if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
  return new Date(value).toISOString().slice(0,16).replace('T',' ')+' UTC';
}
