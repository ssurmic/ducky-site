// Dated public teaching examples; never a live private report or recorded alert.
// Source: public/media/ducky-demo-cases-2026-09-07.json; full paths remain downloadable.
import {s} from './strings.js';
const CASES = {
  "NOK": {
    "source_url": "https://www.nokia.com/newsroom/inside-information-nvidia-to-make-usd-1-billion-equity-investment-in-nokia-in-addition-to-new-strategic-partnership-nokias-board-resolved-on-directed-share-issuance-to-nvidia/",
    "retrieved_at": "2026-09-07T03:55:38.592151+00:00",
    "start": "2025-10-28",
    "end": "2026-09-04",
    "base_close": 7.769999980926514,
    "end_close": 10.029999732971191,
    "return_pct": 29.0862,
    "max_close_drawdown_pct": -50.089
  },
  "GLW": {
    "source_url": "https://www.sec.gov/Archives/edgar/data/24741/000120677426000273/glw4631061-8k.htm",
    "retrieved_at": "2026-09-07T03:55:38.592151+00:00",
    "start": "2026-05-06",
    "end": "2026-09-04",
    "base_close": 181.57000732421875,
    "end_close": 154.3000030517578,
    "return_pct": -15.019,
    "max_close_drawdown_pct": -51.4842
  },
  "HOOD": {
    "source_url": "https://www.sec.gov/Archives/edgar/data/1783879/000178387925000189/xslF345X03/wk-form4_1750195641.xml",
    "retrieved_at": "2026-09-07T03:55:38.592151+00:00",
    "start": "2025-06-17",
    "end": "2025-07-17",
    "base_close": 74.94999694824219,
    "end_close": 105.44999694824219,
    "return_pct": 40.6938,
    "max_close_drawdown_pct": -6.8483
  }
};
export const exampleTickers=Object.keys(CASES);
export function exampleMap(ticker){
 const c=CASES[ticker];if(!c)return null;
 const both=text=>({en:text,zh:text});
 const parts=[['source',s('experience.sample_source'),s('experience.sample_disclosure'),c.source_url],
 ['change',s('experience.sample_change'),s('experience.sample_prices',{start:c.start,end:c.end,first:c.base_close.toFixed(2),last:c.end_close.toFixed(2),change:c.return_pct.toFixed(2)}),null],
 ['loss',s('experience.sample_loss'),s('experience.sample_drawdown',{start:c.start,end:c.end,loss:c.max_close_drawdown_pct.toFixed(2)}),null]];
 return {ticker,status:'ready',checked_at:c.retrieved_at,analysis_status:'ready',analysis_generated_at:c.retrieved_at,
  analysis:{overview:{...both(s('experience.sample_overview')),citations:parts.map(p=>p[0])},sections:[]},
  nodes:parts.map(([id,title,reason,url])=>({id,kind:'event',stance:'context',title:both(id==='source'?s('experience.case_'+ticker):reason),reason:both(reason),observed_at:c.retrieved_at,published_at:c.start,
   evidence:[{id:'example:'+ticker+':'+id,kind:'event',title:both(reason),source_url:url,published_at:id==='source'?c.start:null,observed_at:c.retrieved_at}]})),
  missing:[]};
}
