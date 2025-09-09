import { appState } from './state.js';
import { createIframeMenu } from './menu.js';
import { updateCssOrder } from './ordering.js';
import { updateUrlWithState } from './url.js';
import { applyLayout } from './layout.js';
import {
  attachTitleListenersToAllIframes,
  updateDocumentTitleFromIframes,
} from './title.js';

export const rebuildInterface = () => {
  const iframeContainer = appState.getContainer();

  const wrappers = Array.from(iframeContainer.querySelectorAll('.iframe-wrapper'));
  const numIframes = wrappers.length;
  const currentLayout = appState.getLayoutMode();

  if (numIframes === 4 && currentLayout !== 'grid') {
    appState.setLayoutMode('grid');
    updateUrlWithState();
    window.location.reload();
    return;
  } else if (numIframes < 4 && currentLayout === 'grid') {
    appState.setLayoutMode('horizontal');
    updateUrlWithState();
    window.location.reload();
    return;
  }

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
    const menu = /** @type {HTMLElement} */ (
      wrapper.querySelector('.iframe-menu')
    );
    if (menu) {
      menu.remove();
    }
    const newMenu = createIframeMenu(wrapper, index, wrappersSorted.length);
    wrapper.appendChild(newMenu);
  });

  updateCssOrder();
  updateUrlWithState();
  attachTitleListenersToAllIframes();
  updateDocumentTitleFromIframes();
};
