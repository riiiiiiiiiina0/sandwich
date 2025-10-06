// This script is injected into every iframe within the split-view (Content Script world).
// It is responsible for communication between the iframe and the parent split-view page.

if (window.name && window.name.startsWith('sb-iframe-')) {
  // --- Inject the URL Interceptor into the Main World ---
  // The interceptor script (`url-interceptor.js`) has direct access to the page's
  // `history` object and can reliably detect URL changes, even in complex SPAs.
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('src/content/url-interceptor.js');
    (document.head || document.documentElement).appendChild(script);
    // Clean up the script tag from the DOM after it has been executed.
    script.onload = () => script.remove();
  } catch (e) {
    console.error('Sandwich Bear: Failed to inject URL interceptor.', e);
  }

  // --- Listen for URL changes from the Interceptor ---
  // The injected script will dispatch a custom DOM event whenever the URL changes.
  // We listen for that event here in the content script world and forward it.
  window.addEventListener('sb:url-change', (event) => {
    if (event.detail && event.detail.url) {
      try {
        chrome.runtime.sendMessage({
          action: 'sb:nav',
          frameName: window.name,
          url: event.detail.url,
        });
      } catch (e) {
        // Ignore errors that can happen on unload.
      }
    }
  });

  // --- Initial Frame Registration and URL Reporting ---
  try {
    // Register the frame with the parent page. This is needed for other
    // functionalities like context menus.
    chrome.runtime.sendMessage({
      action: 'registerFrame',
      frameName: window.name,
    });

    // Report the initial URL when the content script loads. This handles the
    // initial state and any redirects that happened before the interceptor is ready.
    chrome.runtime.sendMessage({
      action: 'sb:nav',
      frameName: window.name,
      url: window.location.href,
    });
  } catch (e) {
    // Ignore errors on unload
  }

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