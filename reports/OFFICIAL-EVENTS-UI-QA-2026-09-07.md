# 官方事件、收件箱与 50 票热图前端验收

2026-09-07。改动基于 frontend `8954644`，未 push / deploy；生产发布及真实 backend 联调由主任务整合。此报告补充已有浅深色审计，不把桌面浏览器中的手机宽度测试写成实体 iOS / Android 验收。

## 已修复

- 组合筛选增加 `index` / `news` 条件及双语标签；保存条件回填、预览与覆盖说明保留两种类型。默认条件、匹配规则与通知勾选均保持原值。
- 雷达原 `ALL_KINDS` 漏掉 `index` / `news`，新增指数调整、公司新闻类别与中英标签、现有本地图标。默认与具体分类查询均包含真实 kind。
- 官方记录直接读取 `extra.event_type/action/index_name/effective_at/effective_session/effective_timezone`。指数卡显示生效日/时段及纳入或移出含义；说明跟踪指数的资金可能调仓，并不保证股价方向。公司新闻说明需核对原文，不能只凭标题推断财务影响。
- 官方小写 `live` 与 legacy `LIVE` 使用观察说明；`source_revision` / `source_corroboration` 分别说明来源修订/补充。未知发布时间不取首次观察时间。没有原始通知回执的来源记录不宣称送达。
- 雷达官方事件可跳同 ticker 研究记录和日历。指数深链 `#/calendar?ticker=BE&date=2026-09-21` 实点进入生效日，两周/整月仍一致。安全登录返回保留合法日历日期并丢弃任意额外参数。
- 日历将 `index_change` 映射到现有 rebal 类别、筛选、样式与 `index` 研究类型；保留官方 time/time_en/source_url。依事件 ID 去重，避免标题修订重复，也不把不同成分股合并。免费用户展开仍不请求付费研究 API。
- `#/updates` 增加“自选股事件”，独立读取 Pro `GET /signals/inbox?limit=30&before_id=…`。其分页、加载失败重试与博主收件箱独立；没有 unread/read 语义。`sent` 显示“通知服务已接收”，不当作已读；queued/failed/cancelled/unknown 各自显示。来源修订或不可用时隐藏旧标题及原来源链接，保留同股研究/雷达入口。时间详情区分来源发布、首次观察、通知收录、生效日。401/402、退出/换号、卸载与迟到响应不恢复前账户数据。

## 热图几何修复

初测 390px、50 支市值在 2–51B 之间的隔离数据，旧 container query 把全部 50 格文字隐藏。仅降低隐藏阈值仍不够：旧 JS 固定按 `1000 × 600` 排格，再以百分比映射到手机近正方形容器，产生大量细长格。

最终使用实际容器宽高做 squarify，仅改变排布，不改变市值面积比例或涨跌数据。按尺寸变动的 ResizeObserver 重排现有节点，尺寸相同不计算，不请求行情。旧控制节点和焦点保留；卸载时断开 observer。小格先隐藏额外行，代码保持 12px；测量自然文字宽高，放不下才隐藏。下方完整股票及数值按钮继续可用。

使用 50 个常见真实 ticker 名称、**合成**相近市值（10B 至 8.04B）、合成正负/零/缺失涨跌值测试。数值是 UI fixture，绝不代表这些股票实际行情或实际持仓。

| 手机宽度 | 语言/主题 | 格数 | 可见代码 | 其中 3–5 字代码 | 裁切 | 完整下方按钮 |
|---|---|---:|---:|---:|---:|---:|
| 390 | zh/en × light/dark，各一遍 | 50 | 50/50 | 48/48 | 0 | 50 |
| 320 | zh/en × light/dark，各一遍 | 50 | 47/50 | 45/48 | 0 | 50 |

320px 中 GOOGL、SMCI、AMKR 所在物理格不足，名称保留下方；没有缩成更小字体或扩大市值面积。所有八组合 `scrollWidth == clientWidth`。同一个浏览器页面从 320 改到 390 后自动从 47 变成 50 个可见代码；只发生初始一个 `/watchlist` GET，无新行情请求。负值 `-12.50%`、真零 `0.00%`、缺失 `—` 在文字入口中保持不同。

