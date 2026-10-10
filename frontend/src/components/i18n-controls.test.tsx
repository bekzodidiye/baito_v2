import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const language = vi.hoisted(() => ({ current: 'ru' as 'uz' | 'ru' | 'en' }));

vi.mock('../store/useAuthStore', () => ({
  useAuthStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) => selector({ language: language.current }),
    { getState: () => ({ language: language.current }) },
  ),
}));
vi.mock('../../store/useAuthStore', () => ({
  useAuthStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) => selector({ language: language.current }),
    { getState: () => ({ language: language.current }) },
  ),
}));
vi.mock('../../../store/useUIStore', () => ({
  useUIStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ setJobsView: vi.fn() }),
}));
vi.mock('../../../store/useAuthStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ language: language.current }),
}));

import { ErrorBoundary } from './ErrorBoundary';
import { MapViewCallout } from '../features/worker/search/MapViewCallout';

afterEach(cleanup);
beforeEach(() => { language.current = 'ru'; });

const Boom = () => { throw new Error('boom'); };
const body = () => document.body.textContent ?? '';

/** Two of the leftovers, and the two most awkward ones.
 *
 *  ErrorBoundary is a class component, so it cannot call a hook — which is
 *  presumably why its copy was written in Uzbek and left there. It reads the
 *  store directly instead.
 *
 *  MapViewCallout had no reference to the language anywhere in the file. */
describe('ErrorBoundary — even the crash screen is in the right language', () => {
  it('reports the failure in Russian', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByText('Что-то пошло не так')).toBeTruthy();
    expect(body()).not.toContain('Nimadir xato ketdi');
    spy.mockRestore();
  });

  it('and in Uzbek when Uzbek is chosen', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    language.current = 'uz';
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByText('Nimadir xato ketdi')).toBeTruthy();
    spy.mockRestore();
  });
});

describe('MapViewCallout — the card that had no language in it at all', () => {
  it('speaks Russian to a Russian reader', () => {
    render(<MapViewCallout setCurrentScreen={vi.fn()} />);
    expect(body()).toContain('Ищите работу рядом с вами на карте');
    expect(body()).not.toContain("O'zingizga yaqin ishlarni xaritadan izlang");
  });

  it('speaks English to an English one', () => {
    language.current = 'en';
    render(<MapViewCallout setCurrentScreen={vi.fn()} />);
    expect(body()).toContain('Find work near you on the map');
  });

  it('still speaks Uzbek when Uzbek is chosen', () => {
    language.current = 'uz';
    render(<MapViewCallout setCurrentScreen={vi.fn()} />);
    expect(body()).toContain("O'zingizga yaqin ishlarni xaritadan izlang");
  });
});
