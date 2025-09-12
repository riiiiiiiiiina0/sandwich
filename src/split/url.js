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

  // Derive titles from iframes (prefer data attribute, then hostname, else raw src)
  const titles = wrappersSorted.map((wrapper) => {
    const iframe = /** @type {HTMLIFrameElement | null} */ (
      wrapper.querySelector('iframe')
    );
    if (!iframe) return '';
    const dataTitle = iframe.getAttribute('data-sb-title');
    if (dataTitle && dataTitle.trim()) return dataTitle.trim();
    const src =
      (iframe.getAttribute('data-sb-current-url') ||
        iframe.getAttribute('src') ||
        iframe.src ||
        '') + '';
    try {
      const u = new URL(src);
      return u.hostname || src;
    } catch (_e) {
      return src || '';
    }
  });

  const state = {
    urls: currentUrls,
    ratios: currentRatios.map((r) => Number(r)),
    layout: mode,
    titles,
  };

  const newUrl = new URL(window.location.href);
  // Remove legacy params
  newUrl.searchParams.delete('urls');
  newUrl.searchParams.delete('ratios');
  newUrl.searchParams.delete('layout');
  newUrl.searchParams.delete('title');
  newUrl.searchParams.delete('titles');
  // Write single JSON state param
  newUrl.searchParams.set('state', JSON.stringify(state));
  window.history.replaceState({}, '', newUrl.toString());
};