最终截图：[中文浅色 390](official-ui-20260907/zh-light-watch50-390-squarify.png)、[英文浅色 320](official-ui-20260907/en-light-watch50-320-squarify.png)、[英文深色 320](official-ui-20260907/en-dark-watch50-320-squarify.png)。不含 `squarify` 的 `watch50.png` 是修复前证据。

## 实际浏览器矩阵

本机 Chrome、127.0.0.1 隔离静态 server、固定 390/320px iframe，加载实际 app 源码/CSS/构建双语 shell；显式 `data-theme`。所有 fetch 拦截到只读 fixture，非 GET 或外部 origin 一律拒绝。没有登录真实账号、修改数据库、发通知、启用推送或跟随外部来源链接。

| 页面/场景 | 实测组合 | 结果 |
|---|---|---|
| 指数卡，BE 官方来源 | 390，zh/en × light/dark | action、9/21 盘前 ET、独立来源日期/观察时间、同股研究/日历链接；无横向溢出 |
| 公司新闻，发布时间 null | 390，zh/en × light/dark | 明确未知；小写 live 不显示历史补录说明；正文/链接可读 |
| 自选股事件收件箱 | 390，zh/en × light/dark | 五种状态齐全；修订/不可用隐藏旧标题；不声称已读 |
| 收件箱 | 320，en light | 时间详情及按钮换行可读；宽度 320/320 |
| 官方日历 | 390 zh light 实点深链；320 en light Free | 定位 9/21，14 格；rebal 内容/来源保留；免费端仅 public calendar 与静态 GET，没有 `/calendar/context` 或 `/calendar/links` |
| 组合筛选新增条件 | 320，en light / zh dark | 实际勾选指数调整、公司新闻，清楚可读；未提交预览或保存 |
| 50 票列表/选中详情 | 390，zh/en × light/dark | 初始仅 `/watchlist`；选中 BE 才一个 `/snapshot/BE`；资料不足仍保留研究入口 |
| 50 票热图 | 上表八组合 + 同页尺寸切换 | 面积不变、文字可读性与请求数见上 |

完整 DOM 数字与文字在 [matrix.json](official-ui-20260907/matrix.json)。示例：[浅色指数卡](official-ui-20260907/en-light-index.png)、[浅色收件箱](official-ui-20260907/en-light-inbox.png)、[免费 320 日历](official-ui-20260907/en-light-calendar-free-320.png)。所有截图只是隔离测试，不证明历史提醒实际送达。

BE 来源样本来自 backend 官方适配器保存的 `canonical-be-source-record.json`，本报告冻结为 [source.json](official-ui-20260907/source.json)；来源发布 2026-09-04，首见 2026-09-07，生效 2026-09-21。移出/未知时段、未知新闻发布时间以及各投递状态为合成边界案例。

## 回归与边界

- 全量 Node：225 passed。新增验证：官方时段/动作/日期未知、指数稳定 ID、archive kinds、来源小写/修订、日历深链与免费门禁、inbox 五状态/重试同 cursor/刷新第一页/402/迟到换号、50 票不重叠精确面积/手机长宽比/重排保留焦点。登录日期参数，以及官方事件条件保存回填/预览/覆盖说明/默认和通知 opt-in 不变补测通过。
- 双语构建 20 页、key 对齐；build asset checks 4 passed / 1 条件跳过；copy lint 与 744 links 通过。最终 git diff 无空白错误。公共 calendar 的仅生成时间改动不提交。
- 未实测真实推送/阅读、真实账户/支付、实体 iOS/Android、线上最新事件缓存和官方后台定时抓取。这些需要发布任务单独验证。
- 官方 calendar adapter 的 `schedule_status=source_scheduled` 已由主任务补上；本 fixture 有意保留缺失状态，前端仍如实显示未逐项确认，不能自行补造。主任务另行验证实际服务最新状态。

复现：先运行 `build.py`，再执行 `python3 reports/official-ui-20260907/serve_fixture.py --port 8846`。只绑定 loopback；打开其打印的 URL。更换 `lang=zh/en`、`theme=light/dark`、`width=320/390`、`view=boards/calendar/updates/watchlist`。UI fixture 及截图不随生产 public 目录发布。
