---
name: sector-scan
description: 按表格整理板块热度与自选重叠（不提供买卖建议）
slash: scan
triggers:
  - 板块扫描
  - 信息扫描
tools:
  - leek_get_sector_heat
  - leek_get_watchlist
  - leek_get_flash_news
---

# 板块 / 信息扫描

1. 使用下方「系统预取」中的板块热度、自选列表与快讯数据。
2. 输出 Markdown 表格：板块名 | 涨跌幅 | 净流入 | 与自选重叠标的（如有）。
3. 仅陈述数据，标注 asOf/source，不做买卖结论。
