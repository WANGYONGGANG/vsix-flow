// 期货搜索 - 东方财富 futsseapi
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from './_shared/response';
import { httpsGetText, stripJsonp } from './_shared/http';

const EXCHANGES = 'COMEX,NYMEX,COBOT,SGX,NYBOT,LME,MDEX,TOCOM,IPE';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  const kw = getQuery(req, 'kw').trim().toLowerCase();
  if (!kw) { json(res, 200, { data: { list: [] } }); return; }

  try {
    const token = '58b2fa8f54638b60b87d69b31969089c';
    const text = await httpsGetText(
      `https://futsseapi.eastmoney.com/list/${EXCHANGES}?orderBy=dm&sort=desc&pageSize=100&pageIndex=0&token=${token}&field=dm,sc,name,p,zsjd,zde,zdf,f152,o,h,l,zjsj,vol,wp,np,ccl&blockName=callback`,
      'https://quote.eastmoney.com/'
    );
    // futsseapi 带 blockName=callback 返回 JSONP，用 stripJsonp 解析
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
