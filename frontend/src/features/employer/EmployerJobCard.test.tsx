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
