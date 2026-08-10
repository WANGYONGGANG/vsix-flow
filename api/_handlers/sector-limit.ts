// 板块排行 / 东方财富板块涨幅排行（与 sector-flow-rank 同源，按涨幅排序）
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions } from './_shared/response';
import { httpGetJson } from './_shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  // 使用 push2 clist 接口，按涨幅(f3)降序获取行业板块
  const fs = 'm:90+t:2+f:!50';
  const fields = 'f2,f3,f4,f12,f14,f20,f62,f66,f104,f105,f204,f205';
  const ut = 'fa5fd1943c7b386f172d6893dbfba10b';
  const r = await httpGetJson(
    `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=50&po=1&np=1&fltt=2&invt=2&fid=f3&fs=${encodeURIComponent(fs)}&fields=${fields}&ut=${ut}`,
    'https://data.eastmoney.com/'
  );
  let diff: any[] = r?.data?.diff || [];

  // Fallback：新浪板块资金流
  if (!diff.length) {
    const sina = await httpGetJson(
      'https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/MoneyFlow.ssl_bkzj_bk?page=1&num=50&sort=netamount&asc=0&fenlei=0',
      'https://finance.sina.com.cn/'
    );
    const arr: any[] = Array.isArray(sina) ? sina : [];
    for (const b of arr) {
      const avgChg = Number(b.avg_changeratio || 0);
      diff.push({
        f12: String(b.category || b.name || ''),
        f14: String(b.name || ''),
        f3: Number((avgChg * 100).toFixed(2)),
        f62: Number(b.netamount || 0),
        f104: null, f105: null,
      });
    }
  }
  json(res, 200, { data: { diff } });
}
