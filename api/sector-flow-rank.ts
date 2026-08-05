// 板块资金流排名 - 选股报告阶段二数据源（行业 t=2 / 概念 t=1）
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from './_shared/response';
import { httpGetJson } from './_shared/http';

// 新浪板块名 -> 东财通用中类名 的粗略映射（避免报告中出现「new_xxx」）
const SINA_NAME_MAP: Record<string, string> = {
  new_dzxx: '电子信息', new_dzqj: '电子器件', new_ysjs: '有色金属', new_jxhy: '机械行业',
  new_hghy: '化工行业', new_blhy: '玻璃行业', new_fdsb: '发电设备', new_qczz: '汽车制造',
  new_fdc: '房地产', new_mthy: '煤炭行业', new_yhhy: '银行', new_jrhy: '金融行业',
  new_zzsmy: '商业贸易', new_sphy: '食品行业', new_ylyy: '医药生物', new_jdhy: '家电行业',
  new_txhyl: '通信行业', new_wlyh: '互联网', new_jsj: '计算机', new_xc: '传媒',
  new_nyhy: '农业', new_sghy: '钢铁行业', new_shhy: '石化行业', new_yysw: '医药商业',
  new_fzhy: '纺织服装', new_zhhy: '综合行业', new_gzyl: '公用事业', new_jtys: '交通运输',
  new_ylbz: '医疗器械', new_hbhj: '环保', new_dqhy: '电器行业', new_hxqc: '汽车整车',
  gn_hwgn: '华为概念', gn_gqjl: '股权激励', gn_zchc: '智慧城市', gn_rjgc: '国产软件',
  gn_zlby: '锂电池', gn_xny: '新能源', gn_xnyc: '新能源车', gn_bdcl: '半导体',
  gn_yjy: '元宇宙', gn_xg: '新股', gn_cx: '次新股', gn_zxb: '中小板', gn_cyb: '创业板',
  gn_kcb: '科创板', gn_st: 'ST板块', gn_lt: '龙头',
};

function friendlyName(sinaName: string, rawKey: string): string {
  if (sinaName && /[\u4e00-\u9fa5]/.test(sinaName)) return sinaName;
  if (SINA_NAME_MAP[rawKey]) return SINA_NAME_MAP[rawKey];
  return sinaName || rawKey;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  const t = parseInt(getQuery(req, 't', '2')) || 2; // 2=行业板块 1=概念板块
  const pz = Math.max(1, Math.min(100, parseInt(getQuery(req, 'pz', '30')) || 30));

  const fs = t === 1 ? 'm:90+t:3+f:!50' : 'm:90+t:2+f:!50';
  const fields = 'f2,f3,f4,f12,f14,f20,f62,f66,f104,f105,f204,f205';
  const ut = 'fa5fd1943c7b386f172d6893dbfba10b';

  const r = await httpGetJson(
    `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=${pz}&po=1&np=1&fltt=2&invt=2&fid=f62&fs=${encodeURIComponent(fs)}&fields=${fields}&ut=${ut}`,
    'https://data.eastmoney.com/'
  );
  let diff: any[] = r?.data?.diff || [];

  // ===== Fallback：新浪 ssl_bkzj_bk（push2 在当前环境偶发网络不通时启用）=====
  // 仅使用新浪实际返回的字段；任何缺失字段统一填 null，不做估算
  if (!diff.length) {
    const fenlei = t === 1 ? 1 : 0;
    const sina = await httpGetJson(
      `https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/MoneyFlow.ssl_bkzj_bk?page=1&num=${pz}&sort=netamount&asc=0&fenlei=${fenlei}`,
      'https://finance.sina.com.cn/'
    );
    const arr: any[] = Array.isArray(sina) ? sina : [];
    for (const b of arr) {
      const key = String(b.category || '');
      const name = friendlyName(String(b.name || ''), key);
      const avgChg = Number(b.avg_changeratio || 0); // 小数：0.03 = 3%
      const net = Number(b.netamount || 0);
      const tsName = String(b.ts_name || '');
      const tsRatio = Number(b.ts_changeratio || 0) * 100;
      diff.push({
        f12: key || name,
        f14: name,
        f3: Number((avgChg * 100).toFixed(2)), // 涨跌幅(%)
        // 以下字段新浪没有提供，一律 null，不做任何估算
        f2: b.avg_trade != null ? Number(b.avg_trade) : null,
        f4: null,
        f20: b.turnover != null ? Number(b.turnover) * 1e8 : null,  // 新浪 turnover 单位是亿，真实换算
        f62: net,
        f66: null,
        f104: null, f105: null,
        f204: tsName && tsRatio
          ? `${tsName}${tsRatio >= 9.9 ? ' 涨停' : ` 领涨 ${tsRatio.toFixed(1)}%`}`
          : '',
        f205: null,
      });
    }
    diff.sort((a, b) => (Number(b.f62) || 0) - (Number(a.f62) || 0));
    diff = diff.slice(0, pz);
  }

  json(res, 200, { data: { diff } });
}
