export interface PostEntry {
  id: string;
  text: string;
  title?: string;
  user: string;
  avatar?: string;
  time: string;
  source: 'eastmoney' | 'xueqiu' | 'taoguba';
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  url?: string;
}

// ==================== 东方财富（公开API，无需代理/Cookie）====================

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

// 东财新闻分类
const EM_COLUMNS = {
  kuaixun: 350,   // 7x24快讯
  caijing: 331,  // 财经新闻
  gushi: 330,    // 股市要闻
  fund: 338,     // 基金
  hk: 616,       // 港股
  us: 617,       // 美股
};

let reqTrace = 'abc' + Math.random().toString(36).slice(2, 8);

export async function fetchEastmoney(column: keyof typeof EM_COLUMNS = 'kuaixun'): Promise<PostEntry[]> {
  const colId = EM_COLUMNS[column];
  const url = `https://np-listapi.eastmoney.com/comm/web/getNewsByColumns?client=web&biz=web_news_col&column=${colId}&order=1&needInteractData=0&page_index=1&page_size=30&req_trace=${reqTrace}`;

  console.log(`[socialData] 请求东财新闻: column=${column}(${colId})`);
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`东财接口返回 ${res.status}`);

  const json = await res.json();
  if (json.code !== '1') throw new Error('东财接口返回失败');

  const items: EmNewsItem[] = json?.data?.list || [];
  console.log(`[socialData] 获取到 ${items.length} 条东财新闻`);

  return items.map((item, i) => {
    const postUrl = item.uniqueUrl || item.url || '';
    return {
      id: item.code || String(i),
      text: item.summary || item.title || '',
      title: item.title || undefined,
      user: item.mediaName || '东方财富',
      time: formatEmTime(item.showTime),
      source: 'eastmoney' as const,
      url: postUrl,
      viewCount: undefined,
    };
  });
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

export async function fetchEastmoneyPosts(column?: string): Promise<PostEntry[]> {
  return fetchEastmoney((column || 'kuaixun') as keyof typeof EM_COLUMNS);
}

// ==================== 雪球/淘股吧（需要代理+Cookie，保留作为可选）====================

// 免费代理降级列表
const FALLBACK_PROXIES = [
  (url: string, headers: Record<string, string>) => {
    let proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
    for (const [k, v] of Object.entries(headers)) {
      proxyUrl += `&reqHeaders=${encodeURIComponent(`${k}: ${v}`)}`;
    }
    return proxyUrl;
  },
  (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.org/?${encodeURIComponent(url)}`,
];

async function proxyFetch(
  targetUrl: string,
  extraHeaders: Record<string, string> = {},
  workerUrl?: string,
): Promise<{ text: string; isWrapped: boolean }> {
  // 用户配置的 Worker 代理
  if (workerUrl) {
    try {
      const proxyUrl = `${workerUrl}/proxy?url=${encodeURIComponent(targetUrl)}`;
      console.log(`[socialData] 使用 Worker 代理`);
      const res = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Cookie': extraHeaders['Cookie'] || '',
          'User-Agent': extraHeaders['User-Agent'] || '',
          'Referer': extraHeaders['Referer'] || '',
          'Accept': extraHeaders['Accept'] || '*/*',
        },
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const text = await res.text();
        return { text, isWrapped: false };
      }
    } catch (e) {
      console.warn(`[socialData] Worker 代理失败: ${e instanceof Error ? e.message : e}`);
    }
  }

  // 免费代理降级
  for (let i = 0; i < FALLBACK_PROXIES.length; i++) {
    const proxyUrl = FALLBACK_PROXIES[i](targetUrl, extraHeaders);
    try {
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000), headers: i === 0 ? {} : extraHeaders });
      if (res.ok) {
        const text = await res.text();
        return { text, isWrapped: i === 1 };
      }
    } catch { /* skip */ }
  }
  throw new Error('所有代理均失败');
}

function fmtTime(ts: number | string): string {
  const d = new Date(typeof ts === 'string' ? +ts : ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return `${d.getMonth() + 1}-${d.getDate()}`;
}

export async function fetchXueqiu(cookie: string, workerUrl?: string): Promise<PostEntry[]> {
  if (!cookie) throw new Error('请先设置雪球 Cookie');
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://xueqiu.com/',
    'Cookie': cookie,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  };
  const xqatMatch = cookie.match(/xq_a_token=([^;]+)/);
  if (xqatMatch) headers['X-Access-Token'] = xqatMatch[1];

  const apiUrls = [
    'https://xueqiu.com/query/v1/symbol/search/status.json?symbol=SH000001&count=10&comment=0&page=1&source=all',
    'https://xueqiu.com/statuses/livenews/list.json?since_id=-1&max_id=-1&count=30',
  ];

  for (const apiUrl of apiUrls) {
    try {
      const { text, isWrapped } = await proxyFetch(apiUrl, headers, workerUrl);
      let rawText = text;
      if (isWrapped) { try { const w = JSON.parse(text); if (w.contents) rawText = w.contents; } catch { /* */ } }
      if (rawText.includes('aliyun_waf') || rawText.includes('_waf_')) continue;
      let data: any; try { data = JSON.parse(rawText); } catch { continue; }
      let items: any[] = [];
      if (data?.list) items = data.list;
      else if (data?.items) items = data.items;
      else if (data?.statuses) items = data.statuses;
      if (items.length === 0) continue;
      return items.slice(0, 30).map((item: any) => {
        const user = item.user || item.userInfo || {};
        const rawText = item.title || item.text || item.description || item.content || '';
        const cleanText = rawText.replace(/<[^>]+>/g, '').replace(/\$[^\$]+\$/g, '').trim();
        return {
          id: String(item.id || Math.random()), text: cleanText, title: item.title ? cleanText : undefined,
          user: user.screen_name || user.name || '匿名', time: fmtTime(item.created_at || Date.now()),
          source: 'xueqiu' as const, viewCount: item.view_count || item.read_count,
          likeCount: item.like_count || item.fav_count, commentCount: item.reply_count || item.comment_count,
          url: item.target || item.url || `https://xueqiu.com/${user.id || ''}/${item.id || ''}`,
        };
      }).filter((e: PostEntry) => e.text.length > 3);
    } catch { /* try next */ }
  }
  throw new Error('雪球数据获取失败（可能触发了WAF验证）');
}

