export const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent('global-toast', { detail: message }));
};
