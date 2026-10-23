import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { useFocusTrap } from './useFocusTrap';

afterEach(cleanup);

const TestComponent = ({ isActive, onDismiss }: { isActive: boolean; onDismiss?: () => void }) => {
  const trapRef = useFocusTrap<HTMLDivElement>(isActive, onDismiss);

  return (
    <div>
      <button data-testid="outside-button">Outside</button>
      <div ref={trapRef} data-testid="trap-container" tabIndex={-1}>
        <button data-testid="btn-first">First</button>
        <input data-testid="input-middle" placeholder="Middle" />
        <button data-testid="btn-last">Last</button>
      </div>
    </div>
  );
};

describe('useFocusTrap', () => {
  it('focuses the first focusable element when activated', async () => {
    render(<TestComponent isActive={true} />);
    const firstBtn = screen.getByTestId('btn-first');
    await waitFor(() => {
      expect(document.activeElement).toBe(firstBtn);
    });
  });

  it('cycles focus from last element to first element on Tab', async () => {
    render(<TestComponent isActive={true} />);
    const firstBtn = screen.getByTestId('btn-first');
    const lastBtn = screen.getByTestId('btn-last');

    await waitFor(() => {
      expect(document.activeElement).toBe(firstBtn);
    });

    lastBtn.focus();
    expect(document.activeElement).toBe(lastBtn);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(firstBtn);
  });

  it('cycles focus from first element to last element on Shift+Tab', async () => {
    render(<TestComponent isActive={true} />);
    const firstBtn = screen.getByTestId('btn-first');
    const lastBtn = screen.getByTestId('btn-last');

    await waitFor(() => {
      expect(document.activeElement).toBe(firstBtn);
    });

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastBtn);
  });

  it('calls onDismiss when Escape is pressed', () => {
    const handleDismiss = vi.fn();
    render(<TestComponent isActive={true} onDismiss={handleDismiss} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('restores focus to previously active element on unmount/deactivation', async () => {
    const Harness = () => {
      const [active, setActive] = useState(false);
      return (
        <div>
          <button data-testid="trigger-btn" onClick={() => setActive(true)}>
            Open
          </button>
          {active && <TestComponent isActive={true} onDismiss={() => setActive(false)} />}
        </div>
      );
    };

    render(<Harness />);
    const trigger = screen.getByTestId('trigger-btn');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByTestId('btn-first'));
    });

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });
});
