// Canvas colors must follow both browser appearance and Telegram's explicit palette.
export function observeTheme(onChange) {
  const scheme = window.matchMedia?.('(prefers-color-scheme: dark)');
  scheme?.addEventListener?.('change', onChange);
  window.addEventListener('ducky:themechange', onChange);
  const observer = new window.MutationObserver(onChange);
  observer.observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
  return () => {
    scheme?.removeEventListener?.('change', onChange);
    window.removeEventListener('ducky:themechange', onChange);
    observer.disconnect();
  };
}
