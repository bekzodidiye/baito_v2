import { describe, it, expect } from 'vitest';
import { TAB_SLUGS, adminPath, tabFromSlug, DEFAULT_ADMIN_TAB } from './adminTabs';
import type { AdminTab } from './types';

const ALL_TABS = Object.keys(TAB_SLUGS) as AdminTab[];

/** The panel was one route with the section in component state: nothing in it
 *  could be linked to, a reload always landed on the overview, and `back` left
 *  the panel instead of going back a section. Every section is an address now,
 *  and this table is the only place the two spellings meet. */
describe('Every admin section has an address', () => {
  it('covers all 21 sections', () => {
    expect(ALL_TABS).toHaveLength(21);
  });

  it('gives each one a distinct slug', () => {
    const slugs = Object.values(TAB_SLUGS);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('builds the path the user asked for', () => {
    expect(adminPath('jobs')).toBe('/admin/jobs');
    expect(adminPath('daily_jobs')).toBe('/admin/daily-jobs');
    expect(adminPath('audit_logs')).toBe('/admin/audit-logs');
  });

  it('round-trips every section through its URL', () => {
    for (const tab of ALL_TABS) {
      expect(tabFromSlug(TAB_SLUGS[tab])).toBe(tab);
    }
  });

  it('uses kebab-case in URLs, never the snake_case ids', () => {
    for (const slug of Object.values(TAB_SLUGS)) {
      expect(slug).not.toContain('_');
      expect(slug).toMatch(/^[a-z][a-z-]*$/);
    }
  });

  it('still understands a hand-typed snake_case id', () => {
    expect(tabFromSlug('daily_jobs')).toBe('daily_jobs');
    expect(tabFromSlug('audit_logs')).toBe('audit_logs');
  });

  it('is not case-sensitive about it', () => {
    expect(tabFromSlug('Daily-Jobs')).toBe('daily_jobs');
  });

  it('returns null for something it does not recognise, so the panel can redirect', () => {
    expect(tabFromSlug('nonsense')).toBeNull();
    expect(tabFromSlug('')).toBeNull();
    expect(tabFromSlug(undefined)).toBeNull();
  });

  it('defaults to a section that exists', () => {
    expect(TAB_SLUGS[DEFAULT_ADMIN_TAB]).toBeTruthy();
  });
});
