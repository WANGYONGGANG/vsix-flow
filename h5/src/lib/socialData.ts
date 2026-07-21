export interface PostEntry {
  id: string;
  text: string;
  title?: string;
  user: string;
  avatar?: string;
  time: string;
  source: 'xueqiu' | 'taoguba';
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  url?: string;
}

// 通过自建 Worker 代理请求（优先使用）
function workerProxy(workerUrl: string, targetUrl: string): string {
  return `${workerUrl}/proxy?url=${encodeURIComponent(targetUrl)}`;
}

// 免费代理降级列表（仅在没有配置 Worker 时使用）
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
  (url: string) => `https://proxy.cors.sh/${url}`,
];

// 核心代理请求函数
async function proxyFetch(
  targetUrl: string,
  extraHeaders: Record<string, string> = {},
  workerUrl?: string,
): Promise<{ text: string; isWrapped: boolean }> {
  // 策略1: 自建 Worker
  if (workerUrl) {
    try {
      const proxyUrl = workerProxy(workerUrl, targetUrl);
      console.log(`[socialData] 使用 Worker 代理: ${proxyUrl.slice(0, 80)}...`);
      const res = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Cookie': extraHeaders['Cookie'] || '',
          'User-Agent': extraHeaders['User-Agent'] || '',
          'Referer': extraHeaders['Referer'] || '',
          'Accept': extraHeaders['Accept'] || '*/*',
          'Accept-Language': extraHeaders['Accept-Language'] || 'zh-CN,zh;q=0.9',
        },
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const text = await res.text();
        console.log(`[socialData] Worker 代理成功，响应长度: ${text.length}`);
        return { text, isWrapped: false };
      }
      console.warn(`[socialData] Worker 代理返回 ${res.status}，降级到免费代理`);
    } catch (e) {
      console.warn(`[socialData] Worker 代理失败: ${e instanceof Error ? e.message : e}，降级到免费代理`);
    }
  }

  // 策略2: 免费代理降级
  const errors: string[] = [];
  for (let i = 0; i < FALLBACK_PROXIES.length; i++) {
    const proxyFn = FALLBACK_PROXIES[i];
    const proxyUrl = proxyFn(targetUrl, extraHeaders);
    try {
      console.log(`[socialData] 尝试免费代理 ${i + 1}/${FALLBACK_PROXIES.length}: ${proxyUrl.slice(0, 80)}...`);
      const res = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(12000),
        headers: i === 0 ? {} : extraHeaders,
      });
      if (res.ok) {
        const text = await res.text();
        console.log(`[socialData] 免费代理 ${i + 1} 成功`);
        // allorigins.win /get 返回 JSON 包装
        return { text, isWrapped: i === 1 };
      }
      errors.push(`代理${i + 1}返回 ${res.status}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`代理${i + 1}失败: ${msg}`);
      console.warn(`[socialData] 免费代理 ${i + 1} 失败:`, msg);
    }
  }

  throw new Error(`所有代理均失败: ${errors.join('; ')}`);
}

// 格式化时间
function fmtTime(ts: number | string): string {
  const d = new Date(typeof ts === 'string' ? +ts : ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return `${d.getMonth() + 1}-${d.getDate()}`;
}

// 雪球热帖 API
export async function fetchXueqiu(cookie: string, workerUrl?: string): Promise<PostEntry[]> {
  if (!cookie) throw new Error('请先设置雪球 Cookie');

  const apiUrls = [
    'https://xueqiu.com/statuses/hot/listV2.json?type=hot&size=30',
    'https://xueqiu.com/v4/statuses/public_timeline.json?type=hot&count=30',
    'https://stock.xueqiu.com/v5/stock/square/hot_list.json?size=30',
  ];

  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://xueqiu.com/',
    'Cookie': cookie,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  };

  let lastError = '';

  for (const apiUrl of apiUrls) {
    try {
      console.log(`[socialData] 尝试雪球 API: ${apiUrl}`);
      const { text, isWrapped } = await proxyFetch(apiUrl, headers, workerUrl);

      let rawText = text;
      if (isWrapped) {
        try {
          const wrapped = JSON.parse(text);
          if (wrapped.contents) rawText = wrapped.contents;
        } catch { /* ignore */ }
      }

      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        console.warn('[socialData] 响应不是 JSON，可能是登录页或验证码');
        lastError = 'API 返回非 JSON 数据（Cookie 可能无效或触发了验证码）';
        continue;
      }

      let items: any[] = [];
      if (data?.items && Array.isArray(data.items)) {
        items = data.items;
      } else if (data?.data?.items && Array.isArray(data.data.items)) {
        items = data.data.items;
      } else if (data?.statuses && Array.isArray(data.statuses)) {
        items = data.statuses;
      } else if (data?.data?.statuses && Array.isArray(data.data.statuses)) {
        items = data.data.statuses;
      }

      if (items.length === 0) {
        console.warn('[socialData] 未找到帖子数据，原始响应:', JSON.stringify(data).slice(0, 200));
        lastError = 'API 返回数据格式不匹配（Cookie 可能无效）';
        continue;
      }

      console.log(`[socialData] 获取到 ${items.length} 条雪球帖子`);

      return items.slice(0, 30).map((item: any) => {
        const user = item.user || item.userInfo || {};
        const rawText = item.title || item.text || item.description || item.content || '';
        const cleanText = rawText.replace(/<[^>]+>/g, '').replace(/\$[^$]+\$/g, '').trim();

        return {
          id: String(item.id || item.article_id || item.status_id || Math.random()),
          text: cleanText,
          title: item.title ? cleanText : undefined,
          user: user.screen_name || user.name || '匿名',
          avatar: user.profile_image_url || user.avatar || undefined,
          time: fmtTime(item.created_at || item.timeBefore || item.createdAt || Date.now()),
          source: 'xueqiu' as const,
          viewCount: item.view_count || item.read_count || item.viewCount,
          likeCount: item.like_count || item.fav_count || item.likeCount,
          commentCount: item.reply_count || item.comment_count || item.replyCount,
          url: item.target || item.url || `https://xueqiu.com/${user.id || ''}/${item.id || ''}`,
        };
      }).filter((e: PostEntry) => e.text.length > 3);
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.error('[socialData] 雪球请求失败:', lastError);
    }
  }

  throw new Error(`雪球数据获取失败: ${lastError}`);
}

