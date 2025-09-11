import { appState } from './state.js';
import { getWrapperRatioPercent } from './size.js';

export const updateUrlWithState = () => {
  const mode = appState.getLayoutMode();

  const wrappers = /** @type {HTMLDivElement[]} */ (
    Array.from(document.querySelectorAll('.iframe-wrapper'))
  );

  const wrappersSorted = wrappers
    .map((w, domIndex) => ({
      el: w,
      orderValue: Number.parseInt(
        /** @type {HTMLElement} */ (w).style.order || `${domIndex * 2}`,
        10,
      ),
    }))
    .sort((a, b) => a.orderValue - b.orderValue)
    .map((x) => x.el);

  const defaultPercent =
    wrappersSorted.length > 0 ? 100 / wrappersSorted.length : 100;
  const currentRatios = wrappersSorted.map((wrapper) =>
    getWrapperRatioPercent(wrapper, defaultPercent).toFixed(1),
  );

  const currentUrls = wrappersSorted.map((wrapper) => {
    const iframe = /** @type {HTMLIFrameElement | null} */ (
      wrapper.querySelector('iframe')
    );
    if (!iframe) return '';
    const liveSrc = iframe.getAttribute('data-sb-current-url');
    const originalSrc = iframe.getAttribute('src');
    return (liveSrc && liveSrc.trim()) || originalSrc || iframe.src || '';
  });

  const newUrl = new URL(window.location.href);
  newUrl.searchParams.set(
    'urls',
    currentUrls.map((u) => encodeURIComponent(u)).join(','),
  );
  newUrl.searchParams.set('ratios', currentRatios.join(','));
  newUrl.searchParams.set('layout', mode);
  window.history.replaceState({}, '', newUrl.toString());
};

export const detachIframe = (iframe) => {
    if (!iframe) return;
    const liveSrc = iframe.getAttribute('data-sb-current-url');
    const originalSrc = iframe.getAttribute('src');
    const url = (liveSrc && liveSrc.trim()) || originalSrc || iframe.src || '';
    if (!url) return;
    try {
        chrome.tabs.create({ url, active: true });
    } catch (_e) {
        // no-op
    }
}
