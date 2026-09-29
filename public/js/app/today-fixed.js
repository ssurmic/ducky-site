// Match the current-summary producer's fixed-point, round-to-even formatting.
// Work from the exact binary64 value: decimal scaling or toFixed alone changes ties.
export function summaryFixed(value,digits){
  if(typeof value!=='number'||!Number.isFinite(value))return '—';
  if(!Number.isInteger(digits)||digits<0||digits>2)throw new RangeError('Unsupported summary precision');
  const view=new DataView(new ArrayBuffer(8));
  view.setFloat64(0,Math.abs(value));
  const bits=view.getBigUint64(0),exponent=Number((bits>>52n)&0x7ffn);
  const mantissa=(bits&0xfffffffffffffn)|(exponent?1n<<52n:0n);
  const shift=exponent?exponent-1075:-1074;
  const numerator=mantissa*10n**BigInt(digits);
  let rounded;
  if(shift>=0)rounded=numerator<<BigInt(shift);
  else{
    const denominator=1n<<BigInt(-shift),remainder=numerator%denominator;
    rounded=numerator/denominator;
    if(remainder*2n>denominator||(remainder*2n===denominator&&rounded%2n===1n))rounded++;
  }
  const text=String(rounded).padStart(digits+1,'0');
  return (value<0||Object.is(value,-0)?'-':'')+(digits?text.slice(0,-digits)+'.'+text.slice(-digits):text);
}
