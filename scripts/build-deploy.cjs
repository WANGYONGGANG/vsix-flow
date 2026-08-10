#!/usr/bin/env node
/**
 * 预构建部署组装脚本
 * 用法: node scripts/build-deploy.cjs [--skip-build]
 *
 * 流程：
 *   1. webapp 打包到 webapp/dist（可 --skip-build 跳过）
 *   2. 组装 staging 目录（默认 d:/vsix-deploy-tmp，可用环境变量 DEPLOY_STAGE 覆盖）
 *      - dist 产物 -> public/（静态资源）
 *      - api/*.ts  -> handlers/（避免每个端点生成独立函数，突破 Hobby 12 函数限制）
 *      - scripts/deploy/all.ts -> api/all.ts（单函数分发器，rewrites 按 ?ep= 转发）
 *      - vercel.json / package.json + node_modules(iconv-lite)
 *   3. 提示在 staging 目录执行 vercel --prod --yes
 *
 * 注意：staging 必须位于 git 仓库之外，否则 CLI 会附带 git 作者信息，
 * 触发 Vercel 团队校验导致部署被 BLOCKED（TEAM_ACCESS_REQUIRED）。
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STAGE = process.env.DEPLOY_STAGE || 'd:\\vsix-deploy-tmp';
const skipBuild = process.argv.includes('--skip-build');

function log(msg) { console.log('[build-deploy] ' + msg); }

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    const st = fs.statSync(s);
    if (st.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// 1. 构建 webapp -> dist
if (!skipBuild) {
  log('构建 webapp ...');
  execSync('npm run build', { cwd: path.join(ROOT, 'webapp'), stdio: 'inherit' });
} else {
  log('跳过构建（--skip-build）');
}
const distDir = path.join(ROOT, 'webapp', 'dist');
if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('错误: webapp/dist 不存在，请先构建');
  process.exit(1);
}

// 2. 组装 staging（保留 node_modules 避免重复安装）
log('组装 staging: ' + STAGE);
fs.mkdirSync(STAGE, { recursive: true });
rmrf(path.join(STAGE, 'public'));
rmrf(path.join(STAGE, 'handlers'));
rmrf(path.join(STAGE, 'api'));

copyDir(distDir, path.join(STAGE, 'public'));

// api/*.ts -> handlers/（含 _shared 与 ai 子目录，排除 package.json）
const apiSrc = path.join(ROOT, 'api');
const handlersDest = path.join(STAGE, 'handlers');
for (const name of fs.readdirSync(apiSrc)) {
  if (name === 'package.json') continue;
  const s = path.join(apiSrc, name);
  const d = path.join(handlersDest, name);
  if (fs.statSync(s).isDirectory()) copyDir(s, d);
  else { fs.mkdirSync(handlersDest, { recursive: true }); fs.copyFileSync(s, d); }
}

fs.mkdirSync(path.join(STAGE, 'api'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'scripts', 'deploy', 'all.ts'), path.join(STAGE, 'api', 'all.ts'));
fs.copyFileSync(path.join(ROOT, 'scripts', 'deploy', 'vercel.json'), path.join(STAGE, 'vercel.json'));
fs.writeFileSync(path.join(STAGE, 'package.json'), JSON.stringify({
  name: 'vsix-deploy',
  private: true,
  dependencies: { 'iconv-lite': '^0.7.3' },
}, null, 2));

// 依赖：iconv-lite（API 解码 GBK 用）
if (!fs.existsSync(path.join(STAGE, 'node_modules', 'iconv-lite'))) {
  log('安装 iconv-lite ...');
  execSync('npm install --omit=dev', { cwd: STAGE, stdio: 'inherit' });
}

log('完成。推送命令: cd ' + STAGE + ' && vercel --prod --yes');
