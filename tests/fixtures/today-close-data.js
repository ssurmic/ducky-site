// Entirely synthetic, fixed-date acceptance data; never used by the production build.
export function closeMacro(){
  const events=[
    {date:'2026-09-28',type:'earnings',title:'示例公司 MU 财报',title_en:'Synthetic MU earnings',tickers:['MU'],timing_status:'after_close'},
    {date:'2026-09-28',type:'earnings',title:'示例公司 AMD 财报',title_en:'Synthetic AMD earnings',tickers:['AMD'],timing_status:'unconfirmed'},
    {date:'2026-09-29',type:'macro',title:'合成示例 CPI 公布',title_en:'Synthetic CPI release',time_et:'08:30',timing_status:'scheduled'},
    ...['NVDA','AVGO','COST','NKE','GLW'].map(ticker=>({date:'2026-09-29',type:'earnings',title:ticker+' 示例财报',title_en:ticker+' synthetic earnings',tickers:[ticker],timing_status:'before_open'}))
  ].map((event,i)=>({...event,id:'synthetic-event-'+i,time_zone:'America/New_York',source_observed_at:'2026-09-28T19:00:00Z',schedule_status:'source_scheduled',
    url:'https://example.com/scheduled-event/'+i,note:'纯合成验收日程，非实际公布日期。',note_en:'Synthetic acceptance schedule, not an actual release date.',
    impact:{zh:'若公布结果偏离预期，可能改变盈利或利率预期，具体方向仍需看结果。',en:'A result that differs from forecasts could change earnings or rate expectations; the direction depends on the result.',basis:'event_type_rule'},
    impacts:[{title:'保留条件',title_en:'Retained condition',body:'还需查看前值修订，不能只看标题数字。',body_en:'Review revisions as well as the headline figure.',url:'https://example.com/method'}]}));
  return {schema:'macro-beta/1',status:'ok',as_of:'2026-09-28',observed_at:'2026-09-28T20:02:00Z',
    latest:{date:'2026-09-28',funding_score:50,metrics:{nominal_10y:5.24,vix:16.1}},
    observed:[{date:'2026-09-25',qqq_index:100,spy_index:100},{date:'2026-09-28',qqq_index:98.93,spy_index:99.26}],
    digest:{status:'ready',edition:'close_snapshot',session:'2026-09-28',next_session:'2026-09-29',generated_at:'2026-09-28T20:02:00Z',
      publication:{phase:'initial',basis:'near_close_quotes',data_as_of:'2026-09-28T20:00:12Z',expected_close_at:'2026-09-28T20:00:00Z',coverage:{available:17,expected:19,missing:[{ticker:'DIA',reason:'unavailable'},{ticker:'XLB',reason:'unavailable'}]}},
      close:{zh:'合成示例：QQQ -1.07%，SPY -0.74%；这是收盘附近采集的读数。',en:'Synthetic: QQQ -1.07%, SPY -0.74%; these readings were captured near the close.'},
      sectors:{zh:'合成示例：板块读数尚有缺项。',en:'Synthetic: some sector readings are unavailable.'},
      macro:{zh:'合成示例：宏观数据各有来源日期。',en:'Synthetic: macro data retain their individual source dates.'},
      tomorrow:{zh:'明日9月29日，共收录8项日程；完整日期与影响见下方。',en:'September 29 is the next calendar day. Eight saved events are listed below with their dates and impacts.'},
      preview:{schema:'market-digest-preview/1',anchor_session:'2026-09-28',calendar_day:'2026-09-29',next_session:'2026-09-29',timezone:'America/New_York',observed_at:'2026-09-28T20:01:00Z',coverage:{status:'partial',sources:{calendar:{status:'unverified',as_of:'2026-09-28T19:00:00Z'}}},events}}};
}
