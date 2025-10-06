// This script is injected into the MAIN world of the iframe's page.
// It has direct access to the page's `window` and `history` objects.
// Its purpose is to reliably detect URL changes, including those from SPAs,
// and communicate them back to the extension's content script.

(() => {
  if (window.hasRunUrlInterceptor) {
    return;
  }
  window.hasRunUrlInterceptor = true;

  /**
   * Dispatches a custom DOM event to notify the content script of a URL change.
   * The content script (`frame-connector.js`) will listen for this event.
   */
  const reportUrlChange = () => {
    // A brief timeout helps ensure that the URL has been updated in the DOM
    // before we read it, especially after history API calls.
    setTimeout(() => {
      try {
        const newUrl = window.location.href;
        const event = new CustomEvent('sb:url-change', {
          detail: { url: newUrl },
        });
        window.dispatchEvent(event);
      } catch (e) {
        // In case of any errors, we don't want to break the host page.
      }
    }, 100);
  };

  // --- Monkey-Patch the History API ---

  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    reportUrlChange();
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    reportUrlChange();
  };

  // --- Listen for Standard Navigation Events ---

  window.addEventListener('popstate', reportUrlChange);
  window.addEventListener('hashchange', reportUrlChange);
})();