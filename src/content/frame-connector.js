// Send a message to the parent to register this frame
if (window.name && window.name.startsWith('sb-iframe-')) {
  chrome.runtime.sendMessage({
    action: 'registerFrame',
    frameName: window.name,
  });
}

// Listen for commands from the parent
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message.action === 'reloadFrame') {
    window.location.reload();
  }
  if (message.action === 'goBack') {
    window.history.back();
  }
});

// Forward shortcut key presses to the split page (do not interfere with site inputs)
try {
  window.addEventListener(
    'keydown',
    (e) => {
      try {
        // Only care about Alt+[key] shortcuts.
        if (!e.altKey) return;
        // Use `e.code` to check for physical keys, avoiding issues with macOS
        // and special characters when Alt is pressed.
        const validCodes = ['KeyA', 'KeyD', 'KeyE', 'KeyX', 'KeyF'];
        if (!validCodes.includes(e.code)) return;

        // Prevent the default action (e.g., typing 'ƒ' on macOS for Alt+F)
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
