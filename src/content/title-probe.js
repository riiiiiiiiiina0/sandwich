(() => {
  const safeGetTitle = () => {
    try {
      return document.title || '';
    } catch (_e) {
      return '';
    }
  };

  const sendTitle = () => {
    try {
      const href = location.href;
      const title = safeGetTitle();
      if (
        typeof chrome !== 'undefined' &&
        chrome.runtime &&
        chrome.runtime.sendMessage
      ) {
        chrome.runtime.sendMessage({ type: 'sb:title', url: href, title });
      }
    } catch (_e) {
      // no-op
    }
  };

  // Initial send when script loads
  try {
    sendTitle();
  } catch (_e) {}

  // Observe <title> changes
  try {
    const observeTitle = () => {
      const head = document.head || document.querySelector('head');
      if (!head) return;
      const titleEl = head.querySelector('title');
      const target = titleEl || head;
      const observer = new MutationObserver(() => {
        sendTitle();
      });
      observer.observe(target, {
        subtree: true,
        characterData: true,
        childList: true,
      });
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', observeTitle, {
        once: true,
      });
    } else {
      observeTitle();
    }
  } catch (_e) {}

  // History API hooks for SPA navigations
  try {
    const wrapHistory = (method) => {
      const orig = history[method];
      if (typeof orig === 'function') {
        history[method] = function (...args) {
          const res = orig.apply(this, args);
          setTimeout(sendTitle, 0);
          return res;
        };
      }
    };
    wrapHistory('pushState');
    wrapHistory('replaceState');
    window.addEventListener('popstate', () => setTimeout(sendTitle, 0));
  } catch (_e) {}

  // Fallback polling (low frequency)
  try {
    let last = safeGetTitle();
    setInterval(() => {
      const cur = safeGetTitle();
      if (cur !== last) {
        last = cur;
        sendTitle();
      }
    }, 2000);
  } catch (_e) {}
})();
