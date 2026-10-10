import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

const categories = vi.hoisted(() => ({ value: [] as any[] }));

vi.mock('./useAdminData', () => ({
  useAdminData: () => ({ categories: categories.value, refresh: vi.fn(), loading: false }),
}));
vi.mock('../../api/client', () => ({ apiClient: vi.fn() }));

import { AdminCategories } from './AdminCategories';

afterEach(cleanup);
beforeEach(() => { categories.value = []; });

/** The seeded categories were written with raw SQL, which skipped a column the
 *  model only defaults on ORM inserts. The screen read `cat.skills.map`, so one
 *  null field threw and the error boundary took the whole admin panel down. */
describe('AdminCategories — a category with no skills does not crash the panel', () => {
  it('renders a category whose skills are null', async () => {
    categories.value = [{
      id: 'c1', slug: 'retail', name: 'Chakana savdo', icon: null, description: null,
      commissionPercent: 2, skills: null, activeWorkersCount: 0, activeJobsCount: 0,
    }];

    render(<AdminCategories />);

    await waitFor(() => expect(screen.getByText('Chakana savdo')).toBeTruthy());
    // The section has nothing to list, so it is not there at all.
    expect(screen.queryByText(/Biriktirilgan Ko'nikmalar/)).toBeNull();
  });

  it('still lists skills when the category has them', async () => {
    categories.value = [{
      id: 'c2', slug: 'it', name: 'IT', icon: null, description: null,
      commissionPercent: 3, skills: ['React', 'Figma'], activeWorkersCount: 0, activeJobsCount: 0,
    }];

    render(<AdminCategories />);

    await waitFor(() => expect(screen.getByText('React')).toBeTruthy());
    expect(screen.getByText('Figma')).toBeTruthy();
    expect(screen.getByText(/Biriktirilgan Ko'nikmalar/)).toBeTruthy();
  });

  it('renders a mixed list without one bad row taking the others with it', async () => {
    categories.value = [
      { id: 'a', slug: 'a', name: 'Bittasi', commissionPercent: 1, skills: null,
        activeWorkersCount: 0, activeJobsCount: 0 },
      { id: 'b', slug: 'b', name: 'Ikkinchisi', commissionPercent: 2, skills: ['Kassa'],
        activeWorkersCount: 0, activeJobsCount: 0 },
    ];

    render(<AdminCategories />);

    await waitFor(() => expect(screen.getByText('Bittasi')).toBeTruthy());
    expect(screen.getByText('Ikkinchisi')).toBeTruthy();
    expect(screen.getByText('Kassa')).toBeTruthy();
  });
});
