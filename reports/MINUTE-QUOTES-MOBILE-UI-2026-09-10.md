# 分钟报价和长开页面恢复（2026-09-10）

根因：分钟worker未启用，页面使用上一完整交易日close；用户手机仍显示旧排序/导航。后台现有Yahoo元数据已经能给当天实际regular-session trade time，不需要LLM。

列表、Overview、stock和当前map统一采用同一份 `display_price`/quote选择规则：只有比已有完整收盘更新的有效报价才覆盖。超过三分钟或采集失败保留更新的dated quote并标Saved quote；同日已完成日线不被更早intraday trade覆盖。行情时间统一显示美东时区；YTD等日线指标与热力图保留收盘日期。历史map和原分析用价保持独立。

Quote-only map refresh只更新价格，不关闭作者组/改卡片；源内容变化仍保留原显式更新/校验流程。返回前台/恢复网络可重新读取已有共享endpoint，30秒防重复，无用户请求推理或采集。

健康长开页面也检查app-release.json：每五分钟、回前台/网络恢复时有界检查，至少60秒间隔、5秒deadline，hidden/offline不请求，新版本只显示一个按钮，用户点击后保持原URL正常刷新。账号、表单不自动清除。更早且尚无这段代码的页面仍需一次Safari自身刷新，点击旧版列表内的刷新只读API并不能替换旧JS。

本地633项前端回归全通过，新增独立map刷新测试23项全部通过（含源变更拒绝、卸载后不更新）。lint_copy和1274内链通过。隔离浏览器390px中文深色列表及320px英文浅色stock/map均无页面水平溢出，清楚展示当天真实时钟字段（合成数据，非行情覆盖证据）。报价文字与loss/missing分别检查，列表第一、Overview第二、列头排序及五项导航保留。生产发布和自然定时刷新待回填。

后端合约及完整来源研究在ducky-bot `reports/MINUTE-QUOTES-AND-MOBILE-RECOVERY-2026-09-10.md`。不能将本次验收声称为所有股票/作者均已完整覆盖。
