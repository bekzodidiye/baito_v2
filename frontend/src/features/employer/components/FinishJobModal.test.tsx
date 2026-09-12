import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { FinishJobModal } from './FinishJobModal';

afterEach(cleanup);

const renderModal = () => {
  const onConfirm = vi.fn();
  render(
    <FinishJobModal
      isOpen
      onClose={vi.fn()}
      onConfirm={onConfirm}
      jobTitle="Ombor yuk tashuvchi"
      language="uz"
    />,
  );
  return { onConfirm };
};

const submit = () =>
  fireEvent.click(screen.getByRole('button', { name: /Yakunlash va Tasdiqlash/i }));

describe('FinishJobModal — completing a job is a deliberate step', () => {
  it('completes nothing just by opening', () => {
    const { onConfirm } = renderModal();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('passes the rating, review and bonus on submit', () => {
    const { onConfirm } = renderModal();
    const [review, bonus] = screen.getAllByRole('textbox');
    fireEvent.change(review, { target: { value: "A'lo ishchi" } });
    fireEvent.change(bonus, { target: { value: '25000' } });
    submit();
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ review: "A'lo ishchi", bonus: 25000 }),
    );
  });

  it('reads a bonus typed with spaces as one number', () => {
    // The bonus is now a real debit against the employer, so "25 000" must
    // not arrive as 25.
    const { onConfirm } = renderModal();
    const [, bonus] = screen.getAllByRole('textbox');
    fireEvent.change(bonus, { target: { value: '25 000' } });
    submit();
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ bonus: 25000 }));
  });

  it('sends no bonus when the field is left empty', () => {
    const { onConfirm } = renderModal();
    submit();
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ bonus: 0 }));
  });
});
