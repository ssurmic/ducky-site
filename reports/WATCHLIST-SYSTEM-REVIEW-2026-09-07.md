# 20–50 支自选股：共享证据与投递链路审计

审计日期：2026-09-07 UTC / 2026-09-06 PT。基线是后端集成工作树 `ducky-bot-watchlist-20260907` 的 `80e8210`，同时阅读在建的 `research_store.py`、`research_worker.py`、`research_api.py`。这些新增文件尚未提交，不能把草稿当成已上线能力。前端参考同名 watchlist 工作树。未读取生产数据库、未访问真实用户账户、未触发实际消息或部署。已阅读 AGENTS、SYSTEMDESIGN、WORKFLOW、DUCKY-IMPROVEMENTS 和历史证据设计。

结论：现有 SQLite、共享缓存和后台 producer 足以承载这一轮产品整合。优先修复事件事实被 Telegram 发送结果控制、回执被队列清理抹掉、长构建破坏单次计算这三处断点。暂无测量证据需要增加 Kafka、向量库或按用户复制研究文本。以下代码行号对应审计基线；后续提交会改变行号。

## 1. 当前真实链路

|阶段|已有实现与证据|边界|
|---|---|---|
|来源与身份|`bin/radar_store.py:18` 保存记录、修订及运行回执；`bin/signal_screens.py:129` 从共享公司目录、技术快照和雷达记录构建事实，校验来源、角色、金额、未来时间及身份|普通词、行业关联不能自动变成某家公司直接事件；尚未覆盖必须保留为空|
|历史文本|`bin/kol_source_cache.py:37` 的共享 source revision 以 video/revision hash 唯一保存完整原文；`bin/social_store.py:11`、`bin/snapshot_history.py:12` 已有历史观察|原文不需要为每个用户保存一份；回补价格不代表回补当年 IV、预测或消息送达|
|共享版本|快照 L1/L2、市场 epoch、SQLite build lease；研究索引草稿增加 observation/current/change/cursor/run|当前版本失效仍主要依赖时间；新研究索引不是全来源已上线证明|
|自选股读取|`bin/db.py:648` count+insert 同一短事务，50 上限；`db.py:682` owner+scope 查询；`api/app.py:1108` 私有读写路由|上限与身份隔离正确；基线列表仍逐个加载技术快照|
|跨源展现|`bin/briefing.py:73` 纯投影已有事实、市场及日历；`:208` 返回全部匹配股票，初始展示 3 条只是 UI 折叠|来源窗口、缺失股票、截断及会员权限均显式返回；不是每次访问重新分析|
|筛选触发|`bin/signal_screens.py:387` 同 config+watchset 每轮只评估一次；原子记录 edge、hit 和 enqueue，首轮静默、未知不重新触发、24h cooldown|来源事件触发目前仍挂在交易时段扫描后面|
|通道发送|旧 outbox 由 sender 排队，浏览器有 endpoint ownership 及 accepted receipt；博主通知已有独立持久 inbox、cursor、claim token 和频道回执|旧 firehose 与新博主通知链路的可靠性不一致|

## 2. 已确认缺陷与优先级

### P1 — Telegram 403 删除网站自选股并丢掉新的触发事件：已独立修复

基线 `bin/sender.py:143` 的 `_prune` 在 403 时删除 extra.ticker 对应的 watch；`bin/db.py:1985` 的 enqueue 在 `users.unreachable=1` 时直接返回 0。`watchlist/scripts/personal_scan.py:183` 先 enqueue 后设置提醒已触发，但返回 0 不抛错，因此 edge 被消费而没有持久消息。`sender.py:242` 还会在没有任何成功渠道时记为 sent。旧测试实际锁定了错误行为。

修复提交 **`286bb51313b5406b9c9673d07592de04837a03ef`**，独立工作树 `ducky-bot-channel-isolation-20260907`：封禁只暂停 Telegram，保留所有网站 watch/alert；enqueue 继续持久保存，浏览器照常发送；仅渠道接受后记 sent，其余沿用五次失败后的可观察死信。下一次 `/start` 恢复 Telegram。没有新建通用网站消息箱，也没有改动博主的独立投递队列。

验证：87 个 sender/bot/scanner 定向回归；完整 selftest **1465 passed、5 warnings、ALL GREEN**；arch_lint **0 failures / 0 warnings**；diff 检查通过。所有新增发送回归使用临时 DB、模拟 Telegram 和浏览器，无实际发送。

