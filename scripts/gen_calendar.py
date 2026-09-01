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

# US market full-day closures that can land on a 3rd Friday / month-end (best-effort static set; the
# live API uses the authoritative market_calendar). Most-impactful case: Juneteenth on a 3rd Friday.
_MKT_HOLIDAYS = {
    "2026-01-01","2026-01-19","2026-02-16","2026-04-03","2026-05-25","2026-06-19","2026-07-03",
    "2026-09-07","2026-11-26","2026-12-25",
    "2027-01-01","2027-01-18","2027-02-15","2027-03-26","2027-05-31","2027-06-18","2027-07-05",
    "2027-09-06","2027-11-25","2027-12-24",
}

def _prior_trading(d: date) -> date:
    while d.weekday() >= 5 or d.isoformat() in _MKT_HOLIDAYS:
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


# ── verified 2026 macro schedule (official sources; NEVER guessed) ───────────
# FOMC: federalreserve.gov FOMC calendar (decision = day 2, 14:00 ET; SEP = dot-plot meeting).
# CPI: BLS / usinflationcalculator release schedule (08:30 ET). NFP: BLS Employment Situation,
# first Friday (08:30 ET). PCE: BEA Personal Income & Outlays (08:30 ET).
FOMC_2026 = {  # decision date -> is a Summary-of-Economic-Projections (dot-plot) meeting
    "2026-01-28": False, "2026-03-18": True, "2026-04-29": False, "2026-06-17": True,
    "2026-07-29": False, "2026-09-16": True, "2026-10-28": False, "2026-12-09": True,
}
CPI_2026 = ["2026-01-13","2026-02-13","2026-03-11","2026-04-10","2026-05-12","2026-06-10",
            "2026-07-14","2026-08-12","2026-09-11","2026-10-14","2026-11-10","2026-12-10"]
PCE_2026 = ["2026-09-30"]     # BEA-verified; the live API feed fills later months
PPI_2026 = ["2026-09-10"]     # BLS-verified (Aug PPI); PPI usually the day before CPI
RETAIL_2026 = ["2026-09-16"]  # Census-verified (Aug advance retail sales)
GDP_2026 = ["2026-09-30"]     # BEA-verified: 2026 comprehensive/annual GDP update begins
# market-implied odds for the NEXT decision (CME FedWatch snapshot; the live API refreshes daily)
NEXT_FOMC_ODDS = {"date": "2026-09-16", "cut_pct": 41, "as_of": "2026-08-25"}

def _first_friday(y, m):
    d = date(y, m, 1)
    return d + timedelta(days=(4 - d.weekday()) % 7)

def macro_events(start, end):
    out = []
    def m(d, title, title_en, note, note_en):
        if start <= d <= end:
            out.append({"date": d.isoformat(), "type": "macro", "title": title, "title_en": title_en,
                        "tickers": [], "note": note, "note_en": note_en})
    for ds, sep in FOMC_2026.items():
        d = date.fromisoformat(ds)
        extra_zh = " · 含点阵图/经济预测(SEP)" if sep else ""
        extra_en = " · with dot-plot / SEP" if sep else ""
        odds_zh = odds_en = ""
        if NEXT_FOMC_ODDS and ds == NEXT_FOMC_ODDS["date"]:
            odds_zh = f";市场隐含降息概率约 {NEXT_FOMC_ODDS['cut_pct']}%(截至 {NEXT_FOMC_ODDS['as_of']},每日更新)"
            odds_en = f"; market-implied cut odds ~{NEXT_FOMC_ODDS['cut_pct']}% (as of {NEXT_FOMC_ODDS['as_of']}, updated daily)"
        m(d, "美联储 FOMC 利率决议", "FOMC rate decision",
          "14:00 ET 公布利率决议,14:30 ET 主席发布会" + extra_zh + odds_zh + "。",
          "Rate decision 14:00 ET, press conference 14:30 ET" + extra_en + odds_en + ".")
    for ds in CPI_2026:
        m(date.fromisoformat(ds), "CPI 通胀数据", "CPI inflation",
          "08:30 ET 公布上月 CPI;高影响,常放大波动。", "August CPI at 08:30 ET; high-impact, moves the tape.")
    for y, mm in _months(start, end):
        nf = _first_friday(y, mm)
        m(nf, "大非农 · 非农就业 (NFP)", "Nonfarm payrolls (NFP)",
          "08:30 ET 公布上月非农就业与失业率;月度最重磅数据之一。",
          "Prior month's payrolls & unemployment at 08:30 ET — one of the biggest monthly prints.")
        # 小非农 ADP: the Wednesday 2 days before the NFP Friday, 08:15 ET (a preview of the big NFP)
        adp = nf - timedelta(days=2)
        m(adp, "小非农 · ADP 私营就业", "ADP private payrolls (小非农)",
          "08:15 ET 公布上月 ADP 私营部门就业;大非农的前哨,常引导预期。",
          "Prior month's ADP private-sector jobs at 08:15 ET — a lead-in to the big NFP.")
    # 初请失业金: every Thursday, 08:30 ET (weekly labor-market pulse)
    d = start + timedelta(days=(3 - start.weekday()) % 7)   # first Thursday on/after start
    while d <= end:
        m(d, "初请失业金", "Initial jobless claims",
          "08:30 ET 每周初请失业金人数;劳动力市场的高频脉搏。",
          "Weekly initial jobless claims at 08:30 ET — the high-frequency labor pulse.")
        d += timedelta(days=7)
    for ds in PPI_2026:
        m(date.fromisoformat(ds), "PPI 生产者物价", "PPI (producer prices)",
          "08:30 ET 公布上月 PPI;通胀的上游信号,常先于 CPI。", "Prior-month PPI at 08:30 ET; upstream inflation signal.")
    for ds in RETAIL_2026:
        m(date.fromisoformat(ds), "零售销售", "Retail sales",
          "08:30 ET 公布上月零售销售;消费需求的核心读数。", "Prior-month retail sales at 08:30 ET; core consumer-demand read.")
    for ds in GDP_2026:
        m(date.fromisoformat(ds), "GDP 年度修订", "GDP annual update",
          "08:30 ET;GDP 与国民经济核算年度综合修订。", "08:30 ET; annual comprehensive update of GDP / national accounts.")
    for ds in PCE_2026:
        m(date.fromisoformat(ds), "PCE 物价(美联储偏好通胀)", "PCE price index (Fed's preferred gauge)",
          "08:30 ET 公布;美联储最看重的通胀指标。", "08:30 ET; the Fed's preferred inflation gauge.")
    return out


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
        opex = _prior_trading(_third_friday(y, m))   # roll a holiday 3rd Friday (e.g. Juneteenth) back
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
    out.extend(macro_events(start, end))
    out.sort(key=lambda e: (e["date"], {"macro": 0, "witching": 1, "opex": 2, "rebal": 3}.get(e["type"], 4)))
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
