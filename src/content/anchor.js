// content-script.js
if (window.name.startsWith('sb-iframe-')) {
  document.addEventListener(
    'click',
    function (e) {
      // Check if the clicked element is an anchor tag
      const target = /** @type {HTMLElement} */ (e.target).closest('a');
      if (target) {
        const url = target.href;
        const isTargetBlank = target.target === '_blank';
        const isYouTubeLink = url && url.includes('youtube.com');

        // Check if the URL is a YouTube link
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
