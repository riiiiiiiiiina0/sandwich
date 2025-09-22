import { appState } from './state.js';
import { updateDocumentTitleAndFaviconFromIframe } from './title.js';

/**
 * Attach mouseenter listener to mark iframe as active when hovered.
 * @param {HTMLIFrameElement} iframe
 */
export const attachActiveHoverListener = (iframe) => {
  try {
    iframe.addEventListener('mouseenter', () => {
      appState.setActiveIframe(iframe);
      updateDocumentTitleAndFaviconFromIframe(iframe);
    });
  } catch (_e) {
    // no-op
  }
};

/**
 * Attach listeners to all current iframes.
 */
export const attachActiveListenersToAllIframes = () => {
  try {
    const iframeContainer = appState.getContainer();
    const all = /** @type {NodeListOf<HTMLIFrameElement>} */ (
      iframeContainer.querySelectorAll('iframe')
    );
    all.forEach((ifr) => attachActiveHoverListener(ifr));
  } catch (_e) {
    // no-op
  }
};
