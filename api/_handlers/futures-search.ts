// 期货搜索 - 东方财富 suggest API (type=30 期货，覆盖更全) + futsseapi 兜底
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from './_shared/response';
import { httpsGetText, stripJsonp } from './_shared/http';

const EXCHANGES = 'COMEX,NYMEX,COBOT,SGX,NYBOT,LME,MDEX,TOCOM,IPE,SHFE';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  const kw = decodeURIComponent(getQuery(req, 'kw')).trim();
  if (!kw) { json(res, 200, { data: { list: [] } }); return; }

  // 方案1：suggest API type=30 (期货) - 覆盖国内外期货品种更全
  const token = 'D43BF722C8E33BDC906FB84D85E326E8';
  const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(kw)}&type=30&token=${token}&count=20`;
  try {
    const text = await httpsGetText(url, 'https://quote.eastmoney.com/');
    const r = stripJsonp(text);
    const arr: any[] = r?.QuotationCodeTable?.Data || [];
    const list = arr.map((d: any) => {
      const code = d.Code || '';
      return {
        code: 'f_' + code,
        display_code: code,
        name: d.Name || '',
        type: '期货',
        price: d.LastPrice || d.p,
        change: d.ChangePercent || d.zdf,
      };
    }).filter((x: any) => x.code && x.name);
    if (list.length) { json(res, 200, { data: { list } }); return; }
  } catch { /* fall through */ }

  // 方案2：回退 futsseapi 列表接口
  try {
    const token2 = '58b2fa8f54638b60b87d69b31969089c';
    const text = await httpsGetText(
      `https://futsseapi.eastmoney.com/list/${EXCHANGES}?orderBy=dm&sort=desc&pageSize=100&pageIndex=0&token=${token2}&field=dm,sc,name,p,zsjd,zde,zdf,f152,o,h,l,zjsj,vol,wp,np,ccl&blockName=callback`,
      'https://quote.eastmoney.com/'
    );
    const r = stripJsonp(text);
    const raw: any[] = r?.list || r || [];
    const list = raw
      .filter((x: any) => {
        const dm = String(x.dm || '').toLowerCase();
        const name = String(x.name || '').toLowerCase();
        return dm.includes(kw) || name.includes(kw);
      })
      .map((x: any) => ({
        code: 'f_' + String(x.dm || ''),
        name: x.name || '',
        type: '期货',
        display_code: String(x.dm || ''),
        price: x.p,
        change: x.zdf,
      }));
    json(res, 200, { data: { list } });
  } catch {
    json(res, 200, { data: { list: [] } });
  }
}
