vi.mock('../../store/useAuthStore', () => ({
  useAuthStore: vi.fn((sel: (s: unknown) => unknown) =>
    sel({ language: 'uz', userProfile: { isVerified: true, firstName: 'Anvar' } })),
}));

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const postNewJob = vi.fn(async (_data: Record<string, unknown>) => true);

vi.mock('../../hooks/useEmployer', () => ({
  useEmployer: () => ({ postNewJob, language: 'uz', companyName: 'Baito' }),
}));

vi.mock('../../api/client', () => ({
  apiClient: vi.fn(async () => []),
}));

vi.mock('./components/JobLocationLeafletMap', () => ({
  JobLocationLeafletMap: () => <div data-testid="map" />,
}));

vi.mock('./components/JobPostStepThree.utils', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  searchAddressSuggestions: vi.fn(async () => []),
  reverseGeocodeAddressFull: vi.fn(async () => null),
}));

import { JobPostForm } from './JobPostForm';
import { DRAFT_STORAGE_KEY, STEP_STORAGE_KEY } from './useJobPostForm';

afterEach(cleanup);

describe('JobPostForm — Step and Draft Persistence across refreshes', () => {
  beforeEach(() => {
    postNewJob.mockClear();
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
    if (typeof localStorage !== 'undefined') localStorage.clear();
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', '/');
    }
  });

  it('restores directly to Step 3 with all data when refreshing on Step 3', async () => {
    // Simulate user having filled Step 1, Step 2 and being on Step 3 before refresh
    const draft = {
      title: 'Omborchi usta',
      category: 'retail',
      company: 'Baito Express',
      imageUrl: 'https://example.com/job.jpg',
      responsibilities: 'Omborda yuklarni tushirish va taxlash ishlari.',
      neededWorkers: '2',
      workDate: '2026-03-20',
      startTime: '08:00',
      endTime: '17:00',
      durationLabel: '2-3 kunlik',
      hourlyRate: '250000',
      transportRate: '30000',
      city: 'Samarqand',
      addressLine: "Ibn Sino ko'chasi, 21-uy",
      coordinateX: 39.6542,
      coordinateY: 66.9597,
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    localStorage.setItem(STEP_STORAGE_KEY, '3');

    // Mount component (simulating page refresh / reload)
    const { unmount } = render(<JobPostForm onBack={vi.fn()} onSubmitSuccess={vi.fn()} />);

    // Step 3 address input and submit button must be immediately visible without going back to Step 1
    const addressInput = screen.getByDisplayValue("Ibn Sino ko'chasi, 21-uy");
    expect(addressInput).toBeDefined();

    // Verify "E'lon qilish" publish button is present on step 3
    const submitBtn = screen.getByText("E'lon qilish");
    expect(submitBtn).toBeDefined();

    unmount();
  });

  it('restores directly to Step 2 with Step 1 data when refreshing on Step 2', async () => {
    const draft = {
      title: 'Kassir',
      category: 'retail',
      company: 'Baito Market',
      imageUrl: 'https://example.com/job.jpg',
      responsibilities: 'Kassada mijozlarga xizmat ko\'rsatish.',
      hourlyRate: '180000',
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    localStorage.setItem(STEP_STORAGE_KEY, '2');

    render(<JobPostForm onBack={vi.fn()} onSubmitSuccess={vi.fn()} />);

    // On Step 2, wage input should be visible with the draft value
    expect(screen.getByDisplayValue('180000')).toBeDefined();
    expect(screen.getByText('Davom etish')).toBeDefined();
  });

  it('safely falls back to Step 1 if Step 1 was incomplete even if step 3 was stored', async () => {
    // Incomplete draft (title too short, responsibilities missing)
    const draft = {
      title: 'Om',
      responsibilities: '',
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    localStorage.setItem(STEP_STORAGE_KEY, '3');

    render(<JobPostForm onBack={vi.fn()} onSubmitSuccess={vi.fn()} />);

    // Must be on Step 1, not Step 3
    expect(screen.getByPlaceholderText('Masalan: Omborda yuk tashuvchi / Kassir')).toBeDefined();
  });

  it('safely falls back to Step 1 if image was missing even if step 2 was stored', async () => {
    // Draft with title and responsibilities but missing imageUrl
    const draft = {
      title: 'Kassir',
      category: 'retail',
      responsibilities: 'Kassada mijozlarga xizmat ko\'rsatish.',
      hourlyRate: '180000',
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    localStorage.setItem(STEP_STORAGE_KEY, '2');

    render(<JobPostForm onBack={vi.fn()} onSubmitSuccess={vi.fn()} />);

    // Must fall back to Step 1
    expect(screen.getByPlaceholderText('Masalan: Omborda yuk tashuvchi / Kassir')).toBeDefined();
  });

  it('clears draft and stored step upon successful job submission', async () => {
    const draft = {
      title: 'Yuk ortuvchi',
      category: 'retail',
      company: 'Baito',
      imageUrl: 'https://example.com/job.jpg',
      responsibilities: 'Yuklarni ortish va tushirish.',
      neededWorkers: '1',
      workDate: '2026-03-20',
      startTime: '09:00',
      endTime: '18:00',
      durationLabel: '1 kunlik',
      hourlyRate: '200000',
      city: 'Toshkent',
      addressLine: "Chilonzor 9-mavze",
      coordinateX: 41.3,
      coordinateY: 69.2,
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    localStorage.setItem(STEP_STORAGE_KEY, '3');

    const onSubmitSuccess = vi.fn();
    render(<JobPostForm onBack={vi.fn()} onSubmitSuccess={onSubmitSuccess} />);

    fireEvent.click(screen.getByText("E'lon qilish"));

    await waitFor(() => expect(postNewJob).toHaveBeenCalledTimes(1));
    expect(onSubmitSuccess).toHaveBeenCalledTimes(1);

    // Storage must now be cleaned
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(STEP_STORAGE_KEY)).toBeNull();
  });
});
