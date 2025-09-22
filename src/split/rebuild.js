import { appState } from './state.js';
import { createIframeMenu } from './menu.js';
import { updateCssOrder } from './ordering.js';
import { updateUrlWithState } from './url.js';
import {
  attachTitleListenersToAllIframes,
  updateDocumentTitleFromIframes,
} from './title.js';
import { attachActiveListenersToAllIframes } from './active.js';

export const updateRightmostStatusForAllIframes = () => {
  const wrappers = /** @type {NodeListOf<HTMLDivElement>} */ (
    document.querySelectorAll('.iframe-wrapper')
  );
  if (wrappers.length === 0) return;

  let rightmostWrapper = null;
  let maxOrder = -1;

  wrappers.forEach((wrapper) => {
    const order = parseInt(wrapper.style.order, 10);
    if (order > maxOrder) {
      maxOrder = order;
      rightmostWrapper = wrapper;
    }
  });

  const tabId = appState.getTabId();
  if (!tabId) return;

  wrappers.forEach((wrapper) => {
    const iframe = wrapper.querySelector('iframe');
    if (iframe && iframe.dataset.frameId) {
      const frameId = parseInt(iframe.dataset.frameId, 10);
      const isRightmost = wrapper === rightmostWrapper;
      try {
        chrome.tabs.sendMessage(
          tabId,
          { action: 'update-rightmost-status', isRightmost },
          { frameId },
        );
      } catch (e) {
        // ignore errors, e.g. if frame is not ready
      }
    }
  });
};

export const rebuildInterface = () => {
  const iframeContainer = appState.getContainer();

  const wrappers = Array.from(iframeContainer.children).filter((child) =>
    child.classList.contains('iframe-wrapper'),
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
  attachActiveListenersToAllIframes();
  updateDocumentTitleFromIframes();
  updateRightmostStatusForAllIframes();
};
