import React, { useEffect, useRef } from 'react';

export interface UseFocusTrapOptions {
  isOpen: boolean;
  onClose?: () => void;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  returnFocus?: boolean;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  options: UseFocusTrapOptions
): React.RefObject<T | null>;
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  isOpen: boolean,
  onClose?: () => void
): React.RefObject<T | null>;
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  optionsOrIsOpen: UseFocusTrapOptions | boolean,
  legacyOnClose?: () => void
): React.RefObject<T | null> {
  const options: UseFocusTrapOptions =
    typeof optionsOrIsOpen === 'boolean'
      ? { isOpen: optionsOrIsOpen, onClose: legacyOnClose }
      : optionsOrIsOpen;

  const { isOpen, onClose, initialFocusRef, returnFocus = true } = options;
  const containerRef = useRef<T | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (returnFocus && typeof document !== 'undefined') {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
    }

    const container = containerRef.current;
    if (!container) return;

    const getFocusables = (): HTMLElement[] => {
      const elements = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      return elements.filter((el) => {
        return (
          el.offsetParent !== null ||
          el.getClientRects().length > 0 ||
          (typeof window !== 'undefined' && window.getComputedStyle(el).display !== 'none')
        );
      });
    };

    // Delay initial focus slightly to allow animations/mounting
    const focusTimer = setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else {
        const focusables = getFocusables();
        if (focusables.length > 0) {
          focusables[0].focus();
        } else {
          container.setAttribute('tabindex', '-1');
          container.focus();
        }
      }
    }, 20);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onClose) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
        return;
      }

      if (e.key === 'Tab') {
        const focusables = getFocusables();
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !container.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !container.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      if (returnFocus && previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        setTimeout(() => {
          previousFocusRef.current?.focus();
        }, 0);
      }
    };
  }, [isOpen, onClose, returnFocus, initialFocusRef]);

  return containerRef;
}
