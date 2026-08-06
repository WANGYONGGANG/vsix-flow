import * as vscode from 'vscode';

interface WebhookConfig {
  wecom: { url: string; enabled: boolean };
  dingtalk: { url: string; enabled: boolean };
  feishu: { url: string; enabled: boolean };
}

export async function pushWebhook(title: string, message: string) {
  const config = vscode.workspace.getConfiguration('stock-ext').get<WebhookConfig>('webhook');
  if (!config) return;

  const promises: Promise<void>[] = [];

  if (config.wecom?.enabled && config.wecom.url) {
    promises.push(sendWecom(config.wecom.url, title, message));
  }
  if (config.dingtalk?.enabled && config.dingtalk.url) {
    promises.push(sendDingtalk(config.dingtalk.url, title, message));
  }
  if (config.feishu?.enabled && config.feishu.url) {
    promises.push(sendFeishu(config.feishu.url, title, message));
  }

  await Promise.allSettled(promises);
}

async function sendWecom(url: string, title: string, message: string) {
  try {
    const axios = require('axios');
    await axios.post(url, {
      msgtype: 'markdown',
      markdown: { content: `## ${title}\n${message}` },
    }, { timeout: 5000 });
  } catch {}
}

async function sendDingtalk(url: string, title: string, message: string) {
  try {
    const axios = require('axios');
    await axios.post(url, {
      msgtype: 'markdown',
      markdown: { title, text: `## ${title}\n${message}` },
    }, { timeout: 5000 });
  } catch {}
}

async function sendFeishu(url: string, title: string, message: string) {
  try {
    const axios = require('axios');
    await axios.post(url, {
      msg_type: 'post',
      content: JSON.stringify({
        zh_cn: {
          title,
          content: [[{ tag: 'text', text: message }]],
        },
      }),
    }, { timeout: 5000 });
  } catch {}
}
