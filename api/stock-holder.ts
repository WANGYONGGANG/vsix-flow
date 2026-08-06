// 股东户数（最近 N 期，数据中心 F10）
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from './_shared/response';
import { httpGetJson } from './_shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  const raw = getQuery(req, 'code');
  const code = String(raw || '').replace(/^(sh|sz|bj)/i, '');
  if (!code) { json(res, 200, { data: { list: [] } }); return; }

  const url = `https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=END_DATE&sortTypes=-1&pageSize=10&pageNumber=1&reportName=RPT_F10_EH_HOLDERNUM&columns=ALL&filter=(SECURITY_CODE%3D%22${encodeURIComponent(code)}%22)`;
  const r = await httpGetJson(url, 'https://emweb.securities.eastmoney.com/');

  const rows: any[] = r?.result?.data || [];
  const list = rows.map((x: any) => {
    const hn = x.HOLDER_NUM ?? x.HOLDERNUM ?? null;
    const pre = x.PRE_HOLDER_NUM ?? x.PREHOLDERNUM ?? null;
    const ratio = (hn != null && pre != null && pre > 0) ? ((Number(hn) - Number(pre)) / Number(pre) * 100) : NaN;
    return {
      endDate: x.END_DATE || x.REPORT_DATE || '',
      holderNum: Number(hn) || 0,
      preHolderNum: Number(pre) || 0,
      holderNumRatio: isNaN(ratio) ? 0 : ratio,
      closePrice: Number(x.CLOSE_PRICE || x.CLOSE || 0),
      avgHolding: Number(x.AVG_HOLDING_NUM || x.AVG_HOLD || 0),
      totalShare: Number(x.TOTAL_SHARES || x.TOTAL_A_SHARES || 0),
      // 报告期兼容字段名
      reportDate: x.REPORT_DATE || x.END_DATE || '',
    };
  });
  json(res, 200, { data: { list } });
}
