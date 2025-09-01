import { appState } from './state.js';

/**
 * Return ordered iframe elements based on wrapper order.
 * @returns {HTMLIFrameElement[]}
 */
export const getOrderedIframes = () => {
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

  return wrappersSorted
    .map(
      (wrapper) =>
        /** @type {HTMLIFrameElement|null} */ (wrapper.querySelector('iframe')),
    )
    .filter((x) => x !== null);
};

/**
 * Safely derive a readable title for an iframe.
 * Prefers data attribute, then contentDocument.title (same-origin), then hostname, then raw src.
 * @param {HTMLIFrameElement} iframe
 */
const deriveIframeTitle = (iframe) => {
  const dataTitle = iframe.getAttribute('data-sb-title');
  if (dataTitle && dataTitle.trim()) return dataTitle.trim();

  try {
    const sameOriginTitle = iframe?.contentDocument?.title || '';
    if (sameOriginTitle && sameOriginTitle.trim())
      return sameOriginTitle.trim();
  } catch (_e) {
    // Cross-origin, ignore
  }

  const src = iframe.getAttribute('src') || iframe.src || '';
  try {
    const u = new URL(src);
    return u.hostname || src;
  } catch (_e) {
    return src || 'Untitled';
  }
};

/**
 * Update document.title to a comma-separated list of iframe titles.
 */
export const updateDocumentTitleFromIframes = () => {
  try {
    const iframes = getOrderedIframes();
    const titles = iframes.map((ifr) => deriveIframeTitle(ifr)).filter(Boolean);
    document.title = titles.length ? titles.join(', ') : 'Split';
  } catch (_e) {
    // no-op
  }
};

/**
 * Attach load listener to update stored title (when accessible) and refresh document.title.
 * @param {HTMLIFrameElement} iframe
 */
export const attachIframeTitleListener = (iframe) => {
  try {
    iframe.addEventListener('load', () => {
      try {
        const t = iframe?.contentDocument?.title || '';
        if (t && t.trim()) iframe.setAttribute('data-sb-title', t.trim());
      } catch (_e) {
        // Cross-origin, leave data attribute unchanged
      }
      updateDocumentTitleFromIframes();
    });
  } catch (_e) {
    // no-op
  }
};

/**
 * Attach listeners to all current iframes and immediately refresh the title.
 */
export const attachTitleListenersToAllIframes = () => {
  try {
    const iframeContainer = appState.getContainer();
    const all = /** @type {NodeListOf<HTMLIFrameElement>} */ (
      iframeContainer.querySelectorAll('iframe')
    );
    all.forEach((ifr) => attachIframeTitleListener(ifr));
    updateDocumentTitleFromIframes();
  } catch (_e) {
    // no-op
  }
};

/**
 * Listen for title updates from content scripts and map them to iframes by URL.
 */
export const startContentTitleBridge = () => {
  try {
    if (
      typeof chrome === 'undefined' ||
      !chrome.runtime ||
      !chrome.runtime.onMessage
    )
      return;

    const normalize = (u) => {
      try {
        const x = new URL(u);
        return `${x.origin}${x.pathname}`;
      } catch (_e) {
        return u || '';
      }
    };

    chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
      try {
        if (!msg || msg.type !== 'sb:title') return;
        const url = String(msg.url || '');
        const title = String(msg.title || '');
        if (!url) return;

        const iframeContainer = appState.getContainer();
        const iframes = /** @type {NodeListOf<HTMLIFrameElement>} */ (
          iframeContainer.querySelectorAll('iframe')
        );
        const key = normalize(url);
        for (const ifr of Array.from(iframes)) {
          const src = ifr.getAttribute('src') || ifr.src || '';
          if (!src) continue;
          if (normalize(src) === key) {
            if (title && title.trim()) {
              ifr.setAttribute('data-sb-title', title.trim());
              updateDocumentTitleFromIframes();
            }
          }
        }
      } catch (_e) {
        // no-op
      }
    });
  } catch (_e) {
    // no-op
  }
};
