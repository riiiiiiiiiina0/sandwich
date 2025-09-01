import { appState } from './state.js';
import { rebuildInterface } from './rebuild.js';
import { updateDividerPlusVisibility } from './insert.js';

const closeTabIfSingleRemaining = () => {
  const remaining = document.querySelectorAll('.iframe-wrapper').length;
  if (remaining === 1) {
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
      if (isVerticalLayout) {
        /** @type {HTMLElement} */ (wrapper).style.height = `${newRatio}%`;
      } else {
        /** @type {HTMLElement} */ (wrapper).style.width = `${newRatio}%`;
      }
    });

    rebuildInterface();
    updateDividerPlusVisibility();
    closeTabIfSingleRemaining();
  }
};
