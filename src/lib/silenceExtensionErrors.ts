/**
 * Clean error handler for browser extension/wallet script exceptions in sandboxed environments.
 */
if (typeof window !== 'undefined') {
  const IGNORED_PATTERNS = [
    'metamask',
    'trezor',
    'failed to get initial state',
    'sender wallet',
    'brave',
    'extension'
  ];

  const shouldIgnore = (message?: string): boolean => {
    if (!message || typeof message !== 'string') return false;
    const lower = message.toLowerCase();
    return IGNORED_PATTERNS.some(pattern => lower.includes(pattern));
  };

  window.addEventListener('error', (event: ErrorEvent) => {
    if (shouldIgnore(event.message) || shouldIgnore(event.filename)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reasonMsg = event.reason?.message || (typeof event.reason === 'string' ? event.reason : '');
    if (shouldIgnore(reasonMsg)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);
}
export {};
