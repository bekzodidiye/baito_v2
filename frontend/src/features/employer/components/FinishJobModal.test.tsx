/** A day closes once it has arrived, and the modal says so before the click.
 *
 *  Every pending day got a live "Finish" button, tomorrow's included. Each
 *  close releases that day's escrow, so an employer could pay a worker in
 *  full for shifts nobody had worked — and once the server started refusing
 *  that, the button was simply a way to earn an error.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const days = vi.hoisted(() => ({ current: [] as unknown[] }));

vi.mock('../../../api/queries', () => ({
  fetchJobDaysApi: vi.fn(async () => days.current),
  completeJobDayApi: vi.fn(async () => ({ success: true })),
}));

import { FinishJobModal } from './FinishJobModal';

const TASHKENT_OFFSET = 5 * 60 * 60 * 1000;
const dayFrom = (offset: number) =>
  new Date(Date.now() + TASHKENT_OFFSET + offset * 86_400_000)
    .toISOString().slice(0, 10);

const YESTERDAY = dayFrom(-1);
const TODAY = dayFrom(0);
const TOMORROW = dayFrom(1);

const draw = (language = 'ru') => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <FinishJobModal
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        jobTitle="Sinov"
        language={language}
        jobId="job-1"
      />
    </QueryClientProvider>,
  );
};

const row = (date: string) => screen.getByText(date).closest('div')?.parentElement;

afterEach(cleanup);
beforeEach(() => {
  days.current = [
    { id: 'd0', workDate: YESTERDAY, status: 'pending', amount: 100000 },
    { id: 'd1', workDate: TODAY, status: 'pending', amount: 100000 },
    { id: 'd2', workDate: TOMORROW, status: 'pending', amount: 100000 },
  ];
});

describe('the days on a posting', () => {
  it('offers no button for a day that has not arrived', async () => {
    draw();
    await screen.findByText(TOMORROW);

    expect(row(TOMORROW)?.querySelector('button')).toBeNull();
    expect(row(TOMORROW)?.textContent).toContain('Ещё не наступил');
  });

  it('offers one for today', async () => {
    draw();
    await screen.findByText(TODAY);

    expect(row(TODAY)?.querySelector('button')).not.toBeNull();
  });

  it('offers one for a day already gone by', async () => {
    // A Friday shift is often settled on Monday.
    draw();
    await screen.findByText(YESTERDAY);

    expect(row(YESTERDAY)?.querySelector('button')).not.toBeNull();
  });

  it('says it in the reader’s language', async () => {
    for (const [lang, said] of [['uz', 'Hali kelmadi'], ['en', 'Not yet']] as const) {
      cleanup();
      draw(lang);
      await screen.findByText(TOMORROW);
      expect(row(TOMORROW)?.textContent, lang).toContain(said);
    }
  });

  it('still marks a finished day paid rather than pending', async () => {
    // Two days, because a single-day posting shows no day list at all — it is
    // finished by the one button below, not day by day.
    days.current = [
      { id: 'd1', workDate: TODAY, status: 'completed', amount: 100000 },
      { id: 'd2', workDate: TOMORROW, status: 'pending', amount: 100000 },
    ];
    draw();
    await screen.findByText(TODAY);

    expect(row(TODAY)?.textContent).toContain('Оплачен');
    expect(row(TODAY)?.querySelector('button')).toBeNull();
  });
});
