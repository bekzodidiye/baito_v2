import { describe, it, expect, vi } from 'vitest';
import { clickable } from './clickable';

/**
 * `clickable` exists because several real actions are driven from a plain
 * `<div onClick>`, which a keyboard cannot reach. If it silently stopped
 * handling Enter or Space, those actions would go back to being pointer-only
 * and nothing else would notice.
 */
const keyEvent = (key: string) => {
  const preventDefault = vi.fn();
  return { event: { key, preventDefault } as never, preventDefault };
};

describe('clickable', () => {
  it('gives the element the role and focusability a button has', () => {
    const props = clickable(() => {});
    expect(props.role).toBe('button');
    expect(props.tabIndex).toBe(0);
  });

  it('activates on click', () => {
    const onActivate = vi.fn();
    clickable(onActivate).onClick();
    expect(onActivate).toHaveBeenCalledOnce();
  });

  it.each(['Enter', ' '])('activates on %j, the way a button does', (key) => {
    const onActivate = vi.fn();
    const { event, preventDefault } = keyEvent(key);
    clickable(onActivate).onKeyDown(event);
    expect(onActivate).toHaveBeenCalledOnce();
    // Space would scroll the page otherwise.
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it.each(['a', 'Tab', 'Escape', 'ArrowDown'])('ignores %j', (key) => {
    const onActivate = vi.fn();
    const { event, preventDefault } = keyEvent(key);
    clickable(onActivate).onKeyDown(event);
    expect(onActivate).not.toHaveBeenCalled();
    // Tab in particular must keep working, or focus is trapped.
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
