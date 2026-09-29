import { AdminTab } from './types';

/** The address of every admin page.
 *
 *  The panel was one route, /admin, with the section held in component state.
 *  That meant no section could be linked to, bookmarked, or reopened after a
 *  reload — every refresh dropped you back on the overview — and the browser's
 *  back button left the panel entirely instead of going back a section.
 *
 *  Tab ids are snake_case because that is what the components already switch
 *  on; URLs are kebab-case because that is what URLs are. One table, so the two
 *  cannot drift.
 */
export const TAB_SLUGS: Record<AdminTab, string> = {
  overview: 'overview',
  users: 'users',
  daily_jobs: 'daily-jobs',
  jobs: 'jobs',
  categories: 'categories',
  verifications: 'verifications',
  disputes: 'disputes',
  transactions: 'transactions',
  payouts: 'payouts',
  support: 'support',
  broadcast: 'broadcast',
  analytics: 'analytics',
  settings: 'settings',
  audit_logs: 'audit-logs',
  promotions: 'promotions',
  regions: 'regions',
  notifications: 'notifications',
  notification_rules: 'notification-rules',
  auto_moderation: 'auto-moderation',
  auto_matching: 'auto-matching',
  auto_reports: 'auto-reports',
  auto_escrow_docs: 'auto-escrow-docs',
};

export const DEFAULT_ADMIN_TAB: AdminTab = 'overview';

const BY_SLUG = Object.fromEntries(
  Object.entries(TAB_SLUGS).map(([tab, slug]) => [slug, tab as AdminTab]),
) as Record<string, AdminTab>;

/** The path for a section, e.g. `adminPath('daily_jobs') === '/admin/daily-jobs'`. */
export const adminPath = (tab: AdminTab): string => `/admin/${TAB_SLUGS[tab]}`;

/** The section a URL names, or null when it names none.
 *
 *  Accepts the snake_case id as well as the kebab slug: the ids are what the
 *  rest of the panel speaks, and a hand-typed /admin/daily_jobs should land
 *  somewhere sensible rather than on a blank screen.
 */
export const tabFromSlug = (slug?: string): AdminTab | null => {
  if (!slug) return null;
  const key = slug.toLowerCase();
  if (BY_SLUG[key]) return BY_SLUG[key];
  const asId = key.replace(/-/g, '_') as AdminTab;
  return TAB_SLUGS[asId] ? asId : null;
};
