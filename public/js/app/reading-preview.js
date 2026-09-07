// Presentation only. Callers keep the full source text in an accessible disclosure.
export function readingPreview(value, isZh) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  const limit = isZh ? 88 : 180;
  const sentence = text.match(isZh ? /^.*?[。！？](?:[”」』])?/ : /^.*?[.!?](?:[”"])?(?=\s|$)/)?.[0] || text;
  if (sentence.length <= limit) return sentence;
  const prefix = sentence.slice(0, limit);
  return (isZh ? prefix : prefix.replace(/\s+\S*$/, '')) + '…';
}
