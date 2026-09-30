// Direction of a recorded numerical change, never a sentiment or desirability score.
import {el,num} from './ui.js';
import {s,LANG} from './strings.js';
const finite=value=>typeof value==='number'&&Number.isFinite(value);
export const numericChangeClass=value=>'numeric-change'+(finite(value)&&value!==0?(value>0?' pos':' neg'):'');
export function numericChangeText(value,{digits=1,unit='%',missing='—',format}={}){
  if(!finite(value))return missing;
  value=value===0?0:value;
  if(typeof format==='function')return format(value);
  // Keep a small observed move distinct from an actual zero.
  while(value!==0&&digits<4&&Number(value.toFixed(digits))===0)digits++;
  const text=value!==0&&Number(value.toFixed(digits))===0?value.toLocaleString(LANG==='en'?'en-US':'zh-CN',{maximumSignificantDigits:2}):num(value,digits);
  return (value>0?'+':'')+text+unit;
}
export function numericChange(value,options={}){
  return el('span',{class:numericChangeClass(value)},numericChangeText(value,options));
}
// Only explicit numeric placeholders in owned copy become leaves; free-form prose is never scanned.
export function changeParts(key,values,changes){
  let parts=[s(key,values)];
  for(const [name,entry]of Object.entries(changes)){
    const {value,...options}=typeof entry==='object'&&entry!==null?entry:{value:entry};
    parts=parts.flatMap(part=>typeof part==='string'?part.split('{'+name+'}').flatMap((text,i)=>i?[numericChange(value,options),text]:[text]):[part]);
  }
  return parts;
}
