/** The job cards line up, and nothing on them spills out of place.
 *
 *  Reported from the employer's "E'lonlarim" screen: text out of place, cards
 *  too small. Measured at 1663x965 — the window it was reported from, where the
 *  sidebar takes 256px — three things were wrong at once.
 *
 *  Four columns from 1280px left every card 330px wide, so the title, the
 *  address and the status label all had to be cut to fit.
 *
 *  `workDate` holds every day a shift is worked, comma-separated, and went onto
 *  the card whole. Three and four day postings wrapped onto three lines, which
 *  pushed the calendar icon beside them into the middle of the block.
 *
 *  And the cards in a row stretch to the tallest, but the action row sat right
 *  under the content — so a posting with less to say left a hole beneath its
 *  button while its neighbours' buttons sat 55px lower.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8');
const CARD = 'EmployerJobCard.tsx';
const SCREEN = 'EmployerJobs.tsx';

/** Every className on the status control of each branch of the footer.
 *
 *  Scoped to the footer rather than to `w-full`, which the thumbnail has too.
 */
const statusControlClasses = (): string[] => {
  const src = read(CARD);
  const footer = src.slice(src.indexOf('Footer Actions'), src.indexOf('Workers Counter'));
  return [...footer.matchAll(/className="(w-full[^"]*)"/g)].map(m => m[1]);
};

describe('the cards in a row end level with each other', () => {
  it('fills the height of its grid cell', () => {
    // Without this the card is only as tall as its content and the row looks
    // ragged; with it the footer has a floor to sit on.
    expect(read(CARD)).toMatch(/className="bg-white rounded-2xl[^"]*\bh-full\b/);
  });

  it('keeps the action row on the floor of the card', () => {
    expect(read(CARD)).toMatch(/\bmt-auto\b[^"]*"\s*>\s*\n\s*\{\/\* Status/);
  });

  it('lets the grid stretch its cells', () => {
    expect(read(SCREEN)).toContain('items-stretch');
  });
});

describe('the number of columns follows the width of a card', () => {
  const grid = () => {
    const m = read(SCREEN).match(/className="grid grid-cols-\[([^\]]*\]*)[^"]*"/);
    if (!m) throw new Error('job grid not found in EmployerJobs.tsx');
    return m[0];
  };

  it('sizes columns by a minimum card width, not by breakpoints', () => {
    expect(grid()).toContain('auto-fill');
    expect(grid()).toMatch(/minmax\(min\(340px,100%\),1fr\)/);
  });

  it('never pins a column count to a screen size', () => {
    // `xl:grid-cols-4` on a 1663px screen was the whole problem: the window is
    // wide, the content area is not.
    expect(grid()).not.toMatch(/\b(sm|md|lg|xl|2xl):grid-cols-/);
  });

  it('collapses rather than overflow on a narrow phone', () => {
    // `min(340px,100%)` is what stops a 340px track on a 320px screen.
    expect(grid()).toContain('min(340px,100%)');
  });
});

describe('the status control is one height whatever the status', () => {
  it('covers every branch of the footer', () => {
    // Ten since `cancelled` and `pending` got branches of their own; they used to fall through
    // to the last `else` and read "Kutilyapti".
    expect(statusControlClasses()).toHaveLength(10);
  });

  it('gives all of them the same height', () => {
    // The buttons already had the project's 44px minimum touch target and the
    // static pills did not, so the row jumped between 34px and 44px depending
    // on what a posting's status happened to be.
    for (const cls of statusControlClasses()) {
      expect(cls, cls).toMatch(/\bh-11\b/);
      expect(cls, cls).not.toMatch(/\bpy-2\b/);
    }
  });

  it('lets each of them shrink instead of forcing the row wider', () => {
    for (const cls of statusControlClasses()) {
      expect(cls, cls).toMatch(/\bmin-w-0\b/);
    }
  });

  it('puts every label in something that truncates', () => {
    // Otherwise "Tasdiqlanishi kutilmoqda" wraps and makes that one card taller.
    const labels = read(CARD).match(/<span className="truncate">/g) || [];
    expect(labels).toHaveLength(10);
  });
});

describe('what the card says about the days worked', () => {
  it('does not print the raw field', () => {
    // `{job.workDate}` is the whole comma-separated list.
    expect(read(CARD)).not.toMatch(/\{job\.workDate\}/);
    expect(read(CARD)).toContain('workDateSummary');
  });

  it('keeps the address and the days each on one line', () => {
    const src = read(CARD);
    const meta = src.slice(src.indexOf('<MapPin'), src.indexOf('Footer Actions'));
    expect((meta.match(/\btruncate\b/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('carries the full list in a tooltip instead', () => {
    expect(read(CARD)).toContain('title={dates.full}');
  });
});
