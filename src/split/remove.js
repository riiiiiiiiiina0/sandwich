import { appState } from './state.js';
import { rebuildInterface } from './rebuild.js';
import { updateDividerPlusVisibility } from './insert.js';
import { applyWrapperPrimarySize, recalcAllWrapperSizes } from './size.js';
import { updateDocumentTitleFromIframes } from './title.js';

const closeTabIfSingleRemaining = () => {
  const remainingWrappers = document.querySelectorAll('.iframe-wrapper');
  if (remainingWrappers.length === 1) {
    const lastWrapper = remainingWrappers[0];
    const iframe = /** @type {HTMLIFrameElement | null} */ (
      lastWrapper.querySelector('iframe')
    );
    if (!iframe) return;

    const liveSrc = iframe.getAttribute('data-sb-current-url');
    const originalSrc = iframe.getAttribute('src');
    const url = (liveSrc && liveSrc.trim()) || originalSrc || iframe.src || '';

    if (url) {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url: url });
      } else {
        window.open(url, '_blank');
      }
    }

    try {
      if (
        typeof chrome !== 'undefined' &&
        chrome.tabs &&
        typeof chrome.tabs.getCurrent === 'function'
      ) {
        chrome.tabs.getCurrent((tab) => {
          if (chrome.runtime && chrome.runtime.lastError) {
            window.close();
            return;
          }
          if (tab && typeof tab.id === 'number') {
            chrome.tabs.remove(tab.id);
          } else {
            window.close();
          }
        });
      } else {
        window.close();
      }
    } catch (_e) {
      window.close();
    }
  }
};

export const removeIframe = (index) => {
  const iframeContainer = appState.getContainer();
  const isVerticalLayout = appState.getIsVerticalLayout();

  const wrappers = Array.from(iframeContainer.children).filter((child) =>
    child.classList.contains('iframe-wrapper'),
  );

  if (wrappers.length <= 1) return;

  const wrapperToRemove = wrappers[index];
  if (wrapperToRemove) {
    const nextSibling = wrapperToRemove.nextSibling;
    wrapperToRemove.remove();
    if (
      nextSibling &&
      /** @type {HTMLElement} */ (nextSibling).classList &&
      /** @type {HTMLElement} */ (nextSibling).classList.contains(
        'iframe-divider',
      )
    ) {
      nextSibling.remove();
    }

    const firstChild = iframeContainer.firstChild;
    if (
      firstChild &&
      /** @type {HTMLElement} */ (firstChild).classList &&
      /** @type {HTMLElement} */ (firstChild).classList.contains(
        'iframe-divider',
      )
    ) {
      firstChild.remove();
    }

    const remainingWrappers = document.querySelectorAll('.iframe-wrapper');
    const newRatio = 100 / remainingWrappers.length;
    remainingWrappers.forEach((wrapper) => {
      /** @type {HTMLElement} */ (wrapper).dataset.ratio = String(newRatio);
      applyWrapperPrimarySize(
        /** @type {HTMLDivElement} */ (wrapper),
        newRatio,
        isVerticalLayout,
        iframeContainer,
      );
    });

    rebuildInterface();
    updateDividerPlusVisibility();
    // Recalc in case divider count changed
    recalcAllWrapperSizes(iframeContainer, isVerticalLayout);
    closeTabIfSingleRemaining();
    updateDocumentTitleFromIframes();
  }
};
