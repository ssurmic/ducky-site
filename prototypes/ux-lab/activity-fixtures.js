// Entirely fictional events in the existing archive shape. Never sent to an API.
// User-facing prose is supplied by the canonical locale, not fabricated from raw fields.
export const ACTIVITY_SAMPLES=[
 {id:'sample-form4',kind:'insider',ticker:'NVDA',ts:'2026-09-25T00:00:00Z',observed_at:'2026-09-25T18:00:00Z',provenance:'ingested',extra:{facts:{form:'4',side:'buy',total_value:1155000,open_market_value:1155000,transactions:[{date:'2026-09-23',code:'P',side:'buy',shares:5500,price:210,value:1155000,purchase_venue:'open_market'}]}}},
 {id:'sample-political',kind:'political',ticker:'AMD',ts:'2026-09-25T00:00:00Z',observed_at:'2026-09-25T17:00:00Z',provenance:'ingested',extra:{facts:{transaction_date:'2026-09-11',filing_date:'2026-09-25',amount_range:'$15,001 – $50,000',asset_type:'ST'}}},
 {id:'sample-partner',kind:'partner',ticker:'ORCL',ts:'2026-09-25T16:00:00Z',observed_at:'2026-09-25T16:00:00Z',extra:{source_published_at:null,facts:{form:'8-K',deal_type:'partnership'}}},
 {id:'sample-sale',kind:'insider',ticker:'META',ts:'2026-09-24T00:00:00Z',observed_at:'2026-09-24T19:00:00Z',provenance:'ingested',extra:{facts:{form:'4',side:'sell',total_value:750000,transactions:[{date:'2026-09-22',code:'S',side:'sell',shares:1000,price:750,value:750000}]}}},
 {id:'sample-news',kind:'news',ticker:'NVDA',ts:'2026-09-24T15:00:00Z',observed_at:'2026-09-24T16:00:00Z',provenance:'ingested',extra:{event_type:'issuer_news',published_at:'2026-09-24'}},
 {id:'sample-holdings',kind:'13f',ticker:'MU',ts:'2026-08-14T00:00:00Z',observed_at:'2026-08-14T20:00:00Z',provenance:'ingested',extra:{facts:{form:'13F-HR',report_period:'2026-06-30',prior_period:'2026-03-31',position_change:'increased',prior_shares:330000,new_shares:390000,new_value:61230000}}},
];