### P1 — 旧 firehose 的事件保存与 fanout 依赖板块发送，重试不能补齐用户尾部

`_tg.py:196` 全局 ledger 去重直接返回，发生在个人 fanout 前；`:258` 没有 Telegram route 直接返回，事实保存和网站用户 fanout 都不执行；`:301` 按 board 的 any_ok 记 ledger，随后才无条件 fanout。`bin/personal_push.py:107` 没有 event ID，`:136` 只处理 `uids[:2000]`，每人分别 enqueue，没有 durable cursor 或用户+事件唯一约束。

可由代码路径确定的失败场景：

1. 板块成功、部分个人 enqueue 失败：ledger 已记录，下次全局去重提前返回，失败的用户尾部不补发。
2. 板块全部失败、个人 enqueue 成功：ledger 不记录，源任务再次执行可重复 enqueue。
3. 网站仍运行但板块 route 未配置：整个网站 fanout 被跳过。
4. 某个 ticker 超过 2000 名订阅者：尾部静默丢弃，没有续跑游标。

最小方向：先保存共享不可变 event，再按稳定事件标识做可续跑收件人分页；短事务内同时推进 cursor 与个人消息唯一记录。发送成功与事件事实分开，渠道独立重试。可复用博主通知的设计，不需要新消息中间件。该项由主任务分割处理，本审计没有编辑 `_tg.py` 或 `personal_push.py`。

### P1 — 清理发送队列会伪造历史投递状态：已独立修复

`bin/signal_screens.py:372` LEFT JOIN outbox，`:380` 把有 outbox_id、无 sent_at、无 attempts 的结果显示为 queued。`bin/db.py:2090` 七天清理已发送行，`:2098` 也清理超过保留期的死信。清理后同一历史命中仍保留 outbox_id，却失去回执。

实际无网络复现输出：`{"before":"sent","purged":1,"after":"queued","expected_after":"sent"}`。这是状态错误，不是文案问题。历史查询也无法恢复被清理的失败原因。

修复提交 **`50dd5e85a5ef1278880c31c002ba98dd34a08fdb`**，基于 `286bb51`：永久最小 receipt 与短期消息文本/队列分离，记录 owner、message/event 关联、创建时间、真实接受时间、明确失败/取消状态；清理前仅迁移可证实状态。旧 sender 曾将 403 记 sent，因此旧 `sent_at` 仅保留为 `legacy_sent_at` / unknown，不能补造 provider acceptance。之前已清理的回执无法恢复。

`db.outbox_receipt(message_id,user_id)` 与 bounded batch reader 按账户读取；`signal_screens.hits` 使用一个批次，未知不再变成 queued。账号删除在原事务中清除个人 receipt。非个人的持久高水位防止旧 INTEGER PRIMARY KEY 队列清空后复用 ID，包括初次接入时仍留在筛选历史里的旧引用。`db.enqueue` 加入外层 `db._tx`，供事件 fanout 原子提交 cursor、队列和 receipt；应使用它而非无 ID 的直接 INSERT。

`cancel_outbox(ids,reason,connection=...,owns_claim=False)` 默认跳过其它 worker 的已领取消息，发送者可在实际运输前取消自己持有的 claim，已接受回执不可取消。清理在固定起始 ID 范围内，每 500 条释放写锁，没有每天只清 500 条的吞吐限制。永久记录不保存消息正文、用户条件、端点或 provider response；公开导出同时排除 receipt 和高水位。所有新 mutation 路径遵守 TEST_MODE 无写。

验证：新增 **13** 个临时 DB 回归，覆盖 sent/failed/pending/unknown 清理、legacy 兼容、取消与 claim、ID 复用、跨账号引用、删号及清理回滚、公开导出、冷库只读和 TEST_MODE；最终完整 selftest **1478 passed、5 warnings、ALL GREEN**，arch lint **0/0**，diff 检查通过。旧 crypto/profile 测试以 TEST_MODE 同时要求数据库写入的冲突已改成显式 HTTP 拦截和真实临时库语义。两个独立修复均未 push、未部署、无真实发送。

尚需主任务统一旧 sender 的其它错误分支：浏览器已经接受但 Telegram 429/500/transport error 时，基线仍可能记 failed/pending。403 已由第一个提交修复；本 receipt 提交不编辑 sender，避免与并行事件 dispatcher 整合冲突。回执无法自行推断未传给 `db.mark_sent` 的接受，主任务需在发送层测试“任意符合条件渠道接受”的统一完成条件。

