// 个股主要财务指标
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from '../_shared/response';
import { httpGetJson, toSinaCode, toCleanCode } from '../_shared/http';

function fmtAmt(v: unknown) {
  const n = Number(v || 0);
  if (n >= 1e12) return (n / 1e12).toFixed(2) + '万亿';
  if (n >= 1e8) return (n / 1e8).toFixed(2) + '亿';
  if (n >= 1e4) return (n / 1e4).toFixed(2) + '万';
  return n.toFixed(2);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const code = toCleanCode(toSinaCode(getQuery(req, 'code', '')));
  const r = await httpGetJson(
    `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_F10_FINANCE_MAINFINADATA&columns=ALL&filter=(SECURITY_CODE=%22${code}%22)&pageSize=4&sortColumns=REPORT_DATE&sortTypes=-1&source=HSF10&client=PC`,
    'https://data.eastmoney.com/'
  );
  const list = r?.result?.data || [];
  const latest = list[0] || {};
  const prev = list[1] || {};
  const fmtNum = (v: any, d = 2) => v != null ? Number(v).toFixed(d) : '-';
  const yoy = (cur: any, prv: any) => {
    if (cur == null || prv == null || Number(prv) === 0) return '-';
    const rt = ((Number(cur) - Number(prv)) / Math.abs(Number(prv)) * 100);
    return (rt >= 0 ? '+' : '') + rt.toFixed(2) + '%';
  };
  const items = [
    { label: '报告期', value: latest.REPORT_DATE_NAME || '-' },
    { label: '每股收益', value: fmtNum(latest.EPSJB), color: Number(latest.EPSJB) >= 0 ? '#ff4d4f' : '#23c343' },
    { label: '每股净资产', value: fmtNum(latest.BPS) },
    { label: '营业总收入', value: fmtAmt(latest.TOTALOPERATEREVE) },
    { label: '营收同比', value: yoy(latest.TOTALOPERATEREVE, prev.TOTALOPERATEREVE), color: Number(latest.TOTALOPERATEREVE) >= Number(prev.TOTALOPERATEREVE) ? '#ff4d4f' : '#23c343' },
    { label: '归母净利润', value: fmtAmt(latest.PARENTNETPROFIT) },
    { label: '净利润同比', value: yoy(latest.PARENTNETPROFIT, prev.PARENTNETPROFIT), color: Number(latest.PARENTNETPROFIT) >= Number(prev.PARENTNETPROFIT) ? '#ff4d4f' : '#23c343' },
    { label: '净资产收益率', value: fmtNum(latest.ROEJQ) + '%' },
    { label: '毛利率', value: fmtNum(latest.XSMLL) + '%' },
    { label: '净利率', value: fmtNum(latest.XSJLL) + '%' },
    { label: '资产负债率', value: fmtNum(latest.ZCFZL) + '%' },
    { label: '流动比率', value: fmtNum(latest.LD) },
  ];
  json(res, 200, { data: { items } });
}
