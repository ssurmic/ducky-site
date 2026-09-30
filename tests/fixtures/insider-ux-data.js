// Synthetic Form 4 acceptance data only. Never included by build.py or sent to an API.
const caps=[2e11,1e10,2e9,3e8,1e8,null];
const tickers=['EXA','EXB','EXC','EXD','EXE','EXF'];
export function insiderFixture({now=new Date()}={}){
 const stamp=new Date(now);stamp.setUTCHours(12,0,0,0);const published=stamp.toISOString();
 const trade=new Date(stamp.getTime()-86400000).toISOString().slice(0,10);
 const rows=tickers.map((ticker,i)=>{
  const side=i%2?'sell':'buy',shares=i===1?2000:1000,price=125+i*25,security=i===3?'Ordinary shares':'Common Stock';
  const tx={date:trade,shares,price,value:shares*price,code:side==='buy'?'P':'S',side,security,ownership:'D',purchase_venue:'open_market',venue_evidence:[],venue_rule:'synthetic-form4'};
  const transactions=i===0?[tx,{...tx,shares:3000,price:150,value:450000}]:i===2?[tx,{...tx,security:'Series A Preferred Stock'}]:[tx];
  if(i===1)Object.assign(tx,{transaction_purpose:'tax_related_sale',purpose_rule:'form4-purpose/1',purpose_evidence:[{id:'F3',text:'This synthetic sale covers tax liabilities.'}],source_evidence:[{id:'F4',text:'Price is stated in USD for the disclosed common shares.'}]});
  const total=transactions.reduce((n,t)=>n+t.value,0),sum=transactions.reduce((n,t)=>n+t.shares,0);
  const metrics={schema:'form4-trade-metrics/1',security_title:i===2?null:security,currency:'USD',currency_basis:'form4_instruction_5',transaction_count:transactions.length,priced_transaction_count:transactions.length,priced_shares:sum,weighted_avg_price:i===2?null:total/sum,price_status:i===2?'mixed_security':'eligible',complete:true,held_pct:i===1?20:null,held_pct_basis:i===1?'single_sale_reported_scope':null,held_pct_status:i===1?'eligible':'unavailable',shares_sold:i===1?2000:null,shares_owned_after:i===1?8000:null,ownership:'D',owner_scope:i===1?'cik:0000000000|D|Common Stock':null};
  const textEn=`Synthetic filing for ${ticker}. A sample ${side==='buy'?'director purchased':'officer sold'} the disclosed securities on ${trade}. Amounts refer to the reported filing-side transactions, not a market quotation. Footnotes and the full source remain available here.`;
  const textZh=`${ticker} 合成申报：示例${side==='buy'?'董事买入':'高管卖出'}所披露证券，交易日期 ${trade}。金额来自申报交易，并非当前市场报价。完整说明与来源保留在此处。`;
  return {id:'sec:synthetic-insider:'+i,kind:'insider',ticker,direction:side==='buy'?1:-1,issuer_name:'Synthetic '+ticker+' Holdings',reporter_name:i===0?'Sample Director A / Sample Director B':'Sample Officer '+String.fromCharCode(65+i),sector:i<3?'Technology':'Industrials',market_cap:caps[i],company_as_of:published,provenance:'INGESTED',ts:published,published_at:published,observed_at:published,open_market_value:i===4?0:total,source_url:'https://www.sec.gov/Archives/edgar/data/0/synthetic-form4-'+i+'.xml',summary:textEn,extra:{source_published_at:published,message_en:textEn,message_zh:textZh,facts:{form:'4',side,company:'Synthetic '+ticker+' Holdings',total_value:total,owners:[{name:'Sample Officer '+String.fromCharCode(65+i),title:i%2?'Chief Financial Officer':'Director'}],transactions,...(i===3?{}:{trade_metrics:metrics}),purchase_values:side==='buy'?{open_market:i===4?0:total}:undefined,sale_values:side==='sell'?{open_market:total}:undefined,venue_rule:'synthetic-form4'}}};
 });
 const reply=(path,p=new URLSearchParams())=>{
  const local=path.replace(/^\/public/,'');
  if(local==='/radar/record.json')return {item:rows.find(r=>r.id===p.get('id'))};
  if(local==='/radar/facets.json')return {sectors:['Technology','Industrials']};
  if(local==='/radar/coverage.json')return {sources:[{source:'insider-bulk',kind:'insider',records:rows.length,first_date:trade,last_date:published.slice(0,10),status:'ok'}],partial:false};
  if(path==='/radar-history.json')return {items:[]};
  if(local!=='/radar/archive.json')return null;
  const bands={mega:[2e11,Infinity],large:[1e10,2e11],mid:[2e9,1e10],small:[3e8,2e9],micro:[0,3e8]};
  const included=rows.filter(r=>{
   if(p.get('kind')&&!p.get('kind').split(',').includes(r.kind))return false;
   if(p.get('ticker')&&r.ticker!==p.get('ticker'))return false;
   if(p.has('direction')&&String(r.direction)!==p.get('direction'))return false;
   if(p.get('sector')&&r.sector!==p.get('sector'))return false;
   if(p.get('content')==='missing')return false;
   if(p.get('purchases')==='open_market'&&r.open_market_value<200000)return false;
   if(['unverified','private_or_offering'].includes(p.get('purchases')))return false;
   if(p.get('cap')==='unknown'&&r.market_cap!==null)return false;
   if(bands[p.get('cap')]){const [lo,hi]=bands[p.get('cap')];if(r.market_cap===null||r.market_cap<lo||r.market_cap>=hi)return false;}
   if(p.get('q')&&!JSON.stringify(r).toLowerCase().includes(p.get('q').toLowerCase()))return false;
   const day=r.ts.slice(0,10);return !(p.get('start')&&day<p.get('start')||p.get('end')&&day>p.get('end'));
  });
  return {items:included,filter_version:3,next_cursor:null,partial:false,access:{mode:'current'}};
 };
 return {rows,reply};
}
