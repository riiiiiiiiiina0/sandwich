import { appState } from './state.js';
import { updateCssOrder } from './ordering.js';
import { rebuildInterface } from './rebuild.js';
import { updateDocumentTitleFromIframes } from './title.js';

export const moveIframe = (fromWrapper, direction) => {
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

  const fromIndex = wrappersSorted.indexOf(fromWrapper);
  if (fromIndex === -1) {
    return;
  }

  const directionValue = direction === 'left' ? -1 : 1;
  const toIndex = fromIndex + directionValue;

  if (
    toIndex < 0 ||
    toIndex >= wrappersSorted.length
  ) {
    return;
  }

  const toWrapper = wrappersSorted[toIndex];

  const fromOrder = Number.parseInt(
    /** @type {HTMLElement} */ (fromWrapper).style.order || `${fromIndex * 2}`,
    10,
  );
  const toOrder = Number.parseInt(
    /** @type {HTMLElement} */ (toWrapper).style.order || `${toIndex * 2}`,
    10,
  );

  /** @type {HTMLElement} */ (fromWrapper).style.order = String(toOrder);
  /** @type {HTMLElement} */ (toWrapper).style.order = String(fromOrder);

  updateCssOrder();
  rebuildInterface();
  updateDocumentTitleFromIframes();
};
