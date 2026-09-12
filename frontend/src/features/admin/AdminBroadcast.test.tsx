import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { AdminBroadcast } from './AdminBroadcast';

afterEach(cleanup);

const fill = () => {
  const boxes = screen.getAllByRole('textbox');
  fireEvent.change(boxes[0], { target: { value: 'Muhim xabar' } });
  fireEvent.change(boxes[1], { target: { value: 'Barchaga xabar matni' } });
};

describe('AdminBroadcast — messaging every user on the platform', () => {
  it('does not send on the first press', () => {
    const onSendBroadcast = vi.fn();
    render(<AdminBroadcast onSendBroadcast={onSendBroadcast} />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: /yubor/i }));
    expect(onSendBroadcast).not.toHaveBeenCalled();
  });

  it('says who will receive it before sending', () => {
    render(<AdminBroadcast onSendBroadcast={vi.fn()} />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: /yubor/i }));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('sends once confirmed', () => {
    const onSendBroadcast = vi.fn();
    render(<AdminBroadcast onSendBroadcast={onSendBroadcast} />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: /yubor/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Yuborish$/i }));
    expect(onSendBroadcast).toHaveBeenCalledWith('Muhim xabar', 'Barchaga xabar matni', 'all');
  });
});
