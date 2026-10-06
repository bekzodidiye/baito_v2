/** A job's tags are not shown on its card, anywhere.
 *
 *  They were: `#TEZKOR #KUNLIKTO'LOV` on the employer's own list, raw tags on
 *  the worker's search results, the map card and the job details, and perk
 *  badges on the landing page. They are still the job's own data — the posting
 *  form offers them and the worker's search filters on them — they simply have
 *  no place on a card any more.
 *
 *  The filter chips are the one exception: a chip has to name the tag it
 *  filters by, and `tagLabel` is what names it.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname);

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(entry.name) && !entry.name.includes('.test.')) out.push(full);
  }
  return out;
};

/** Screens that legitimately handle tags as data rather than as card badges. */
const ALLOWED = new Set([
  // The posting form: this is where an employer picks them.
  'features/employer/components/JobPostStepOne.tsx',
  // The search screen: filter chips, named by tagLabel.
  'features/worker/search/JobSearchScreen.tsx',
  // The admin panel inspects a posting's stored data, tags included.
  'features/admin/JobDetailModal.tsx',
].map(p => p.split('/').join(path.sep)));

describe('job tags', () => {
  it('are rendered on no job card', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const rel = path.relative(SRC, file);
      if (ALLOWED.has(rel)) continue;
      const src = fs.readFileSync(file, 'utf8');
      for (const m of src.matchAll(/(job|selectedJob|j|foundJob)\.tags|perksForJob|perksUz/g)) {
        const line = src.slice(0, m.index).split('\n').length;
        offenders.push(`${rel}:${line}  ${m[0]}`);
      }
    }
    expect(offenders, `\n  ${offenders.join('\n  ')}\n`).toEqual([]);
  });

  it('scans a realistic number of screens', () => {
    expect(walk(SRC).length).toBeGreaterThan(80);
  });

  it('are still the job’s own data, and still drive the search filter', async () => {
    const { tagKey, tagLabel, PRESET_TAGS } = await import('./constants/perks');
    expect(PRESET_TAGS.length).toBeGreaterThan(0);
    expect(tagKey("#KunlikTo'lov")).toBe("kunlikto'lov");
    expect(tagLabel("#KunlikTo'lov", 'ru')).toContain('Ежедневная оплата');
  });
});
