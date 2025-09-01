import { appState } from './state.js';

export const updateCssOrder = () => {
  const iframeContainer = appState.getContainer();
  const wrappers = /** @type {HTMLDivElement[]} */ (
    Array.from(iframeContainer.querySelectorAll('.iframe-wrapper'))
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

  wrappersSorted.forEach((wrapper, index) => {
    /** @type {HTMLElement} */ (wrapper).style.order = String(index * 2);
  });

  const dividers = /** @type {HTMLDivElement[]} */ (
    Array.from(iframeContainer.querySelectorAll('.iframe-divider'))
  );
  dividers.forEach((divider, index) => {
    /** @type {HTMLElement} */ (divider).style.order = String(index * 2 + 1);
  });
};
