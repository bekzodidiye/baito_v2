import { describe, it, expect } from 'vitest';
import L from 'leaflet';
import { getPrioritizedMapJobs, createJobMarkerIcon, createServerClusterMarkerIcon } from './useJobMarkers';
import { Job } from '../../types';

// Mock helper to generate dummy jobs with specified coordinates
const createMockJob = (id: string, lat: number, lng: number, title: string = 'Test Job'): Job => ({
  id,
  title,
  company: 'Baito Corp',
  salary: '1000000',
  salaryCurrency: 'UZS',
  location: 'Toshkent',
  rawLocation: 'Toshkent',
  workDate: '2026-10-30',
  workTime: '09:00 - 18:00',
  status: 'open',
  applied: false,
  bookmarked: false,
  coordinates: { x: 50, y: 50 },
  time: '09:00 - 18:00',
  description: 'Test Job Description',
  tags: ['it'],
  coordinateX: lat,
  coordinateY: lng,
  latitude: lat,
  longitude: lng,
  category: 'it',
  neededWorkers: '1',
  vacancies: 1,
  hiredCount: 0,
  urgent: false,
  createdAt: new Date().toISOString(),
});

describe('useJobMarkers — Task A: Marker Truncation & Viewport Prioritization', () => {
  // Simulating Tashkent viewport: Lat 41.2 to 41.4, Lng 69.1 to 69.3
  const viewportBounds = L.latLngBounds([41.2, 69.1], [41.4, 69.3]);

  it('preserves visible jobs that occur after index 120 (fixing the slice(0, 120) truncation bug)', () => {
    // Generate 150 jobs outside the viewport (e.g. Samarkand / Bukhara at lat 39.6)
    const offscreenJobs: Job[] = Array.from({ length: 150 }, (_, i) =>
      createMockJob(`offscreen-${i}`, 39.65, 66.95, `Offscreen Job ${i}`)
    );

    // Generate 10 jobs strictly inside the viewport (Tashkent at lat 41.3)
    const inViewportJobs: Job[] = Array.from({ length: 10 }, (_, i) =>
      createMockJob(`tashkent-${i}`, 41.31, 69.24, `Tashkent Job ${i}`)
    );

    // In the old code: displayedJobs.slice(0, 120) would take ONLY offscreen-0..119,
    // completely omitting ALL tashkent-0..9 jobs even though they are inside the viewport!
    const allJobs = [...offscreenJobs, ...inViewportJobs];
    expect(allJobs.length).toBe(160);

    // Test with maxPins = 120 to verify truncation prioritization when over capacity
    const prioritized = getPrioritizedMapJobs(allJobs, null, viewportBounds, null, 120);

    // All 10 visible jobs must be present in the output!
    const visibleIdsInResult = prioritized.filter(j => j.id.startsWith('tashkent-'));
    expect(visibleIdsInResult.length).toBe(10);

    // Total returned should respect the maxPins limit
    expect(prioritized.length).toBe(120);
  });

  it('guarantees the selected job is never omitted, even if it is offscreen or far back in the array', () => {
    // 200 offscreen jobs
    const offscreenJobs: Job[] = Array.from({ length: 200 }, (_, i) =>
      createMockJob(`offscreen-${i}`, 38.0, 65.0, `Job ${i}`)
    );

    const selectedJobId = 'offscreen-185'; // Far past index 120
    const prioritized = getPrioritizedMapJobs(offscreenJobs, selectedJobId, viewportBounds, null, 100);

    // Selected job must be the very first item
    expect(prioritized[0].id).toBe(selectedJobId);
    expect(prioritized.some(j => j.id === selectedJobId)).toBe(true);
    expect(prioritized.length).toBe(100);
  });

  it('does not truncate anything when displayedJobs is within maxPins capacity', () => {
    const jobs = Array.from({ length: 85 }, (_, i) =>
      createMockJob(`job-${i}`, 41.3, 69.2)
    );

    const prioritized = getPrioritizedMapJobs(jobs, null, viewportBounds, null, 500);
    expect(prioritized.length).toBe(85);
    expect(prioritized).toEqual(jobs);
  });

  it('gracefully handles null or uninitialized mapBounds without crashing', () => {
    const jobs = Array.from({ length: 60 }, (_, i) =>
      createMockJob(`job-${i}`, 41.3, 69.2)
    );

    const prioritized = getPrioritizedMapJobs(jobs, null, null, null, 50);
    expect(prioritized.length).toBe(50);
  });
});

describe('useJobMarkers — Task B: Selected Marker Visual State & Accessibility', () => {
  const mockJob = createMockJob('test-job-1', 41.3, 69.2, 'Senior React Developer');

  it('creates an unselected icon with default category colors and without marker-selected class', () => {
    const icon = createJobMarkerIcon(mockJob, false, 'uz');
    const html = (icon.options as any).html as string;
    const className = (icon.options as any).className as string;

    expect(className).toBe('custom-job-marker-test-job-1');
    expect(className).not.toContain('marker-selected');
    expect(html).not.toContain('border: 2.5px solid #000666');
    expect(html).toContain('Senior React Developer');
    // Accessibility attributes
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('role="button"');
    expect(html).toContain('aria-label="Senior React Developer"');
  });

  it('creates a selected icon with brand-primary border (#000666), marker-selected class and enlarged scale', () => {
    const icon = createJobMarkerIcon(mockJob, true, 'uz');
    const html = (icon.options as any).html as string;
    const className = (icon.options as any).className as string;

    expect(className).toContain('marker-selected');
    expect(html).toContain('border: 2.5px solid #000666');
    expect(html).toContain('border-t-color: #000666');
    expect(html).toContain('background-color: #000666');
    expect(html).toContain('scale-110');
    // Preserves accessibility
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('role="button"');
  });
});


describe('useJobMarkers — Task C: Server-Side Cluster Marker Icon & Accessibility', () => {
  it('creates a cluster icon displaying the job count with brand-primary styling and accessible attributes', () => {
    const icon = createServerClusterMarkerIcon(45);
    const html = (icon.options as any).html as string;
    const className = (icon.options as any).className as string;

    expect(className).toContain('custom-server-cluster-marker');
    expect(className).toContain('cluster-count-45');
    expect(html).toContain('45');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('role="button"');
    expect(html).toContain('aria-label="45 ta ish o\'rni"');
    expect(html).toContain('background-color: var(--color-brand-primary, #000666)');
  });
});
