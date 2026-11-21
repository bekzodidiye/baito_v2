import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import L from 'leaflet';
import { useJobMarkers, getPrioritizedMapJobs, createJobMarkerIcon, createServerClusterMarkerIcon, isSafeImageUrl } from './useJobMarkers';
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

describe('useJobMarkers — Task D: Stored XSS Protection & Attribute Sanitization', () => {
  it('validates image URLs strictly and rejects dangerous schemes, backslashes, and normalization bypasses', () => {
    expect(isSafeImageUrl('https://cdn.baito.uz/logos/company.png')).toBe(true);
    expect(isSafeImageUrl('http://localhost:8000/media/logo.png')).toBe(true);
    expect(isSafeImageUrl('/uploads/logo.png')).toBe(true);
    expect(isSafeImageUrl('./images/logo.png')).toBe(true);
    expect(isSafeImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true);

    // Reject dangerous schemes, backslashes, and breakout vectors
    expect(isSafeImageUrl('/\\example.org/pixel.png')).toBe(false);
    expect(isSafeImageUrl('/\\\\example.org/pixel.png')).toBe(false);
    expect(isSafeImageUrl('\\\\example.org/pixel.png')).toBe(false);
    expect(isSafeImageUrl('/images%5clogo.png')).toBe(false);
    expect(isSafeImageUrl('/images%5Clogo.png')).toBe(false);
    expect(isSafeImageUrl('//attacker.com/evil.png')).toBe(false);
    expect(isSafeImageUrl('javascript:alert(document.cookie)')).toBe(false);
    expect(isSafeImageUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe(false);
    expect(isSafeImageUrl('vbscript:msgbox("XSS")')).toBe(false);
    expect(isSafeImageUrl('" onerror="alert(1)')).toBe(false);
    expect(isSafeImageUrl(null)).toBe(false);
    expect(isSafeImageUrl(undefined)).toBe(false);
    expect(isSafeImageUrl('')).toBe(false);
  });

  it('safely escapes HTML tags in job title, preventing stored XSS script injection', () => {
    const maliciousJob = createMockJob('xss-1', 41.3, 69.2, '<script>alert("XSS")</script>');
    const icon = createJobMarkerIcon(maliciousJob, false, 'uz');
    const html = (icon.options as any).html as string;

    // Must not contain raw executable script tag
    expect(html).not.toContain('<script>alert("XSS")</script>');
    // Must contain escaped safe entities
    expect(html).toContain('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
  });

  it('prevents attribute breakout in aria-label attribute', () => {
    const maliciousJob = createMockJob('xss-2', 41.3, 69.2, '" onfocus="alert(1)" autofocus="');
    const icon = createJobMarkerIcon(maliciousJob, false, 'uz');
    const html = (icon.options as any).html as string;

    // Attributes must be safely encoded, preventing attribute injection
    expect(html).not.toContain('aria-label="" onfocus="alert(1)"');
    expect(html).toContain('&quot; onfocus=&quot;alert(1)&quot; autofocus=&quot;');
  });

  it('safely rejects malicious javascript: logoUrl and falls back to safe placeholder SVG', () => {
    const maliciousJob = createMockJob('xss-3', 41.3, 69.2, 'Injected Logo Job');
    maliciousJob.logoUrl = 'javascript:alert(document.domain)';
    maliciousJob.company = 'Evil Corp <img src=x onerror=alert(2)>';

    const icon = createJobMarkerIcon(maliciousJob, false, 'uz');
    const html = (icon.options as any).html as string;

    // Must NOT contain javascript: URL
    expect(html).not.toContain('javascript:alert');
    // Must render the safe placeholder instead
    expect(html).toContain('marker-logo-placeholder');
    // Must not contain raw HTML injection from company
    expect(html).not.toContain('<img src=x onerror=alert(2)>');
  });

  it('correctly renders safe image URL with safely escaped company in alt attribute', () => {
    const safeJob = createMockJob('safe-1', 41.3, 69.2, 'Safe Job');
    safeJob.logoUrl = 'https://images.unsplash.com/photo-company.png';
    safeJob.company = 'Company & Co "Best"';

    const icon = createJobMarkerIcon(safeJob, false, 'uz');
    const html = (icon.options as any).html as string;

    expect(html).toContain('src="https://images.unsplash.com/photo-company.png"');
    expect(html).toContain('alt="Company &amp; Co &quot;Best&quot;"');
    expect(html).toContain('class="marker-logo-img"');
  });
});

describe('useJobMarkers — Task E: Marker Freshness & Visible Field Updates', () => {
  it('reflects updated title, company, and logoUrl in newly generated marker icons', () => {
    const jobV1 = createMockJob('job-update-1', 41.3, 69.2, 'Junior Python Dev');
    jobV1.company = 'Initial Startup';
    jobV1.logoUrl = 'https://cdn.example.com/logo-v1.png';

    const iconV1 = createJobMarkerIcon(jobV1, false, 'uz');
    const htmlV1 = (iconV1.options as any).html as string;
    expect(htmlV1).toContain('Junior Python Dev');
    expect(htmlV1).toContain('logo-v1.png');

    // Update job visible fields
    const jobV2 = {
      ...jobV1,
      title: 'Senior Lead Python Dev',
      company: 'Enterprise Corp',
      logoUrl: 'https://cdn.example.com/logo-v2.png',
      salary: '25000000',
    };

    const iconV2 = createJobMarkerIcon(jobV2, false, 'uz');
    const htmlV2 = (iconV2.options as any).html as string;
    expect(htmlV2).toContain('Senior Lead Python Dev');
    expect(htmlV2).toContain('logo-v2.png');
    expect(htmlV2).not.toContain('Junior Python Dev');
    expect(htmlV2).not.toContain('logo-v1.png');
  });

  it('triggers hook re-render and refreshes marker layer when displayedJobs visible fields change', () => {
    const mockLayers: L.Marker[] = [];
    const mockMarkerGroup = {
      clearLayers: vi.fn(() => {
        mockLayers.length = 0;
      }),
      addLayers: vi.fn((layers: L.Marker[]) => {
        mockLayers.push(...layers);
      }),
      addTo: vi.fn(),
    } as unknown as L.LayerGroup;

    const mockMap = {
      getBounds: vi.fn(() => L.latLngBounds([40.0, 68.0], [42.0, 70.0])),
      setView: vi.fn(),
    } as unknown as L.Map;

    const mapInstanceRef = { current: mockMap };
    const markerGroupRef = { current: mockMarkerGroup };
    const userGroupRef = { current: null };

    // Stable callback and empty jobs references to guarantee no false-positive re-runs
    const stableSetSelectedJob = vi.fn();
    const stableSetIsPanelExpanded = vi.fn();
    const staticEmptyJobs: Job[] = [];

    const jobV1 = createMockJob('job-hook-1', 41.3, 69.2, 'Initial Title');
    jobV1.company = 'Initial Company';
    jobV1.salary = '1000000';
    jobV1.logoUrl = 'https://cdn.example.com/logo-v1.png';

    const { rerender } = renderHook(
      ({ displayedJobs }) =>
        useJobMarkers({
          mapInstanceRef,
          markerGroupRef,
          userGroupRef,
          activeCluster: 'all',
          jobs: staticEmptyJobs,
          selectedJob: null,
          setSelectedJob: stableSetSelectedJob,
          userLocation: null,
          filterLocation: '',
          setIsPanelExpanded: stableSetIsPanelExpanded,
          displayedJobs,
          language: 'uz',
          isVisible: true,
        }),
      { initialProps: { displayedJobs: [jobV1] } }
    );

    // Initial render added the first marker
    expect(mockMarkerGroup.clearLayers).toHaveBeenCalledTimes(1);
    expect(mockLayers.length).toBe(1);
    const initialHtml = (mockLayers[0].options.icon as any).options.html as string;
    expect(initialHtml).toContain('Initial Title');
    expect(initialHtml).toContain('Initial Company');
    expect(initialHtml).toContain('logo-v1.png');

    // Update job visible fields and trigger hook rerender with untouched jobs: []
    const jobV2 = {
      ...jobV1,
      title: 'Updated Senior Title',
      company: 'Updated Super Company',
      salary: '25000000',
      logoUrl: 'https://cdn.example.com/logo-v2.png',
    };

    rerender({ displayedJobs: [jobV2] });

    // clearLayers was called again and new marker added with updated fields
    expect(mockMarkerGroup.clearLayers).toHaveBeenCalledTimes(2);
    expect(mockLayers.length).toBe(1);
    const updatedHtml = (mockLayers[0].options.icon as any).options.html as string;
    expect(updatedHtml).toContain('Updated Senior Title');
    expect(updatedHtml).toContain('Updated Super Company');
    expect(updatedHtml).toContain('logo-v2.png');
    expect(updatedHtml).not.toContain('Initial Title');
    expect(updatedHtml).not.toContain('Initial Company');
  });
});
