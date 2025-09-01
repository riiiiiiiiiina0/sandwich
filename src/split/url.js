import { appState } from './state.js';

export const updateUrlWithState = () => {
  const iframeContainer = appState.getContainer();
  const isVerticalLayout = appState.getIsVerticalLayout();

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

  const currentRatios = wrappersSorted.map((wrapper) => {
    if (isVerticalLayout) {
      return parseFloat(wrapper.style.height).toFixed(1);
    } else {
      return parseFloat(wrapper.style.width).toFixed(1);
    }
  });

  const currentUrls = wrappersSorted.map((wrapper) => {
    const iframe = /** @type {HTMLIFrameElement | null} */ (
      wrapper.querySelector('iframe')
    );
    if (!iframe) return '';
    const originalSrc = iframe.getAttribute('src');
    return originalSrc || iframe.src || '';
  });

  const newUrl = new URL(window.location.href);
  newUrl.searchParams.set(
    'urls',
    currentUrls.map((u) => encodeURIComponent(u)).join(','),
  );
  newUrl.searchParams.set('ratios', currentRatios.join(','));
  newUrl.searchParams.set(
    'layout',
    isVerticalLayout ? 'vertical' : 'horizontal',
  );
  window.history.replaceState({}, '', newUrl.toString());
};