// 淘股吧
export async function fetchTaoguba(cookie: string, workerUrl?: string): Promise<PostEntry[]> {
  if (!cookie) throw new Error('请先设置淘股吧 Cookie');

  const urls = [
    'https://www.taoguba.com.cn/',
    'https://www.taoguba.com.cn/index',
  ];

  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.taoguba.com.cn/',
    'Cookie': cookie,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  };

  let lastError = '';

  for (const url of urls) {
    try {
      console.log(`[socialData] 尝试淘股吧 URL: ${url}`);
      const { text, isWrapped } = await proxyFetch(url, headers, workerUrl);

      let html = text;
      if (isWrapped) {
        try {
          const wrapped = JSON.parse(text);
          if (wrapped.contents) html = wrapped.contents;
        } catch { /* ignore */ }
      }

      if (html.length < 1000) {
        lastError = '响应内容过短（可能被拦截或需要登录）';
        continue;
      }

      const posts: PostEntry[] = [];
      const patterns = [
        { regex: /<a[^>]*href="(\/[^"]*)"[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/a>/gi, urlGroup: 1, textGroup: 2 },
        { regex: /<span[^>]*class="[^"]*p_title[^"]*"[^>]*>\s*<a[^>]*href="(\/[^"]*)"[^>]*>([^<]+)<\/a>/gi, urlGroup: 1, textGroup: 2 },
        { regex: /<li[^>]*>[\s\S]*?<a[^>]*href="(\/[^"]*)"[^>]*>([^<]{5,60})<\/a>[\s\S]*?<\/li>/gi, urlGroup: 1, textGroup: 2 },
        { regex: /<div[^>]*class="[^"]*biaoti[^"]*"[^>]*>\s*<a[^>]*href="(\/[^"]*)"[^>]*>([^<]+)<\/a>/gi, urlGroup: 1, textGroup: 2 },
        { regex: /class="[^"]*title[^"]*"[^>]*>\s*<a[^>]*href="(\/[^"]*)"[^>]*>([^<]+)<\/a>/gi, urlGroup: 1, textGroup: 2 },
      ];

      for (const { regex, urlGroup, textGroup } of patterns) {
        let match;
        while ((match = regex.exec(html)) !== null) {
          const text = (match[textGroup] || '').trim();
          let href = match[urlGroup] || '';
          if (!href.startsWith('http')) {
            href = href.startsWith('/') ? `https://www.taoguba.com.cn${href}` : `https://www.taoguba.com.cn/${href}`;
          }
          if (text.length > 5 && text.length < 100 && !posts.find(p => p.text === text)) {
            if (!/首页|论坛|股吧|资讯|行情|数据|学院|话题|登录|注册|更多|关于我们|联系我们|广告合作/.test(text)) {
              posts.push({
                id: String(Math.random()),
                text,
                title: text,
                user: '淘股吧用户',
                time: '刚刚',
                source: 'taoguba' as const,
                url: href,
              });
            }
          }
        }
        if (posts.length >= 15) break;
      }

      if (posts.length > 0) {
        console.log(`[socialData] 获取到 ${posts.length} 条淘股吧帖子`);
        return posts.slice(0, 20);
      }

      lastError = '未从页面解析到帖子数据';
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.error('[socialData] 淘股吧请求失败:', lastError);
    }
  }

  throw new Error(`淘股吧数据获取失败: ${lastError}`);
}

