export const EXTENSION_ID = 'stock-ext';
export const VIEWS = {
  HOME: 'stockExtView.home',
  NEWS: 'stockExtView.news',
  REPORT: 'stockExtView.report',
} as const;

export const COMMANDS = {
  OPEN_STOCK_CENTER: 'stock-ext.openStockCenter',
  OPEN_SECTOR_BOARDS: 'stock-ext.openSectorBoards',
  OPEN_HOLDINGS_CENTER: 'stock-ext.openHoldingsCenter',
  START_PROXY: 'stock-ext.startProxy',
  STOP_PROXY: 'stock-ext.stopProxy',
  PROXY_STATUS: 'stock-ext.proxyStatus',
  TOGGLE_STATUS_BAR: 'stock-ext.toggleStatusBarVisibility',
  LOCATE_WATCHLIST: 'stock-ext.locateWatchlist',
  OPEN_STOCK_DETAIL: 'stock-ext.openStockDetail',
  OPEN_STATUS_BAR_DETAIL: 'stock-ext.openStatusBarDetail',
  TOGGLE_STATUS_BAR_ICON: 'stock-ext.toggleStatusBarIconVisibility',
} as const;

export const EASTMONEY_HOST = 'https://push2.eastmoney.com/api/qt/ulist.np/get';
export const TENCENT_STOCK_HOST = 'https://qt.gtimg.cn/q';
export const API_TIMEOUT = 10000;
