import { appState } from './state.js';
import { updateUrlWithState } from './url.js';
import { updateUrlDisplay } from './url-display.js';

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
 * Prefers data attribute, then hostname, then raw src.
 * @param {HTMLIFrameElement} iframe
 */
const deriveIframeTitle = (iframe) => {
  const dataTitle = iframe.getAttribute('data-sb-title');
  if (dataTitle && dataTitle.trim()) return dataTitle.trim();

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
    document.title = titles.length ? titles.join(' / ') : 'Sandwich Bear';
  } catch (_e) {
    // no-op
  }
};

// Find or create the favicon link element
const getFaviconEl = () => {
  let faviconEl = document.querySelector("link[rel~='icon']");
  if (!faviconEl) {
    faviconEl = document.createElement('link');
    faviconEl.rel = 'icon';
    // The default favicon is a png, so type should be image/png
    faviconEl.type = 'image/png';
    document.head.appendChild(faviconEl);
  }
  return faviconEl;
};

export const resetDocumentTitleAndFavicon = () => {
  document.title = 'Sandwich Bear';
  const faviconEl = getFaviconEl();
  // The original favicon is docs/favicon.png.
  // The split page is at /src/split.html.
  // So the path should be ../docs/favicon.png
  faviconEl.href = '../docs/favicon.png';
};

export const updateDocumentTitleAndFaviconFromIframe = (iframe) => {
  if (!iframe) {
    resetDocumentTitleAndFavicon();
    return;
  }

  const tabId = appState.getTabId();
  const frameId = iframe.dataset.frameId;

  if (!tabId || !frameId) {
    // Fallback to existing title logic if we can't message the frame
    const title = iframe.getAttribute('data-sb-title') || 'Untitled';
    document.title = title;
    resetDocumentTitleAndFavicon(); // Reset favicon as we can't get it
    return;
  }

  chrome.tabs.sendMessage(
    Number(tabId),
    { action: 'sb:get-title' },
    { frameId: Number(frameId) },
    (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Could not message frame:', chrome.runtime.lastError.message);
        // Fallback to stored title if messaging fails
        const title = iframe.getAttribute('data-sb-title') || 'Untitled';
        document.title = title;
        resetDocumentTitleAndFavicon();
        return;
      }

      if (response) {
        document.title = response.title || 'Untitled';
        const faviconEl = getFaviconEl();
        if (response.favicon) {
          faviconEl.href = response.favicon;
        } else {
          // If no favicon is found on the page, revert to default.
          resetDocumentTitleAndFavicon();
        }
      } else {
        // If no response, also fallback
        const title = iframe.getAttribute('data-sb-title') || 'Untitled';
        document.title = title;
        resetDocumentTitleAndFavicon();
      }
    },
  );
};

/**
 * Attach load listener to update stored title (when accessible) and refresh document.title.
 * @param {HTMLIFrameElement} iframe
 */
export const attachIframeTitleListener = (iframe) => {
  try {
    iframe.addEventListener('load', () => {
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
        const key = String(msg.key || '');
        const url = String(msg.url || '');
        const title = String(msg.title || '');
        if (!key || !url) return;
        const keyNorm = normalize(key);

        const iframeContainer = appState.getContainer();
        const iframes = /** @type {NodeListOf<HTMLIFrameElement>} */ (
          iframeContainer.querySelectorAll('iframe')
        );
        for (const ifr of Array.from(iframes)) {
          const src = ifr.getAttribute('src') || ifr.src || '';
          if (!src) continue;
          if (normalize(src) === keyNorm) {
            if (title && title.trim()) {
              ifr.setAttribute('data-sb-title', title.trim());
              updateDocumentTitleFromIframes();
            }
            // Always update the current url so split page can reflect navigation
            try {
              if (url && url.trim()) {
                ifr.setAttribute('data-sb-current-url', url.trim());
                // keep key for matching future messages in case of redirects
                ifr.setAttribute('data-sb-key', key);
                // Update split page URL params to reflect latest iframe URLs
                // Defer to next tick to batch updates if many events come in
                queueMicrotask(() => {
                  try {
                    updateUrlWithState();
                  } catch (_e) {
                    // no-op
                  }
                });
                updateUrlDisplay(ifr);
              }
            } catch (_e) {
              // no-op
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
