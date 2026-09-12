# 互动新手引导验收 · 2026-09-11

本地实现已完成，正式上线开关保持关闭。前端基线 `960ebb02`，分支 `codex/trial-onboarding-20260910`；配套后端基线 `846a469edccd4ee3accc9891cd58e07f774e16d4`。本轮代码尚未提交或部署。`source-manifest.json` 记录测试时修改/新增源文件的散列。

## 已通过

- 前端全部 686 个单元测试，默认构建与 trial 构建、内部链接及文案检查。
- Chromium 和 WebKit，各跑 320、390、430、1440 四种宽度，共八套十步流程，结果在 [browser-results.json](browser-results.json)。430px 使用中文和深色；320px 使用减少动态效果。
- 每套验证实际添加名单、导图加载和节点展开、图表范围改变、固定观点和原文、视频外链、日历和 insider 来源、返回名单；刷新仍保留完成进度，未重复添加股票；到期后研究 API 返回 402 并清除页面详情。
- 浏览器还检查高亮目标进入视野，说明卡与真实按钮不相交。单元测试另覆盖横屏/键盘缩小后的高度及请求尚未完成时 Esc 退出。

页面使用真实产品组件；认证、试用、名单和引导保存请求到本地后端。研究数据是明确标为 Synthetic QA / 合成的固定夹具，外部请求全部阻止。视频记为 `external_link_opened`，没有记成已播放。测试没有读取生产账号或发送通知。

## 截图

| 浏览器 | 320 英文 | 390 英文 | 430 中文深色 | 桌面英文 |
|---|---|---|---|---|
| Chromium | [查看](chromium-320-en-map.png) | [查看](chromium-390-en-map.png) | [查看](chromium-430-zh-map.png) | [查看](chromium-1440-en-map.png) |
| WebKit | [查看](webkit-320-en-map.png) | [查看](webkit-390-en-map.png) | [查看](webkit-430-zh-map.png) | [查看](webkit-1440-en-map.png) |

## 复现

以下在隔离工作树中运行。两个 QA 服务仅监听 loopback；不能用作生产服务。后端脚本自行创建临时数据库，关闭后可丢弃。

后端终端：

```sh
.venv/bin/python bin/tests/trial_browser_server.py
```

站点终端（`PY` 指向已安装站点依赖的 Python，例如配套后端 `.venv/bin/python`）：

```sh
npm ci
npx playwright install chromium webkit
openssl req -x509 -newkey rsa:2048 -nodes -days 2 -keyout /tmp/ducky-qa-tls-key.pem -out /tmp/ducky-qa-tls-cert.pem -subj '/CN=localhost'
PY=../ducky-bot-trial-onboarding-20260910/.venv/bin/python
"$PY" build.py --trial-access --api-base https://127.0.0.1:8766/qa-api
"$PY" tests/browser/serve.py --cert /tmp/ducky-qa-tls-cert.pem --key /tmp/ducky-qa-tls-key.pem
```

再开一个站点终端：

```sh
node tests/browser/trial-onboarding.mjs
```

测试结束关闭两个 QA 服务。默认本地构建用 `build.py --no-trial-access`；生产发布前需设置正式 API 地址，不能发布指向 loopback 的测试构建。正式启用要求 `site.config.json` 中 `trial_access: true`、在公开提交前运行 `trial_public.py public`，再构建；不要只改前端按钮。

后端实现说明、权益矩阵和上线次序见配套仓库 `reports/TRIAL-ONBOARDING-2026-09-10.md`。**尚未完成：真实已审核示例验收、真实支付及退款、实体 Android / iPhone、实际浏览器版本与软键盘/旋转、生产 CDN 清理后核对。** WebKit 自动化不能替代实体 iPhone。当前生产目录未开放购买，付款渠道可用性尚未完成验收，未启用到期收费。