export async function fetchTaoguba(cookie: string, workerUrl?: string): Promise<PostEntry[]> {
  if (!cookie) throw new Error('请先设置淘股吧 Cookie');
  try {
    const { text, isWrapped } = await proxyFetch('https://www.taoguba.com.cn/', {
      'Cookie': cookie, 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.taoguba.com.cn/',
    }, workerUrl);
    let html = text;
    if (isWrapped) { try { const w = JSON.parse(text); if (w.contents) html = w.contents; } catch { /* */ } }
    const posts: PostEntry[] = [];
    const patterns = [
      /<a[^>]*href="(\/[^"\\s]*)"[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/a>/gi,
      /<li[^>]*>[\s\S]*?<a[^>]*href="(\/[^"\\s]*)"[^>]*>([^<]{5,60})<\/a>[\s\S]*?<\/li>/gi,
    ];
    for (const regex of patterns) {
      let match; while ((match = regex.exec(html)) !== null) {
        const t = (match[2] || '').trim();
        const href = match[1]?.startsWith('/') ? `https://www.taoguba.com.cn${match[1]}` : '';
        if (t.length > 5 && t.length < 100 && !posts.find(p => p.text === t) && !/首页|论坛|登录|注册/.test(t)) {
          posts.push({ id: String(Math.random()), text: t, title: t, user: '淘股吧用户', time: '刚刚', source: 'taoguba', url: href });
        }
      }
      if (posts.length >= 15) break;
    }
    if (posts.length > 0) return posts.slice(0, 20);
  } catch { /* */ }
  throw new Error('淘股吧数据获取失败');
}

// ==================== 缓存 ====================
let emCache: { posts: PostEntry[]; time: number; column: string } | null = null;
let xueqiuCache: { posts: PostEntry[]; time: number } | null = null;
let taogubaCache: { posts: PostEntry[]; time: number } | null = null;

export async function fetchEastmoneyPostsCached(column?: string): Promise<PostEntry[]> {
  const col = column || 'kuaixun';
  if (emCache && emCache.column === col && Date.now() - emCache.time < 60000) return emCache.posts;
  const posts = await fetchEastmoney(col as keyof typeof EM_COLUMNS);
  emCache = { posts, time: Date.now(), column: col };
  return posts;
}

export async function fetchXueqiuPosts(cookie: string, workerUrl?: string): Promise<PostEntry[]> {
  if (xueqiuCache && Date.now() - xueqiuCache.time < 60000) return xueqiuCache.posts;
  const posts = await fetchXueqiu(cookie, workerUrl);
  xueqiuCache = { posts, time: Date.now() };
  return posts;
}

export async function fetchTaogubaPosts(cookie: string, workerUrl?: string): Promise<PostEntry[]> {
  if (taogubaCache && Date.now() - taogubaCache.time < 60000) return taogubaCache.posts;
  const posts = await fetchTaoguba(cookie, workerUrl);
  taogubaCache = { posts, time: Date.now() };
  return posts;
}

// 弹幕数据
export async function fetchBarrageData(
  _xqCookie: string,
  _tgCookie: string,
  _workerUrl?: string
): Promise<{ text: string; source: string; user: string }[]> {
  const posts = await fetchEastmoney('kuaixun');
  return posts.slice(0, 20).map(p => ({
    text: p.text.slice(0, 40),
    source: '东财',
    user: p.user,
  }));
}
