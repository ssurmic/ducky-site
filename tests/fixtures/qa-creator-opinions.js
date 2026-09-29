// SYNTHETIC public contract fixture. No production source text, data or credentials.
export function opinionFixture(i=1,extra={}){
 const video='sample'+String(i).padStart(5,'0'),id='sample-opinion-'+i;
 const row={id,publication_id:'sample-publication-'+i,publication_revision:i,publication_hash:'a'.repeat(64),point_id:'sample-point-'+i,post_id:i,
  creator_id:'sample-creator',author:'Sample Research',channel_id:'sample-channel',video_id:video,content_id:'content:v1:youtube:'+video,
  title:'Synthetic source example '+i,topic:'macro',subject:{zh:'融资环境',en:'Funding conditions'},speaker:{kind:'creator',name:null},
  stance:'neutral',intent:'conditional',relation:'none',claim:{zh:'作者认为，如果融资成本下降，风险偏好可能改善。',en:'The creator says risk appetite may improve if funding costs decline.'},
  conditions:{zh:'如果融资成本下降',en:'If funding costs decline'},horizon:{zh:'下个季度',en:'Next quarter'},ticker:null,stock_navigation_eligible:false,
  published_at:'2026-09-28T20:00:00Z',observed_at:'2026-09-28T20:01:00Z',qualified_at:'2026-09-28T20:02:00Z',published_to_product_at:'2026-09-28T20:03:00Z',
  original_source_url:'https://www.youtube.com/watch?v='+video+'&t=32s',navigation_seconds:32,navigation_time_basis:'model_navigation_hint',
  source_kind:'native_video',capability:'reviewed_video_summary',status:'qualified',repeat_group_id:'sample-repeat-'+i,independent_support_key:'sample-author',
  research_evidence_ready:false,support_eligible:false,reproducibility:'external_mutable',display_group_id:'sample-group-'+i,...extra};
 row.records=extra.records||[{...row}];row.record_count=row.records.length;
 return row;
}
export function opinionsFixture({topic='all',ticker=null,creator=null,before=null,revision='a'.repeat(64),items=null}={}){
 const repeated=opinionFixture(1),earlier={...repeated,video_id:'sample00007',id:'sample-opinion-7',published_at:'2026-09-22T20:00:00Z',original_source_url:'https://www.youtube.com/watch?v=sample00007&t=32s'};
 repeated.records=[repeated.records[0],earlier];repeated.record_count=2;
 const all=items||[repeated,
  opinionFixture(2,{stance:'bear',claim:{zh:'作者担心融资成本持续偏高，会压缩企业支出。',en:'The creator is concerned that persistently high funding costs could constrain business spending.'},conditions:{zh:'融资成本保持高位时',en:'If funding costs remain elevated'}}),
  opinionFixture(3,{stance:'bull',ticker:'NVDA',topic:'company',relation:'subject',stock_navigation_eligible:true,subject:{zh:'英伟达需求',en:'NVIDIA demand'},claim:{zh:'作者看好需求，但订单兑现仍取决于客户预算。',en:'The creator is positive on demand, conditional on customer budgets turning into orders.'}}),
  opinionFixture(4,{stance:'bear',ticker:'NVDA',topic:'company',relation:'subject',stock_navigation_eligible:true,subject:{zh:'利润率风险',en:'Margin risk'},claim:{zh:'作者认为新增产能可能在收入兑现前压低利润率。',en:'The creator says added capacity could weigh on margins before revenue materializes.'}}),
  opinionFixture(5,{navigation_seconds:null,navigation_time_basis:'unavailable',original_source_url:'https://www.youtube.com/watch?v=sample00005',speaker:{kind:'guest',name:'Sample guest'},intent:'historical',conditions:null,horizon:null}),
  opinionFixture(6,{topic:'sector',subject:{zh:'半导体行业',en:'Semiconductors'}})];
 const selected=all.filter(row=>(topic==='all'||row.topic===topic)&&(!ticker||row.ticker===ticker)&&(!creator||row.creator_id===creator));
 return {schema:'creator-opinions/1',status:selected.length?'ready':'empty',revision,generated_at:'2026-09-29T05:02:00Z',items:before?[]:selected,next_cursor:null,
  coverage:{publications_scanned:all.length,publication_limit:2000,points_returned:all.length,truncated:false,scope:'bounded_published_native_opinions'},
  selection:{topic,scope:'discover',ticker,creator,following:null},matched_points:selected.length,matched_views:selected.length,access:'reviewed_preview'};
}
