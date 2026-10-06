/** All five tabs are on the screen.
 *
 *  The strip was `max-w-3xl` — 768px — and carried five tabs whose Uzbek labels
 *  ("To'lov kutilmoqda", "Tasdiqlanishi kutilmoqda") need 875px between them.
 *  So "Tarix" sat 107px past the right edge on every screen, behind a sideways
 *  scroll with nothing on the page to say it was there.
 *
 *  Measured against the built stylesheet at the width the strip actually gets
 *  inside the page's own `max-w-6xl`:
 *
 *      max-w-3xl   768px available, 875px needed, 107px hidden
 *      no cap     1104px available, 1104px needed, nothing hidden
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SCREEN = 'EmployerJobs.tsx';
const read = () => fs.readFileSync(path.resolve(__dirname, SCREEN), 'utf8');

/** The classes on the tab strip itself. */
const stripClasses = (): string => {
  const m = read().match(/className="(flex gap-1 p-1\.5 bg-slate-100\/80[^"]*)"/);
  if (!m) throw new Error('tab strip not found in EmployerJobs.tsx');
  return m[1];
};

describe('the tab strip', () => {
  it('takes no width cap of its own', () => {
    // The page around it is already max-w-6xl; a second, smaller cap here is
    // what pushed the last tab off the edge.
    expect(stripClasses()).not.toMatch(/\bmax-w-/);
  });

  it('uses the width it is given', () => {
    expect(stripClasses()).toContain('w-full');
  });

  it('still scrolls sideways, for the phones where five will not fit', () => {
    expect(stripClasses()).toContain('overflow-x-auto');
  });
});

describe('the tabs on it', () => {
  const tabIds = () =>
    [...read().matchAll(/\{ id: '([a-z_]+)' as const, icon:/g)].map(m => m[1]);

  it('are the five the strip has to hold', () => {
    expect(tabIds()).toEqual([
      'open', 'active', 'awaiting_payment', 'awaiting_confirmation', 'history',
    ]);
  });

  it('keep their own width rather than being squeezed to fit', () => {
    // `min-w-fit` is why the strip reports an honest scrollWidth instead of
    // silently crushing five labels into 768px.
    const button = read().match(/className=\{`flex-1 ([^`]*)`/);
    expect(button?.[1]).toContain('min-w-fit');
    expect(button?.[1]).toContain('whitespace-nowrap');
  });

  it('names all five in all three languages', () => {
    const labels = [...read().matchAll(
      /label: language === 'uz' \? "([^"]*)" : language === 'ru' \? "([^"]*)" : "([^"]*)"/g)];
    expect(labels).toHaveLength(5);
    for (const [, uz, ru, en] of labels) {
      expect(uz).toBeTruthy();
      expect(ru).toBeTruthy();
      expect(en).toBeTruthy();
      expect(ru, `Russian branch reads ${JSON.stringify(ru)}`).toMatch(/[а-яА-ЯёЁ]/);
    }
  });
});
