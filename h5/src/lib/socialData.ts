export interface PostEntry {
  id: string;
  text: string;
  title?: string;
  user: string;
  avatar?: string;
  time: string;
  source: 'eastmoney' | string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  url?: string;
}

// ==================== 东方财富7x24快讯（公开API，实时）====================

interface EmNewsItem {
  title: string;
  summary: string;
  image?: string;
  code: string;
  showTime: string;
  uniqueUrl?: string;
  url?: string;
  mediaName?: string;
}

let reqTrace = 'abc' + Math.random().toString(36).slice(2, 8);

export async function fetchEastmoney(): Promise<PostEntry[]> {
  const url = `https://np-listapi.eastmoney.com/comm/web/getNewsByColumns?client=web&biz=web_news_col&column=350&order=1&needInteractData=0&page_index=1&page_size=30&req_trace=${reqTrace}`;

  console.log(`[socialData] 请求东财快讯`);
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`东财接口返回 ${res.status}`);
  const json = await res.json();
  if (json.code !== '1') throw new Error('东财接口返回失败');

  const items: EmNewsItem[] = json?.data?.list || [];
  console.log(`[socialData] 获取到 ${items.length} 条东财快讯`);

  return items.map((item, i) => ({
    id: item.code || String(i),
    text: item.summary || item.title || '',
    title: item.title || undefined,
    user: item.mediaName || '东方财富',
    time: formatEmTime(item.showTime),
    source: 'eastmoney' as const,
    url: item.uniqueUrl || item.url || '',
  }));
}

function formatEmTime(timeStr: string): string {
  if (!timeStr) return '刚刚';
  const d = new Date(timeStr.replace(/-/g, '/'));
  if (isNaN(d.getTime())) return timeStr.slice(5, 16);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return `${d.getMonth() + 1}-${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

export async function fetchEastmoneyPostsCached(): Promise<PostEntry[]> {
  return fetchEastmoney();
}

// ==================== 智能弹幕：基于资金流向数据生成模拟弹幕 ====================

interface SectorFlow {
  name: string;
  value: number;
}

interface BarrageGenerator {
  generate: () => { text: string; source: string; user: string };
  update: (sectors: SectorFlow[], indexChange?: number) => void;
}

// 板块涨跌相关的评论模板
const POSITIVE_TEMPLATES = [
  (s: string, v: number) => `${s}主力净流入${v.toFixed(1)}亿，资金在抢筹！`,
  (s: string, v: number) => `${s}今天有点东西，${v.toFixed(1)}亿资金进场`,
  (s: string, v: number) => `来了来了，${s}又吸金${v.toFixed(1)}亿`,
  (s: string) => `${s}资金面不错，继续观察`,
  (s: string) => `感觉${s}要起飞了？`,
  (s: string, v: number) => `${s}净流入${v.toFixed(1)}亿，机构在布局`,
  (s: string) => `大佬们都在买${s}，我要不要跟上`,
  (s: string, v: number) => `${s}吸金${v.toFixed(1)}亿，这才是主线`,
];

const NEGATIVE_TEMPLATES = [
  (s: string, v: number) => `${s}主力流出${Math.abs(v).toFixed(1)}亿，小心！`,
  (s: string, v: number) => `${s}资金在跑，净流出${Math.abs(v).toFixed(1)}亿`,
  (s: string, v: number) => `${s}又被砸了${Math.abs(v).toFixed(1)}亿，心痛`,
  (s: string) => `${s}主力撤退了，别接飞刀`,
  (s: string) => `完了，${s}资金面崩了`,
  (s: string, v: number) => `${s}净流出${Math.abs(v).toFixed(1)}亿，短期回避`,
  (s: string) => `${s}这种流出量...我先溜了`,
];

const INDEX_TEMPLATES_UP = [
  (c: number) => `大盘涨了${c.toFixed(2)}%，今天有戏！`,
  (c: number) => `指数红了 +${c.toFixed(2)}%，仓位加起来`,
  (c: number) => `+${c.toFixed(2)}%，稳住就是胜利`,
  () => `今天行情不错，继续拿`,
  () => `希望下午别跳水...`,
];

const INDEX_TEMPLATES_DOWN = [
  (c: number) => `大盘跌${Math.abs(c).toFixed(2)}%，今天又白干了`,
  (c: number) => `绿油油的 -${Math.abs(c).toFixed(2)}%，减仓吧`,
  (c: number) => `-${Math.abs(c).toFixed(2)}%，什么时候是个头`,
  () => `又是亏钱的一天`,
  () => `别急，等抄底机会`,
];

const GENERAL_TEMPLATES = [
  () => `各位今天赚了多少？`,
  () => `这个点应该已经收盘了吧`,
  () => `今天的龙虎榜谁看了`,
  () => `有没有人做T成功的`,
  () => `今天涨停板有几个了`,
  () => `北向资金今天又买了啥`,
  () => `感觉下周要变盘了`,
  () => `现在适合加仓吗`,
];

const USERNAMES = ['股海老张', '追涨小王', '价值投资李', '短线阿杰', '韭菜小明', '波段大师', '量化老陈', '技术分析刘', '新手小白', '老韭菜', '打板哥', '抄底王', '看盘达人', '财经小白', '牛市来了吗'];

export function createBarrageGenerator(): BarrageGenerator {
  let sectors: SectorFlow[] = [];
  let indexChange = 0;
  let tick = 0;

  return {
    update(newSectors: SectorFlow[], newIndexChange?: number) {
      sectors = newSectors;
      if (newIndexChange !== undefined) indexChange = newIndexChange;
    },

    generate() {
      tick++;
      const user = USERNAMES[Math.floor(Math.random() * USERNAMES.length)];

      if (sectors.length === 0) {
        return { text: GENERAL_TEMPLATES[tick % GENERAL_TEMPLATES.length](), source: '模拟', user };
      }

      // 按资金净流入绝对值排序
      const sorted = [...sectors].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
      const top3 = sorted.slice(0, 3);
      const topSector = top3[0];
      if (!topSector) return { text: GENERAL_TEMPLATES[tick % GENERAL_TEMPLATES.length](), source: '模拟', user };

      const rand = Math.random();

      // 50% 板块相关
      if (rand < 0.5) {
        const sector = top3[Math.floor(Math.random() * top3.length)];
        const isPos = sector.value >= 0;
        const templates = isPos ? POSITIVE_TEMPLATES : NEGATIVE_TEMPLATES;
        const tpl = templates[Math.floor(Math.random() * templates.length)];
        return { text: tpl(sector.name, sector.value), source: '模拟', user };
      }

      // 25% 大盘相关
      if (rand < 0.75) {
        const templates = indexChange >= 0 ? INDEX_TEMPLATES_UP : INDEX_TEMPLATES_DOWN;
        const tpl = templates[Math.floor(Math.random() * templates.length)];
        return { text: tpl(indexChange), source: '模拟', user };
      }

      // 25% 闲聊
      return { text: GENERAL_TEMPLATES[tick % GENERAL_TEMPLATES.length](), source: '模拟', user };
    },
  };
}
