// 个股 F10 子页（公司概况/股东/行业）
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from '../shared/response';
import { httpGetJson, toSinaCode, toCleanCode } from '../shared/http';

function fmtHoldNum(v: unknown): string {
  const n = Number(v || 0);
  if (n >= 1e8) return (n / 1e8).toFixed(2) + '亿股';
  if (n >= 1e4) return (n / 1e4).toFixed(2) + '万股';
  return n.toFixed(0) + '股';
}

function prefixOf(code: string): string {
  return /^(60|68|90|11|13|50|56|51|58)/.test(code) ? 'SH' : 'SZ';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const code = toCleanCode(toSinaCode(getQuery(req, 'code', '')));
  const sub = getQuery(req, 'sub', 'essential');

  if (sub === 'company' || sub === 'essential') {
    const r = await httpGetJson(
      `https://emweb.securities.eastmoney.com/PC_HSF10/CompanySurvey/PageAjax?code=${prefixOf(code)}${code}`,
      'https://emweb.securities.eastmoney.com/'
    );
    const jsonData = typeof r === 'string' ? (() => { try { return JSON.parse(r); } catch { return null; } })() : r;
    const jb = jsonData?.jbzl?.[0] || {};
    const items = sub === 'essential' ? [
      { label: '股票代码', value: jb.SECURITY_CODE || code },
      { label: '公司全称', value: jb.ORG_NAME || '' },
      { label: '所属行业', value: jb.INDUSTRYCSRC1 || '' },
      { label: '董事长', value: jb.CHAIRMAN || '' },
      { label: '总经理', value: jb.PRESIDENT || '' },
      { label: '法人代表', value: jb.LEGAL_PERSON || '' },
      { label: '联系电话', value: jb.ORG_TEL || '' },
      { label: '电子邮箱', value: jb.ORG_EMAIL || '' },
      { label: '公司网址', value: jb.ORG_WEB || '' },
      { label: '办公地址', value: jb.ADDRESS || '' },
      { label: '注册资本(万)', value: jb.REG_CAPITAL || '' },
      { label: '员工人数', value: jb.EMP_NUM || '' },
      { label: '公司简介', value: String(jb.ORG_PROFILE || '').slice(0, 300) },
      { label: '经营范围', value: String(jb.BUSINESS_SCOPE || '').slice(0, 300) },
    ] : [
      { label: '公司全称', value: jb.ORG_NAME || '' },
      { label: '英文名称', value: jb.ORG_NAME_EN || '' },
      { label: '上市日期', value: jb.LISTING_DATE || '' },
      { label: '统一信用代码', value: jb.REG_NUM || '' },
      { label: '实际控股人', value: jb.ACTUAL_HOLDER || '' },
      { label: '法律顾问', value: jb.LAW_FIRM || '' },
      { label: '审计机构', value: jb.ACCOUNTFIRM_NAME || '' },
      { label: '公司简介', value: String(jb.ORG_PROFILE || '').slice(0, 500) },
      { label: '经营范围', value: String(jb.BUSINESS_SCOPE || '').slice(0, 500) },
    ];
    json(res, 200, { data: { items } });
    return;
  }

  if (sub === 'holder') {
    const r = await httpGetJson(
      `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_F10_EH_FREEHOLDERS&columns=SECURITY_CODE,HOLDER_NAME,HOLD_NUM,FREE_HOLDNUM_RATIO,HOLD_RATIO,HOLD_NUM_CHANGE,CHANGE_RATIO,HOLD_DATE&filter=(SECURITY_CODE=%22${code}%22)&pageSize=10&sortColumns=HOLD_DATE,HOLD_NUM&sortTypes=-1,-1&source=HSF10&client=PC`,
      'https://data.eastmoney.com/'
    );
    const list = r?.result?.data || [];
    if (!list.length) { json(res, 200, { data: { items: [{ label: '提示', value: '暂无股东数据' }] } }); return; }
    const items = list.map((h: any) => ({
      label: h.HOLDER_NAME || '',
      value: `持股${fmtHoldNum(h.HOLD_NUM)} 占比${h.HOLD_RATIO != null ? Number(h.HOLD_RATIO).toFixed(2) : '-'}%`,
    }));
    json(res, 200, { data: { items } });
    return;
  }

  json(res, 200, { data: { items: [] } });
}
