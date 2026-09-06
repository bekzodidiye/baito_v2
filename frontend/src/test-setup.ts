/**
 * Give the test environment the storage a browser has.
 *
 * jsdom 25 does provide `localStorage` when you build a window yourself, but
 * under Vitest's jsdom environment on Node 26 neither `window.localStorage` nor
 * the bare global survives — Node ships a `localStorage` global of its own,
 * undefined unless the process was started with `--localstorage-file`, and it
 * ends up shadowing jsdom's.
 *
 * That matters more than it looks. The app reads the bare global, exactly as a
 * browser provides it, and wraps every read in `safeGetItem`'s try/catch. So
 * without this, storage-backed tests would not fail — they would quietly pass
 * against a store that had read nothing, which is worse.
 *
 * The implementation below follows the Web Storage semantics the app depends
 * on: values are strings, a missing key reads as null, and `clear` empties it.
 */
class MemoryStorage implements Storage {
  #entries = new Map<string, string>();

  get length(): number {
    return this.#entries.size;
  }

  key(index: number): string | null {
    return [...this.#entries.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.#entries.has(key) ? this.#entries.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    // Storage stringifies, and code that relies on that should keep working.
    this.#entries.set(String(key), String(value));
  }

  removeItem(key: string): void {
    this.#entries.delete(key);
  }

  clear(): void {
    this.#entries.clear();
  }

  [name: string]: unknown;
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  const existing = (globalThis as unknown as Record<string, unknown>)[name];
  if (!existing) {
    const storage = new MemoryStorage();
    for (const target of [globalThis, typeof window !== 'undefined' ? window : undefined]) {
      if (!target) continue;
      Object.defineProperty(target, name, {
        value: storage,
        configurable: true,
        writable: true,
      });
    }
  }
}
