(() => {
  let key = '';

  /**
   * Send an update to the background script with the current title and href.
   * @param {string} title
   * @param {string} url
   */
  const sendUpdate = (title, url) => {
    try {
      if (
        typeof chrome !== 'undefined' &&
        chrome.runtime &&
        chrome.runtime.sendMessage
      ) {
        chrome.runtime.sendMessage({ type: 'sb:title', key, url, title });
      }
    } catch (_e) {
      // no-op
    }
  };

  let _lastUrl = '';
  let _lastTitle = '';
  const notify = () => {
    const title = document.title || '';
    const url = location.href || '';
    if (title !== _lastTitle || url !== _lastUrl) {
      _lastTitle = title;
      _lastUrl = url;
      sendUpdate(title, url);
    }
  };

  if (
    document.readyState === 'complete' ||
    document.readyState === 'interactive'
  ) {
    notify();
  } else {
    window.addEventListener('DOMContentLoaded', notify, { once: true });
    window.addEventListener('load', notify, { once: true });
  }

  window.addEventListener('popstate', notify);
  window.addEventListener('hashchange', notify);

  try {
    const origPushState = history.pushState?.bind(history);
    const origReplaceState = history.replaceState?.bind(history);
    if (origPushState) {
      history.pushState = function (...args) {
        const ret = origPushState(...args);
        try {
          notify();
        } catch (_e) {}
        return ret;
      };
    }
    if (origReplaceState) {
      history.replaceState = function (...args) {
        const ret = origReplaceState(...args);
        try {
          notify();
        } catch (_e) {}
        return ret;
      };
    }
  } catch (_e) {
    // no-op
  }

  try {
    const ensureTitleObserver = () => {
      const titleEl = document.querySelector('title');
      if (!titleEl) return false;
      const mo = new MutationObserver(() => notify());
      mo.observe(titleEl, {
        childList: true,
        characterData: true,
        subtree: true,
      });
      return true;
    };
    if (!ensureTitleObserver()) {
      const headMo = new MutationObserver(() => {
        if (ensureTitleObserver()) headMo.disconnect();
      });
      headMo.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    }
  } catch (_e) {
    // no-op
  }
  key = location.href;
})();

// Respond to title requests from the extension
try {
  if (
    typeof chrome !== 'undefined' &&
    chrome.runtime &&
    chrome.runtime.onMessage
  ) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      try {
        if (message && message.action === 'sb:get-title') {
          const faviconLink =
            document.querySelector("link[rel~='icon']") ||
            document.querySelector("link[rel~='shortcut icon']");
          const favicon = faviconLink
            ? new URL(faviconLink.href, document.baseURI).href
            : '';
          sendResponse({
            title: document.title || '',
            url: location.href || '',
            favicon: favicon,
          });
        }
      } catch (_e) {
        try {
          sendResponse({ title: '', url: location.href || '', favicon: '' });
        } catch (_e2) {}
      }
      // synchronous response
      return false;
    });
  }
} catch (_e) {
  // no-op
}
