/**
 * Recovers a tab that is running a bundle the server no longer has.
 *
 * Every route in this app is `React.lazy`, so the chunk names are only
 * resolved when the user navigates. After a deploy the file names change, and
 * a tab still holding the previous index.html asks for chunks that now 404 —
 * nginx answers with its HTML error page, the browser tries to parse it as a
 * module, and the app dies with "Unexpected token '<'". The user just sees
 * "something went wrong" and no amount of clicking fixes it.
 *
 * The correct recovery is a single reload, which picks up the current
 * index.html. A flag in sessionStorage makes sure a genuinely broken build
 * cannot put the tab into a reload loop.
 */

const RELOAD_FLAG = 'baito_chunk_reload_at';
const RELOAD_COOLDOWN_MS = 30_000;

const CHUNK_ERROR_PATTERNS = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'unexpected token \'<\'',
  'importing a module script failed',
  'unable to preload css',
];

function looksLikeStaleChunk(message: unknown): boolean {
  if (typeof message !== 'string') return false;
  const lower = message.toLowerCase();
  return CHUNK_ERROR_PATTERNS.some((pattern) => lower.includes(pattern));
}

function reloadOnce(): void {
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(RELOAD_FLAG) ?? 0);
  } catch {
    // Private mode or blocked storage — fall through and reload anyway.
  }

  if (Date.now() - last < RELOAD_COOLDOWN_MS) {
    // Already tried recently. Reloading again would spin, so let the error
    // surface to the error boundary instead.
    return;
  }

  try {
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
  } catch {
    /* ignore */
  }

  window.location.reload();
}

export function installStaleChunkRecovery(): void {
  // Vite fires this when a preloaded chunk cannot be fetched.
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    reloadOnce();
  });

  window.addEventListener('error', (event) => {
    if (looksLikeStaleChunk(event.message)) reloadOnce();
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message =
      typeof reason === 'string' ? reason : (reason as Error | undefined)?.message;
    if (looksLikeStaleChunk(message)) reloadOnce();
  });
}
