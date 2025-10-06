// This script is injected into every iframe within the split-view.
// It is responsible for communication between the iframe and the parent split-view page.

if (window.name && window.name.startsWith('sb-iframe-')) {
  /**
   * Sends the current URL of the iframe to the parent split-view page.
   * This allows the parent to keep its state and the URL display up-to-date.
   */
  const reportUrlChange = () => {
    try {
      // The `sb:nav` action is handled by `src/split/entry.js`.
      chrome.runtime.sendMessage({
        action: 'sb:nav',
        frameName: window.name,
        url: window.location.href,
      });
    } catch (e) {
      // This can happen if the extension context is invalidated,
      // for example, during a page unload. We can safely ignore this.
    }
  };

  // --- Initial Registration and URL Reporting ---

  // Register the frame with the parent page.
  try {
    chrome.runtime.sendMessage({
      action: 'registerFrame',
      frameName: window.name,
    });
  } catch (e) {
    // Ignore errors on unload
  }

  // Report the initial URL as soon as the script loads.
  // This handles initial loads and any redirects that occurred before the script ran.
  reportUrlChange();

  // --- Event Listeners for URL Changes ---

  // Listen for standard browser navigation events (back/forward buttons).
  window.addEventListener('popstate', reportUrlChange);

  // Listen for changes to the URL hash.
  window.addEventListener('hashchange', reportUrlChange);

  // --- Monkey-Patching for SPA Navigation ---

  // Many SPAs use the History API (pushState, replaceState) to navigate
  // without triggering traditional page loads or `popstate` events.
  // We "monkey-patch" these methods to intercept the calls and report the URL change.

  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    // Use a brief timeout to ensure the URL has been updated before reporting.
    setTimeout(reportUrlChange, 100);
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    setTimeout(reportUrlChange, 100);
  };

  // --- Handling Commands from the Parent ---

  chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
    if (message.action === 'reloadFrame') {
      window.location.reload();
    }
    if (message.action === 'goBack') {
      window.history.back();
    }
  });

  // --- Forwarding Keyboard Shortcuts ---

  try {
    window.addEventListener(
      'keydown',
      (e) => {
        try {
          // Only forward Alt+[key] shortcuts.
          if (!e.altKey) return;
          const validCodes = ['KeyA', 'KeyD', 'KeyE', 'KeyX', 'KeyF'];
          if (!validCodes.includes(e.code)) return;

          e.preventDefault();
          e.stopPropagation();

          const target = /** @type {HTMLElement} */ (e.target);
          const tag = (target && target.tagName) || '';
          if (
            tag === 'INPUT' ||
            tag === 'TEXTAREA' ||
            (target && target.isContentEditable)
          )
            return;

          chrome.runtime.sendMessage({
            action: 'sb:key',
            key: e.key,
            code: e.code,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            metaKey: e.metaKey,
            shiftKey: e.shiftKey,
            frameName: window.name || '',
          });
        } catch (_e) {
          // no-op
        }
      },
      true,
    );
  } catch (_e) {
    // no-op
  }
}