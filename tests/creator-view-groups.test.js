import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collateCreatorViews} from '../public/js/app/creator-view-groups.js';
const view=(id,changes={})=>({post:{kol_id:'author-a',platform_post_id:id,published_at:'2026-09-20T10:00:00Z'},
  record:{creator_id:'author-a',post_id:id,point_id:'point:'+id,ticker:'MU',basis:'attributed_opinion',intent:'opinion',stance:'support',
    title:{en:'Margins improve only if contract prices hold.',zh:'仅在合约价格维持时利润率才会改善。'},reason:{en:'Product mix.',zh:'产品组合。'},
    conditional:true,condition_text:'Contract prices hold.',horizon_text:'Next quarter',action:'view',source_stance:'bull',
    source_url:'https://www.youtube.com/watch?v='+id,source_hash:'hash:'+id,published_at:'2026-09-20T10:00:00Z',
    observed_at:'2026-09-20T10:05:00Z',start_seconds:60,end_seconds:90,evidence:'Source passage '+id,...changes}});

test('exact repeated wording across sources collapses presentation and retains every original receipt',()=>{
  const a=view('source-a'),b=view('source-b',{published_at:'2026-09-19T10:00:00Z',observed_at:'2026-09-19T11:00:00Z',start_seconds:120});
  const before=JSON.stringify([a,b]),groups=collateCreatorViews([a,b]);
  assert.equal(groups.length,1);assert.deepEqual(groups[0].records,[a,b]);
  assert.equal(groups[0].records[1].record.point_id,'point:source-b');
  assert.equal(groups[0].records[1].record.observed_at,'2026-09-19T11:00:00Z');
  assert.equal(JSON.stringify([a,b]),before);
});
test('opposed views, changed conditions, horizons, bilingual meaning and new semantic fields remain separate',()=>{
  const first=view('first');
  for(const change of [{stance:'counter'},{ticker:'NVDA'},{condition_text:'Prices must rise.'},{horizon_text:'Next year'},
    {conditional:false},{source_stance:'bear'},{action:'reduce'},{intent:'self_reported'},
    {reason:{en:'A different mechanism.',zh:'不同原因。'}},{title:{...first.record.title,en:'Margins will improve.'}},
    {title:{...first.record.title,zh:'利润率已经改善。'}},{new_qualification:{probability:'uncertain'}},
    {attribution_status:'retracted'},{attribution_status:'superseded'}]){
    assert.equal(collateCreatorViews([first,view('second',change)]).length,2,JSON.stringify(change));
  }
  const other=view('third',{creator_id:'author-b'});other.post.kol_id='author-b';
  assert.equal(collateCreatorViews([first,other]).length,2);
});
test('missing identities, uncertain translations and mismatched sources cannot collapse',()=>{
  for(const change of [{creator_id:''},{post_id:''},{point_id:''},{ticker:''},{title:{en:'Same words.'}},
    {source_url:'https://www.youtube.com/watch?v=unrelated'},{source_url:'https://www.youtube.com.evil.test/watch?v=first'},
    {source_url:'https://name:password@youtube.com/watch?v=first'},{source_url:'javascript:alert(1)'}]){
    assert.equal(collateCreatorViews([view('first',change),view('first',change)]).length,2,JSON.stringify(change));
  }
  assert.equal(collateCreatorViews([{post:{},text:'Same summary'},{post:{},text:'Same summary'}]).length,2);
});
