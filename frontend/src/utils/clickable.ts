import React from 'react';

/**
 * Make a non-button element behave like one for the keyboard.
 *
 * Several places drive real actions from a plain `<div onClick>` — opening the
 * applicants list, picking a card, the file-upload drop area. A div is not
 * focusable and does not fire on Enter or Space, so those actions could only be
 * reached with a pointer.
 *
 * A `<button>` is still the better answer where the layout allows one; this is
 * for the places where it does not.
 */
export const clickable = (onActivate: () => void) => ({
  role: 'button',
  tabIndex: 0,
  onClick: onActivate,
  onKeyDown: (e: React.KeyboardEvent) => {
    // Enter and Space are what a button responds to; Space would otherwise
    // scroll the page.
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate();
    }
  },
});