### P2 — 缓存单次计算在长任务/锁异常时失效，事件新版本不能及时使 L1 失效

`bin/snapcache.py:205` 用 60 秒 lease，但 scanner 等待 30 秒后 `:245` 直接重复构建；`:214` 获取 lease 异常也当作获得锁继续构建。`:195` semaphore 仅约束 builder=api，且是进程内。已有 `test_scanner_still_polls_then_builds_last_resort` 明确测试这种退路，所以这是已知设计冲突，不能称测试未覆盖。

`snapcache.py:299` 命中本地 L1 就返回，除 benchmark 变化检查外不对比 source revision；`:271` 先更新 L1 再写 L2，写入失败被忽略。可能出现多个 producer 重算同一股票，以及只有当前进程看见、没有可靠历史落盘的结果。该项未做生产负载压测，不能声称实际频率或成本。

建议先改 lease 失效策略：无法取得 lease 就有界延后，长任务续租并在写入时校验 owner/version，过期 producer 不覆盖新版本。共享事实写入成功后发布 dependency version；L1/页面视图按 ticker+source version 失效，不能因一个 SEC 新事件重算全部价格/IV。保留旧版本，缺失时显示旧数据时间与 pending，不填零。

### P2 — 50 个冷自选股与当前 warm queue、全量扫描存在容量错配

`bin/prewarm.py:35` 默认最多 40 支，其中 `:39` 的 core 优先占 20 支；`watchlist/scripts/personal_scan.py:64` 则读取所有用户所有 watch/alert 股票，6 worker 全部完成后 `:272` 才开始提醒判断。`bin/coldbuild.py:3` 是进程内单 worker、16 个不同 key 的提示队列，重启丢提示。`api/app.py:1113` 添加 watch 仅保存，等待后续 snapshot GET 提交 warm。基线前端 watchlist 每股启动 snapshot 请求并最多尝试 6 次，50 支冷股理论上可形成最多 300 次请求；这只是代码上界，不是已测流量。

建议给自选股一个批量只读 context 接口，返回每支股票已有价格/技术/事件/IVHV/情绪的独立状态与时间、整体 dependency version。一次添加立即返回完整占位行，并把 ticker 放入共享、有界、可续跑的 warm 队列；公平轮转冷门股票，显式区分 queued/building/stale/missing/failed。热力图使用这份轻量结果，颜色只表达有时间口径的数值，缺失独立显示。

价格扫描可以交易时段运行；但 `personal_scan.py:260` 的早退同时阻止 `:277` 的共享事件筛选。盘后披露/博主新内容应由来源 revision 触发纯规则投影，不需等到下一次股价构建完成。技术判断依旧检查价格 session 的新鲜度，不能把旧 RSI 当成盘后新信号。

## 3. 在建整合的正确方向与需要验证的边界

截至阅读时，另一任务已新增 research observation/current/change/cursor/run 表、300 条来源页、2500 条 snapshot 上限和 Pro 只读 API。保存一页与推进 cursor 在同一短事务；初次索引/回补静默；修订仅时间变化不产生 material change；没有网络或 LLM，原文保留在 source-owned store。这解决的是共享证据索引，不应被本报告重复列成“完全没有跨源系统”。

草稿仍需完成后验证：

- `research_worker.py` 当前接入 snapshots、radar、social、creator；STREAMS 中的 calendar/digest 尚未等于有 producer。全来源完成状态要逐项公开。
- 同一 source timestamp 多行、相同时间修订、离线重启、分页期间新写入、A→B→A、迟到修订、source withdrawal 均需重放测试；cursor 推进不能掩盖被拒绝证据，也不能把失败运行显示 ready。
- snapshot 每轮扫描前 2500 个 ticker 的尾部、source 全局页落后于热门新事件时，必须有 backlog/覆盖和公平性证据，不能仅统计 indexed 数量。
- 草稿 `research_store.context` 只对 vibe 计算两小时 stale；price/technical/options 需要各自 session、expiry 和可用性约束。API 返回不能把“索引已完成”当“数据最新”。
- 草稿明确 `outbound_delivery='not_enabled'` 是诚实边界；研究 changes 的持久化不等于已通知，也不等于可交易信号。
- 用户 view cache 必须把当前 entitlement、watchlist version 和会话 owner 包含进读取边界；共享事实本身不按用户复制。

## 4. 隔离与已有测试覆盖

