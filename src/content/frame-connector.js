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
        // Only care about Alt+A/D/E/X/F
        if (!e.altKey) return;
        const k = String(e.key || '').toLowerCase();
        if (!['a', 'd', 'e', 'x', 'f'].includes(k)) return;

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
          key: k,
          ctrlKey: !!e.ctrlKey,
          altKey: !!e.altKey,
          shiftKey: !!e.shiftKey,
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
