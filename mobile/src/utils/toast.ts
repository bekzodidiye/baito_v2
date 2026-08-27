export type ToastType = 'success' | 'error' | 'info';

export const showToast = (message: string, type: ToastType = 'info') => {
  window.dispatchEvent(new CustomEvent('global-toast', { detail: { message, type } }));
};
