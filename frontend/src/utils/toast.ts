export type ToastType = 'success' | 'error' | 'info';

/**
 * Triggers a global toast notification event.
 * @param message Localized notification message string.
 * @param type Status visual theme ('success' | 'error' | 'info').
 */
export const showToast = (message: string, type: ToastType = 'info') => {
  window.dispatchEvent(new CustomEvent('global-toast', { detail: { message, type } }));
};
