vi.mock('../../store/useAuthStore', () => ({
  useAuthStore: vi.fn((sel: (s: unknown) => unknown) =>
    sel({ language: 'uz', userProfile: { isVerified: true, firstName: 'Anvar' } })),
}));

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const postNewJob = vi.fn(async (_data: Record<string, unknown>) => true);

vi.mock('../../hooks/useEmployer', () => ({
  useEmployer: () => ({ postNewJob, language: 'uz', companyName: 'Baito' }),
}));

vi.mock('../../api/client', () => ({
  apiClient: vi.fn(async () => []),
}));

// The map is a third-party widget over the network; the address the form
// submits comes from the text field beside it.
vi.mock('./components/JobLocationYandexMap', () => ({
  JobLocationYandexMap: () => <div data-testid="map" />,
}));

vi.mock('./components/JobPostStepThree.utils', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  searchAddressSuggestions: vi.fn(async () => []),
  reverseGeocodeAddressFull: vi.fn(async () => null),
}));

import { JobPostForm } from './JobPostForm';

const UZ = {
  title: 'Masalan: Omborda yuk tashuvchi / Kassir',
  responsibilities: '1. Yuklarni tushirish va joylash...',
  wage: '200000',
  address: "Masalan: Ibn Sino ko'chasi, 17A",
};

const typeInto = (placeholder: string, value: string) =>
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });

const clickContinue = () => fireEvent.click(screen.getByText('Davom etish'));

const fillStepOne = () => {
  typeInto(UZ.title, 'Omborchi');
  typeInto(UZ.responsibilities, 'Omborda yuk ortish va tushirish ishlari.');
};

afterEach(cleanup);

/**
 * The hook no longer substitutes a wage, a location, a date or a shift for a
 * field left blank (useEmployer.postNewJob.test.tsx). That is only safe while
 * this form remains the sole way to reach it and refuses to submit without
 * them — so the guard is tested here, not assumed.
 */
describe('JobPostForm — the guard that stands where the invented defaults used to', () => {
  beforeEach(() => postNewJob.mockClear());

  it('will not move past the wage step while the wage is blank', async () => {
    render(<JobPostForm onBack={vi.fn()} onSubmitSuccess={vi.fn()} />);

    fillStepOne();
    clickContinue();
    await screen.findByPlaceholderText(UZ.wage);

    // Step two opens with an empty wage, which is the state the hook used to
    // paper over with "200000 UZS".
    expect(screen.getByPlaceholderText(UZ.wage)).toHaveProperty('value', '');
    clickContinue();

    // Still on step two: no address field, and nothing was posted.
    expect(screen.queryByPlaceholderText(UZ.address)).toBeNull();
    expect(postNewJob).not.toHaveBeenCalled();
  });

  it('refuses a wage of zero', async () => {
    render(<JobPostForm onBack={vi.fn()} onSubmitSuccess={vi.fn()} />);

    fillStepOne();
    clickContinue();
    await screen.findByPlaceholderText(UZ.wage);
    typeInto(UZ.wage, '0');
    clickContinue();

    expect(screen.queryByPlaceholderText(UZ.address)).toBeNull();
    expect(postNewJob).not.toHaveBeenCalled();
  });

  it('will not publish without an address', async () => {
    render(<JobPostForm onBack={vi.fn()} onSubmitSuccess={vi.fn()} />);

    fillStepOne();
    clickContinue();
    await screen.findByPlaceholderText(UZ.wage);
    typeInto(UZ.wage, '450000');
    clickContinue();
    await screen.findByPlaceholderText(UZ.address);

    fireEvent.click(screen.getByText("E'lon qilish"));

    expect(postNewJob).not.toHaveBeenCalled();
  });

  it('hands the hook every figure the hook no longer fills in', async () => {
    render(<JobPostForm onBack={vi.fn()} onSubmitSuccess={vi.fn()} />);

    fillStepOne();
    clickContinue();
    await screen.findByPlaceholderText(UZ.wage);
    typeInto(UZ.wage, '450000');
    clickContinue();
    await screen.findByPlaceholderText(UZ.address);
    typeInto(UZ.address, "Ibn Sino ko'chasi, 17A");

    fireEvent.click(screen.getByText("E'lon qilish"));

    await waitFor(() => expect(postNewJob).toHaveBeenCalledTimes(1));
    const posted = postNewJob.mock.calls[0][0];

    for (const field of ['salary', 'location', 'rawLocation', 'durationLabel', 'workDate', 'workTime', 'description']) {
      expect(posted[field], `the form left ${field} for the hook to invent`).toBeTruthy();
    }
    expect(posted.salary).toBe('450000 UZS');
    expect(posted.location).toBe("Toshkent, Ibn Sino ko'chasi, 17A");
  });
});
