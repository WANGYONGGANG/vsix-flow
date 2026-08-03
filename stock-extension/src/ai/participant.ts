import * as vscode from 'vscode';

export function registerAiParticipant(context: vscode.ExtensionContext) {
  const participant = vscode.chat.createChatParticipant('stock-ext.stock', async (request, context, stream, token) => {
    const command = request.command;
    try {
      if (command === 'summary') {
        stream.markdown('## 📊 今日快讯摘要\n\n正在获取最新快讯数据...');
        const news = await fetchFlashNews(10);
        stream.markdown('\n\n' + news.map((n, i) => `${i + 1}. **${n.title}** — ${n.time}`).join('\n'));
      } else if (command === 'portfolio') {
        stream.markdown('## 📋 自选与持仓概览\n\n');
        const config = vscode.workspace.getConfiguration('stock-ext');
        const stockPortfolio: any = config.get('stockPortfolio') || {};
        const fundPortfolio: any = config.get('fundPortfolio') || {};
        const stockGroups = stockPortfolio.groups || [];
        const fundGroups = fundPortfolio.groups || [];

        if (stockGroups.length) {
          stream.markdown('**股票自选:**\n\n');
          for (const g of stockGroups) {
            stream.markdown(`- ${g.name} (${g.codes.length}只): \`${g.codes.join(', ')}\`\n`);
          }
        }
        if (fundGroups.length) {
          stream.markdown('\n**基金自选:**\n\n');
          for (const g of fundGroups) {
            stream.markdown(`- ${g.name} (${g.codes.length}只): \`${g.codes.join(', ')}\`\n`);
          }
        }
        const ledger: any = config.get('holdingsLedger') || {};
        const codes = Object.keys(ledger);
        if (codes.length) {
          stream.markdown('\n**持仓成本:**\n\n');
          for (const code of codes) {
            const h = ledger[code];
            stream.markdown(`- \`${code}\`: 成本 ${h.cost}, 数量 ${h.amount}\n`);
          }
        }
      } else if (command === 'explain') {
        stream.markdown('## 💡 标的解读\n\n请输入想要解读的股票或基金代码。');
        stream.markdown('\n\n> 例如: `600519` (贵州茅台), `sh000001` (上证指数)');
      } else {
        stream.markdown(request.prompt);
      }
    } catch (err: any) {
      stream.markdown(`\n\n❌ 获取数据失败: ${err.message}`);
    }
  });
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'resources', 'icon.svg');

  context.subscriptions.push(participant);
}

async function fetchFlashNews(limit: number): Promise<{ title: string; time: string }[]> {
  try {
    const axios = require('axios');
    const res = await axios.get('https://np-listapi.eastmoney.com/comm/list', {
      params: { type: 'jsc', page: 1, pageSize: limit, _: Date.now() },
      timeout: 5000,
    });
    return (res.data?.data?.list || []).map((d: any) => ({
      title: d.title || d.content || '',
      time: d.showtime || d.ctime || '',
    }));
  } catch {
    return [];
  }
}
