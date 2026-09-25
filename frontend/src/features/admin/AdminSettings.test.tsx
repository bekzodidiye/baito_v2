import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { AdminSettings } from './AdminSettings';
import { SystemSettings } from './types';

afterEach(cleanup);

const settings = {
  platformFeePercent: 10,
  minHourlyRate: 15000,
  maintenanceMode: false,
  autoApproveJobs: true,
  autoExpireJobs: true,
  autoDeleteSpamJobs: true,
} as SystemSettings;

const save = (value: string) => {
  // Several cases call this more than once; without this the earlier render is
  // still mounted and the field lookup finds two of everything.
  cleanup();
  const onUpdateSettings = vi.fn();
  render(<AdminSettings settings={settings} onUpdateSettings={onUpdateSettings} />);
  fireEvent.change(screen.getByLabelText(/Platforma Komissiyasi/i), {
    target: { value },
  });
  fireEvent.click(screen.getByRole('button', { name: /saqlash/i }));
  return onUpdateSettings;
};

describe('AdminSettings — the commission rate', () => {
  it('saves the rate that was typed', () => {
    expect(save('25').mock.calls[0][0]).toMatchObject({ platformFeePercent: 25 });
  });

  it('saves a zero rate instead of swapping in the default', () => {
    // `parseFloat(fee) || 10` read a typed 0 as falsy, so a free month could
    // not be configured at all — it silently saved 10%.
    expect(save('0').mock.calls[0][0]).toMatchObject({ platformFeePercent: 0 });
  });

  it('falls back to the default when the box is empty', () => {
    expect(save('').mock.calls[0][0]).toMatchObject({ platformFeePercent: 10 });
  });

  it('will not submit a rate the API would reject', () => {
    // The API takes whole numbers from 0 to 50. The field carries those bounds,
    // so a fractional or out-of-range rate is stopped at the form rather than
    // making a round trip that comes back 422.
    expect(save('12.5').mock.calls.length).toBe(0);
    expect(save('900').mock.calls.length).toBe(0);
    expect(save('-5').mock.calls.length).toBe(0);
  });

  it('states those bounds on the field itself', () => {
    render(<AdminSettings settings={settings} onUpdateSettings={vi.fn()} />);
    const input = screen.getByLabelText(/Platforma Komissiyasi/i) as HTMLInputElement;
    expect([input.min, input.max, input.step]).toEqual(['0', '50', '1']);
  });
});
