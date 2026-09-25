import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { EmployerJobCard } from './EmployerJobCard';
import { Job } from '../../types';

afterEach(cleanup);

const job = {
  id: 'job-1',
  title: 'Ombor yuk tashuvchi',
  company: 'Baito',
  salary: "400 000 so'm",
  location: 'Toshkent',
  status: 'open',
  tags: [],
  coordinates: { x: 0, y: 0 },
  time: '',
  urgent: false,
  applied: false,
  bookmarked: false,
  description: '',
} as unknown as Job;

const renderCard = () => {
  const onDelete = vi.fn();
  const onComplete = vi.fn();
  render(
    <EmployerJobCard
      job={job}
      language="uz"
      onSelect={vi.fn()}
      onComplete={onComplete}
      onDelete={onDelete}
    />,
  );
  return { onDelete, onComplete };
};

describe('EmployerJobCard — deleting a posting asks first', () => {
  const deleteButton = () => {
    const buttons = screen.getAllByRole('button');
    return buttons[buttons.length - 1];
  };

  it('does not delete on the first press', () => {
    const { onDelete } = renderCard();
    fireEvent.click(deleteButton());
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('opens a dialog saying it cannot be undone', () => {
    renderCard();
    fireEvent.click(deleteButton());
    expect(screen.getByRole('dialog').textContent).toMatch(/ortga qaytarib bo'lmaydi/i);
  });

  it('deletes once confirmed', () => {
    const { onDelete } = renderCard();
    fireEvent.click(deleteButton());
    fireEvent.click(screen.getByRole('button', { name: /^O'chirish$/i }));
    expect(onDelete).toHaveBeenCalledWith('job-1');
  });

  it('cancelling keeps the posting', () => {
    const { onDelete } = renderCard();
    fireEvent.click(deleteButton());
    fireEvent.click(screen.getByRole('button', { name: /Bekor qilish/i }));
    expect(onDelete).not.toHaveBeenCalled();
  });
});

describe('EmployerJobCard — settlement is shown before the job status', () => {
  afterEach(cleanup);

  const renderWith = (over: Partial<Job>, onPayInvoice = vi.fn()) => {
    render(
      <EmployerJobCard
        job={{ ...job, ...over } as Job}
        language="uz"
        onSelect={vi.fn()}
        onComplete={vi.fn()}
        onDelete={vi.fn()}
        onPayInvoice={onPayInvoice}
      />,
    );
    return { onPayInvoice };
  };

  it('offers to pay once an invoice has been raised', () => {
    const { onPayInvoice } = renderWith({ status: 'completed', payoutStatus: 'invoiced' });
    const btn = screen.getByText("To'lov qilish");
    fireEvent.click(btn);
    expect(onPayInvoice).toHaveBeenCalledTimes(1);
  });

  it('says it is waiting once the employer has declared', () => {
    renderWith({ status: 'completed', payoutStatus: 'payment_declared' });
    expect(screen.getByText('Tasdiqlanishi kutilmoqda')).toBeTruthy();
    expect(screen.queryByText("To'lov qilish")).toBeNull();
  });

  it('says confirmed once an administrator has checked it', () => {
    renderWith({ status: 'completed', payoutStatus: 'payment_confirmed' });
    expect(screen.getByText("To'lov tasdiqlandi")).toBeTruthy();
  });

  /* The one that matters: a finished job with an unpaid invoice must not read
     as closed. "Yopildi" over money still owed is the failure this ordering
     exists to prevent. */
  it('does not call a finished job closed while its invoice is unpaid', () => {
    renderWith({ status: 'completed', payoutStatus: 'invoiced' });
    expect(screen.queryByText('Yopildi')).toBeNull();
  });

  it('still says closed when there was never an invoice', () => {
    renderWith({ status: 'completed', payoutStatus: null });
    expect(screen.getByText('Yopildi')).toBeTruthy();
  });
});
