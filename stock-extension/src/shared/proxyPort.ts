let currentPort = 19101;

export function setProxyPort(p: number) {
  currentPort = p;
}

export function getProxyPort(): number {
  return currentPort;
}
