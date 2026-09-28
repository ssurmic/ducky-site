import test from 'node:test';
import assert from 'node:assert/strict';
import {activityRecord,activityArchive} from './activity-adapter.js';

test('archive projection keeps source clocks separate from legacy and observed clocks',()=>{
 const base={id:'sec:sample:P',kind:'insider',ts:'2026-09-25T00:00:00Z',observed_at:'2026-09-28T14:00:00Z',provenance:'BACKFILL',extra:{facts:{transactions:[{date:'2026-09-23'}]}}};
 assert.equal(activityRecord(base).publishedDate,'2026-09-25');assert.equal(activityRecord(base).transactionDate,'2026-09-23');
 assert.equal(activityRecord({...base,extra:{source_published_at:null}}).publishedDate,null);
 assert.equal(activityRecord({...base,id:'s:123',provenance:null}).publishedDate,null);
 assert.equal(activityRecord({...base,extra:{publication_basis:'first_observed'}}).publishedDate,null);
});
test('amounts retain unknown, actual zero, declared totals and political ranges',()=>{
 const row={id:'sample',kind:'insider',extra:{facts:{side:'buy',total_value:0,owners:[{name:'A'},{name:'B'}],transactions:[{value:400000},{value:400000}]}}};
 assert.equal(activityRecord(row).metric,0);assert.equal(activityRecord(row).action,'buy');
 assert.equal(activityRecord({...row,extra:{facts:{side:'sell',total_value:400000}}}).metric,400000);
 assert.equal(activityRecord({...row,extra:{facts:{}}}).metric,null);assert.equal(activityRecord({...row,extra:{facts:{}}}).action,'record');
 const p=activityRecord({id:'p',kind:'political',extra:{facts:{amount_range:'$15,001 - $50,000',transaction_date:'2026-09-11',filing_date:'2026-09-25'}}});
 assert.equal(p.metric,'$15,001 - $50,000');assert.equal(p.publishedDate,'2026-09-25');assert.equal(p.metricType,'amount_range');
});
test('13F preserves absence and report period without declaring an executed sale',()=>{
 const row={id:'13f:x',kind:'13f',extra:{facts:{position_change:'closed',new_shares:0,prior_shares:1000,report_period:'2026-06-30'}}};
 const item=activityRecord(row);assert.equal(item.action,'closed');assert.equal(item.metric,0);assert.equal(item.reportPeriod,'2026-06-30');assert.equal(item.transactionDate,null);
 const option=activityRecord({...row,extra:{facts:{...row.extra.facts,put_call:'CALL'}}});assert.equal(option.metric,null);assert.equal(option.action,'option_holding');assert.equal(option.priorShares,null);assert.equal(option.stockEligible,false);
 assert.equal(activityRecord({...row,ticker:null}).stockEligible,false);assert.equal(activityRecord({...row,ticker:null}).ticker,null);
});
test('official-event fields, access and pagination survive; unsupported developer feed is excluded',()=>{
 const access={mode:'delayed',delay_days:5,available_before:'2026-09-23T00:00:00Z'};
 const doc=activityArchive({items:[{id:'event',kind:'index',extra:{published_at:'2026-09-20',effective_at:'2026-09-25',publisher:'Official',source_url:'https://example.com/event'}},{id:'dev',kind:'nvdev'}],access,next_cursor:'opaque-cursor',partial:true});
 assert.equal(doc.items.length,1);assert.equal(doc.items[0].effectiveDate,'2026-09-25');assert.equal(doc.items[0].publishedDate,'2026-09-20');assert.equal(doc.items[0].sourceUrl,'https://example.com/event');
 assert.equal(doc.access,access);assert.equal(doc.nextCursor,'opaque-cursor');assert.equal(doc.partial,true);
 assert.equal(activityRecord({id:'bad',kind:'news',source_url:'javascript:alert(1)'}).sourceUrl,null);
});
