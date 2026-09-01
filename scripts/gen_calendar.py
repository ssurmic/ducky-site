#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""gen_calendar.py — self-contained STATIC calendar fallback for the site.

The live calendar comes from the API (api.duckybot.app/public/calendar.json, enriched with
grounded history from the DGX). But the API/tunnel can be down, and the calendar must NEVER
go blank — so we ship a deterministic fallback with the site: every index rebalance / OPEX /
witching / month-end date is pure date math, computed here at build time with zero network.
The frontend tries the API first and falls back to this file.

Emits the same event shape the API does: {date,type,title,title_en,tickers[],note,note_en}.
'type' ∈ opex | witching | rebal (matches calendar.js icons/filters). Factual dates only —
no directional copy. Specific index add/delete NAMES (e.g. today's MSCI top-weight change)
are published by the index provider ~1 week ahead and land via the API / post-mortem KB;
this fallback carries the SCHEDULE + the affected index/ETF so the day is never a surprise.
"""
from __future__ import annotations
import json, os, sys
from datetime import date, timedelta, datetime, timezone

# US market holidays are ignored for the fallback's month-end nudge (good enough; the API is
# exact). Weekend-adjust only.
def _weekday_back(d: date) -> date:
    while d.weekday() >= 5:
        d -= timedelta(days=1)
    return d

def _third_friday(y: int, m: int) -> date:
    d = date(y, m, 1)
    d += timedelta(days=(4 - d.weekday()) % 7)   # first Friday
    return d + timedelta(days=14)

def _last_friday(y: int, m: int) -> date:
    d = date(y, m, 1) + timedelta(days=31)
    d = d.replace(day=1) - timedelta(days=1)     # last day of month m
    while d.weekday() != 4:                       # walk back to Friday
        d -= timedelta(days=1)
    return d

def _last_trading_day(y: int, m: int) -> date:
    d = (date(y, m, 28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    return _weekday_back(d)

def _months(start: date, end: date):
    y, m = start.year, start.month
    while date(y, m, 1) <= end:
        yield y, m
        m += 1
        if m > 12: m, y = 1, y + 1

def build(days: int = 90, backfill: int = 5) -> list[dict]:
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=backfill)   # cover recent past + absorb UTC/local date skew
    end = today + timedelta(days=days)
    out: list[dict] = []
    def add(d, typ, title, title_en, tickers, note, note_en):
        if start <= d <= end:
            out.append({"date": d.isoformat(), "type": typ, "title": title, "title_en": title_en,
                        "tickers": tickers, "note": note, "note_en": note_en})
    for y, m in _months(start, end):
        opex = _third_friday(y, m)
        add(opex, "opex", "月度期权交割 · OPEX", "Monthly OPEX", [],
            "月度股票期权到期;gamma 墙常在此前后移动或减弱。",
            "Monthly stock options expire; gamma walls often shift or weaken around it.")
        if m in (3, 6, 9, 12):
            add(opex, "witching", "四巫日 · 标普/纳指季度调仓", "Quad witching · S&P/Nasdaq rebalance",
                ["SPY", "QQQ"],
                "指数期货/期权 + 个股期货/期权同时到期,标普 & 纳斯达克季度成分调整同日生效,尾盘量常暴增。",
                "Index + single-stock futures & options all expire; S&P & Nasdaq-100 quarterly rebalances take effect the same day — closing volume usually spikes.")
        me = _last_trading_day(y, m)
        add(me, "rebal", "月末调仓 · 养老金/基金再平衡", "Month-end rebalance (pension/fund)",
            ["SPY"],
            "月末指数与养老金/基金再平衡资金流,尾盘最后几分钟常有巨量买/卖盘。",
            "Month-end index + pension/fund rebalancing flows; the last minutes of the session often see outsized buy/sell prints.")
        # MSCI reviews: quarterly (Feb/Aug) + semi-annual (May/Nov), effective the last business day
        if m in (2, 5, 8, 11):
            semi = m in (5, 11)
            add(me, "rebal",
                "MSCI " + ("半年度" if semi else "季度") + "指数审议生效",
                "MSCI " + ("Semi-Annual" if semi else "Quarterly") + " Index Review effective",
                ["ACWI", "EFA"],
                ("MSCI " + ("半年度" if semi else "季度") + "成分调整生效;权重最大的纳入/剔除名单常在尾盘出现巨量买卖(名单由 MSCI 提前约 2 周公布)。"),
                ("MSCI " + ("semi-annual" if semi else "quarterly") + " constituent changes take effect; the largest additions/deletions often see outsized closing prints (MSCI publishes the list ~2 weeks ahead)."))
    # Russell reconstitution — effective after the close on the last Friday of June (biggest volume day of the year)
    for y in {today.year, end.year}:
        rr = _last_friday(y, 6)
        add(rr, "rebal", "Russell 指数年度重构生效", "Russell annual reconstitution",
            ["IWM", "IWB"],
            "罗素指数年度重构收盘后生效——通常是全年成交量最大的一天;小盘股纳入/剔除资金流集中。",
            "Russell indices reconstitute after this close — typically the highest-volume day of the year; small-cap add/delete flows concentrate here.")
    # Nasdaq-100 annual reconstitution — effective before open on the 3rd Friday of December
    for y in {today.year, end.year}:
        nd = _third_friday(y, 12)
        add(nd, "rebal", "纳斯达克 100 年度重构生效", "Nasdaq-100 annual reconstitution",
            ["QQQ"],
            "纳斯达克 100 年度成分调整生效(名单 12 月中旬公布);被剔除/纳入的科技股常有资金进出。",
            "Nasdaq-100 annual constituent changes take effect (list published mid-December); tech names added/removed often see flow.")
    out.sort(key=lambda e: (e["date"], {"witching": 0, "opex": 1, "rebal": 2}.get(e["type"], 3)))
    return out

def main() -> int:
    days = 90
    dst = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "calendar.json")
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    doc = {"schema": "calendar/1", "generated_at": now, "as_of": now, "window_days": days,
           "partial": True, "source": "static-fallback", "events": build(days)}
    os.makedirs(os.path.dirname(dst) or ".", exist_ok=True)
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
    print(f"[gen_calendar] wrote {len(doc['events'])} deterministic events → {dst}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
