// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import L from 'leaflet';
import { useJobMarkers, getPrioritizedMapJobs, createJobMarkerIcon, isSafeImageUrl } from './useJobMarkers';
import { Job } from '../../types';

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

describe('mobile useJobMarkers — Stored XSS Protection & Image URL Sanitization', () => {
  it('strictly sanitizes image URLs and rejects schemes, backslashes, and normalization bypasses', () => {
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

    expect(html).not.toContain('<script>alert("XSS")</script>');
    expect(html).toContain('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
  });

  it('prevents attribute breakout in aria-label attribute', () => {
    const maliciousJob = createMockJob('xss-2', 41.3, 69.2, '" onfocus="alert(1)" autofocus="');
    const icon = createJobMarkerIcon(maliciousJob, false, 'uz');
    const html = (icon.options as any).html as string;

    expect(html).not.toContain('aria-label="" onfocus="alert(1)"');
    expect(html).toContain('&quot; onfocus=&quot;alert(1)&quot; autofocus=&quot;');
  });

  it('safely rejects malicious javascript: logoUrl and falls back to safe placeholder SVG', () => {
    const maliciousJob = createMockJob('xss-3', 41.3, 69.2, 'Injected Logo Job');
    maliciousJob.logoUrl = 'javascript:alert(document.domain)';
    maliciousJob.company = 'Evil Corp <img src=x onerror=alert(2)>';

    const icon = createJobMarkerIcon(maliciousJob, false, 'uz');
    const html = (icon.options as any).html as string;

    expect(html).not.toContain('javascript:alert');
    expect(html).toContain('marker-logo-placeholder');
    expect(html).not.toContain('<img src=x onerror=alert(2)>');
  });
});

describe('mobile useJobMarkers — Marker Freshness & Visible Field Updates', () => {
  it('reflects updated title, company, and logoUrl in newly generated marker icons', () => {
    const jobV1 = createMockJob('job-update-1', 41.3, 69.2, 'Junior Mobile Dev');
    jobV1.company = 'Initial Startup';
    jobV1.logoUrl = 'https://cdn.example.com/logo-v1.png';

    const iconV1 = createJobMarkerIcon(jobV1, false, 'uz');
    const htmlV1 = (iconV1.options as any).html as string;
    expect(htmlV1).toContain('Junior Mobile Dev');
    expect(htmlV1).toContain('logo-v1.png');

    const jobV2 = {
      ...jobV1,
      title: 'Senior Lead Mobile Dev',
      company: 'Enterprise Corp',
      logoUrl: 'https://cdn.example.com/logo-v2.png',
      salary: '25000000',
    };

    const iconV2 = createJobMarkerIcon(jobV2, false, 'uz');
    const htmlV2 = (iconV2.options as any).html as string;
    expect(htmlV2).toContain('Senior Lead Mobile Dev');
    expect(htmlV2).toContain('logo-v2.png');
    expect(htmlV2).not.toContain('Junior Mobile Dev');
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

    const jobV1 = createMockJob('job-hook-1', 41.3, 69.2, 'Initial Mobile Title');
    jobV1.company = 'Initial Mobile Company';
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

    expect(mockMarkerGroup.clearLayers).toHaveBeenCalledTimes(1);
    expect(mockLayers.length).toBe(1);
    const initialHtml = (mockLayers[0].options.icon as any).options.html as string;
    expect(initialHtml).toContain('Initial Mobile Title');
    expect(initialHtml).toContain('Initial Mobile Company');
    expect(initialHtml).toContain('logo-v1.png');

    const jobV2 = {
      ...jobV1,
      title: 'Updated Senior Mobile Title',
      company: 'Updated Super Mobile Company',
      salary: '25000000',
      logoUrl: 'https://cdn.example.com/logo-v2.png',
    };

    rerender({ displayedJobs: [jobV2] });

    expect(mockMarkerGroup.clearLayers).toHaveBeenCalledTimes(2);
    expect(mockLayers.length).toBe(1);
    const updatedHtml = (mockLayers[0].options.icon as any).options.html as string;
    expect(updatedHtml).toContain('Updated Senior Mobile Title');
    expect(updatedHtml).toContain('Updated Super Mobile Company');
    expect(updatedHtml).toContain('logo-v2.png');
    expect(updatedHtml).not.toContain('Initial Mobile Title');
    expect(updatedHtml).not.toContain('Initial Mobile Company');
  });
});