// 缓存
let xueqiuCache: { posts: PostEntry[]; time: number; workerUrl: string; cookie: string } | null = null;
let taogubaCache: { posts: PostEntry[]; time: number; workerUrl: string; cookie: string } | null = null;

export async function fetchXueqiuPosts(cookie: string, workerUrl?: string): Promise<PostEntry[]> {
  if (xueqiuCache && xueqiuCache.cookie === cookie && xueqiuCache.workerUrl === (workerUrl || '') && Date.now() - xueqiuCache.time < 60000) {
    return xueqiuCache.posts;
  }
  const posts = await fetchXueqiu(cookie, workerUrl);
  xueqiuCache = { posts, time: Date.now(), workerUrl: workerUrl || '', cookie };
  return posts;
}

export async function fetchTaogubaPosts(cookie: string, workerUrl?: string): Promise<PostEntry[]> {
  if (taogubaCache && taogubaCache.cookie === cookie && taogubaCache.workerUrl === (workerUrl || '') && Date.now() - taogubaCache.time < 60000) {
    return taogubaCache.posts;
  }
  const posts = await fetchTaoguba(cookie, workerUrl);
  taogubaCache = { posts, time: Date.now(), workerUrl: workerUrl || '', cookie };
  return posts;
}

// 用于弹幕的数据（简化版）
export async function fetchBarrageData(
  xueqiuCookie: string,
  taogubaCookie: string,
  workerUrl?: string
): Promise<{ text: string; source: 'xueqiu' | 'taoguba'; user: string }[]> {
  const results: { text: string; source: 'xueqiu' | 'taoguba'; user: string }[] = [];
  const [xq, tg] = await Promise.all([
    xueqiuCookie ? fetchXueqiu(xueqiuCookie, workerUrl).catch(() => []) : Promise.resolve([]),
    taogubaCookie ? fetchTaoguba(taogubaCookie, workerUrl).catch(() => []) : Promise.resolve([]),
  ]);
  xq.forEach(p => results.push({ text: p.text.slice(0, 40), source: 'xueqiu', user: p.user }));
  tg.forEach(p => results.push({ text: p.text.slice(0, 40), source: 'taoguba', user: p.user }));
  return results;
}