当前 owner 查询、50 上限的同事务检查、前端 session epoch 防旧请求回填是正确基础；本轮没有发现已证实跨账户事实泄露。浏览器发送 `bin/webpush.py:95` 在实际发送前重查 endpoint 绑定，`:139` 以稳定 outbox tag 持久去重；这也是 403 修复可以复用它而无需另造发送器的原因。

博主 worker `bin/creator_notification_worker.py:389` 独立 claim，发送前验证 source withdrawal、当前会员与偏好、目的地所有权；已包含过期 claim、崩溃续跑、负数网站账户 ID、分页、多订阅、解绑、账号删除回滚、历史静默、更正暂停等测试。不能把旧 firehose 的缺口泛化为整个系统都没有可靠队列。

|测试文件|已覆盖|本次或下一轮补充|
|---|---|---|
|`test_sender.py`、`test_bot.py`、`test_personal_scan.py`|限流、失败、claims、编译规则、提醒去重；本次新增 TG 封禁与浏览器/账户隔离|新最小 receipt 的持久状态和清理兼容|
|`test_creator_notifications.py`、`test_creator_notification_worker.py`|持久分页、唯一 inbox、目的地回执、current access、账号删除、撤回、TEST_MODE|用于旧 firehose 改造的验收模板|
|`test_signal_screens.py`|同股 AND、来源日期、未知、owner、事务 edge、首轮静默、24h cooldown|七天 purge 后 sent/failed/unknown；非交易时段事件投影|
|`test_snapcache.py`、`test_coldbuild.py`|正常单次构建、L1/L2、API lease miss、16 项队列恢复|跨进程长 lease、DB 锁失败、版本失效、50 个冷 ticker 公平完成|
|`test_briefing.py`|全部股票、会员延迟窗口、原始日期精度、禁止请求构建/发送|20/50 股票批量读的请求数与字节/延迟边界|
|`test_webpush_delivery.py`、历史/来源测试|订阅绑定、receipt 去重、来源历史与 TEST_MODE|生产投递只可在获授权的隔离验收环境另测|

## 5. 推荐验收顺序

1. 整合 `286bb51`，补最小持久回执；锁定“设置保留、真正接受才 sent、失败可观察、账户删除清理”。
2. 将旧 firehose 改为事实先持久化、事件分页 fanout 可重放；用模拟 2001 个订阅者、写入失败、重启、board 全失败与无 route 证明不丢不重。
3. 完成共享 research projection 与批量 watchlist context。20/50 支时记录 SQL 次数、响应字节、P50/P95 和后台新增构建数；不能凭页面顺滑声称 scalable。
4. 统一 revision 失效与来源触发，在价格未知、旧 IV、未覆盖情绪、盘后披露、源更正时验证 UI 与提醒使用同一证据版本。
5. 保留 source/publication、first observation、price session、processing、provider accepted 时间及完整损失；大文本共享、按 hash 引用。先量测每来源日增量和大字段重复字节，再决定压缩/归档阈值。

本报告没有更改超跌定义、策略权重、同业分类或收益算法，因此不涉及替换基线收益比较。移动端 UI 的真实浏览器矩阵由并行 UI 任务负责；这里没有宣称真实 iPhone、生产高并发或实际通知验收。

## 6. 前端状态收尾验收

2026-09-07 前端工作树同步到当时最新 main `47e3749`（包含 `a865794` 的共享研究入口）。实际翻译源是 `i18n/zh.json`、`i18n/en.json`；补齐“无法确认投递状态 / Delivery status unavailable”和“已取消提醒 / Notification cancelled”。雷达 LIVE 来源观察使用独立说明，收录不证明渠道送达；显式 `source_published_at=null` 或只有 first_observed 时，发布时间显示未知。有来源发布时间则保留其日期，旧补录卡仍使用补录说明。

17 个雷达/筛选定向 DOM 回归、完整 214 个 Node 测试通过；双语构建渲染 20 页，翻译键一致；资源隔离检查共 5 项：4 项通过、1 项原有条件检查跳过。文案扫描 1717 文件通过，744 条链接通过，diff 检查通过。测试使用模拟响应，没有真实账户或消息操作。本轮没有重新执行物理 iPhone 验收，日历及 heatmap 代码不在此次提交范围。Demo 文档明确当前约 35–40 秒短片、116 秒展开案例参考、未实测的两分钟简报阅读目标，以及正式名称 Vibe Check（社媒热度）。
