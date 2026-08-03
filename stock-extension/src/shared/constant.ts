export const EXTENSION_ID = 'stock-ext';
export const VIEWS = {
  HOME: 'stockExtView.home',
  AGENT: 'stockExtView.agent',
  NEWS: 'stockExtView.news',
} as const;

export const COMMANDS = {
  OPEN_SETTINGS: 'stock-ext.openSettings',
  OPEN_STOCK_CENTER: 'stock-ext.openStockCenter',
  OPEN_STOCK_AGENT: 'stock-ext.openStockAgent',
  OPEN_SECTOR_BOARDS: 'stock-ext.openSectorBoards',
  OPEN_HOLDINGS_CENTER: 'stock-ext.openHoldingsCenter',
  START_PROXY: 'stock-ext.startProxy',
  STOP_PROXY: 'stock-ext.stopProxy',
  PROXY_STATUS: 'stock-ext.proxyStatus',
  TOGGLE_STATUS_BAR: 'stock-ext.toggleStatusBarVisibility',
  LOCATE_WATCHLIST: 'stock-ext.locateWatchlist',
  EDITOR_DISGUISE_TOGGLE: 'stock-ext.editorDisguise.toggle',
  EDITOR_DISGUISE_DISABLE: 'stock-ext.editorDisguise.disable',
  OPEN_STOCK_DETAIL: 'stock-ext.openStockDetail',
  TOGGLE_STATUS_BAR_ICON: 'stock-ext.toggleStatusBarIconVisibility',
} as const;

export const EASTMONEY_HOST = 'https://push2.eastmoney.com/api/qt/ulist.np/get';
export const TENCENT_STOCK_HOST = 'https://qt.gtimg.cn/q';
export const API_TIMEOUT = 10000;
