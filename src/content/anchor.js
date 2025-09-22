// content-script.js
if (window.name.startsWith('sb-iframe-')) {
  let isThisFrameRightmost = false;

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'update-rightmost-status') {
      isThisFrameRightmost = message.isRightmost;
    }
  });

  document.addEventListener(
    'mouseover',
    (e) => {
      const target = /** @type {HTMLElement} */ (e.target).closest('a[href]');
      if (target && isThisFrameRightmost) {
        chrome.runtime.sendMessage({ action: 'hide-replace-menu' });
      }
    },
    true,
  );

  document.addEventListener(
    'mouseout',
    (e) => {
      const target = /** @type {HTMLElement} */ (e.target).closest('a[href]');
      if (target) {
        chrome.runtime.sendMessage({ action: 'show-replace-menu' });
      }
    },
    true,
  );

  document.addEventListener(
    'click',
    function (e) {
      // Check if the clicked element is an anchor tag
      const target = /** @type {HTMLElement} */ (e.target).closest('a');
      if (target) {
        const url = target.href;
        const isTargetBlank = target.target === '_blank';
        const isYouTubeLink = url && url.includes('youtube.com');
        // const isModifierOpenRight =
        //   (navigator.platform.includes('Mac') && (e.metaKey || e.ctrlKey)) ||
        //   (!navigator.platform.includes('Mac') && (e.altKey || e.ctrlKey));
        const isModifierOpenRight = e.metaKey;

        // If Cmd (mac) or Alt (win) (or Ctrl as alternative) is held, request add-iframe-right
        if (url && isModifierOpenRight) {
          e.stopPropagation();
          e.preventDefault();
          try {
            // @ts-ignore sender will include frameId; include window.name for robustness
            chrome.runtime.sendMessage({
              action: 'add-iframe-right',
              url: url,
              frameName: window.name,
            });
          } catch (_err) {}
          return;
        }

        // Keep existing behavior for _blank and YouTube links: open as browser tab
        if (url && (isTargetBlank || isYouTubeLink)) {
          e.stopPropagation();
          e.preventDefault(); // Prevent the default link behavior
          // Send a message to the background script with the URL
          chrome.runtime.sendMessage({
            action: 'openAnchorLink',
            url: url,
          });
        }
      }
    },
    true,
  ); // Use `true` for event capturing, to ensure the listener runs before the default behavior
}
