/** A `t.someKey || 'Uzbek literal'` must not be the only thing that renders.
 *
 *  These read as translated — there is a `t.` lookup right there — but when
 *  the key is defined nowhere the lookup is undefined and the Uzbek literal
 *  beside it is what every reader gets, in every language. Five of them were
 *  live in production: the register flow's verification step and three labels
 *  on the worker profile.
 *
 *  A keyword sweep of the JSX cannot see these; the Uzbek sits behind a `||`
 *  that looks like defensive code.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname);

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) out.push(full);
  }
  return out;
};

const FILES = walk(SRC);

/** Every key defined in any module a `t` can come from. */
const definedKeys = (): Set<string> => {
  const keys = new Set<string>();
  const tables = FILES.filter(f =>
    f.includes(`${path.sep}translations${path.sep}`) ||
    /\.(i18n|content|utils|data|translations(\.\w\w)?)\.ts$/i.test(path.basename(f)) ||
    /translations/i.test(path.basename(f)));
  for (const f of tables) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/^\s*([a-zA-Z0-9_]+)\s*:/gm)) {
      keys.add(m[1]);
    }
  }
  return keys;
};

/** `t.key || 'literal'`, and the guarded forms around it:
 *  `(t && t.key) || '…'`, `t?.key || '…'`, `(t?.key) || '…'`.
 *  The first pass only matched the bare form, and `ChatListItem` wrote
 *  `(t && t.noConversation) || 'Suhbat mavjud emas'` — the key is
 *  `noConversations`, plural, so that Uzbek showed to every reader and this
 *  scan walked straight past it. */
const FALLBACK = /(?:\(\s*)?(?:\bt\s*&&\s*)?\bt\??\.([a-zA-Z0-9_]+)\s*\)?\s*\|\|\s*(['"])(.*?)\2/g;

describe('translation fallbacks', () => {
  it('scans a realistic number of files and keys', () => {
    // Guards the test itself: a broken path would make everything below pass.
    expect(FILES.length).toBeGreaterThan(100);
    expect(definedKeys().size).toBeGreaterThan(300);
  });

  it('never falls back to a literal for a key that is defined nowhere', () => {
    const keys = definedKeys();
    const leaks: string[] = [];
    for (const file of FILES) {
      for (const m of fs.readFileSync(file, 'utf8').matchAll(FALLBACK)) {
        if (!keys.has(m[1])) {
          leaks.push(`${path.relative(SRC, file)}: t.${m[1]} || ${JSON.stringify(m[3])}`);
        }
      }
    }
    expect(leaks, `Define these keys, or drop the lookup:\n  ${leaks.join('\n  ')}`).toEqual([]);
  });
});
