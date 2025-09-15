/**
 * Creates a URL display element and attaches it to the iframe wrapper.
 * @param {HTMLDivElement} iframeWrapper
 * @param {HTMLIFrameElement} iframe
 * @returns {HTMLDivElement}
 */
export const createUrlDisplay = (iframeWrapper, iframe) => {
  const urlDisplay = document.createElement('div');
  urlDisplay.className =
    'url-display absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer truncate';

  const initialUrl = iframe.getAttribute('src') || '';
  urlDisplay.textContent = initialUrl;

  urlDisplay.addEventListener('click', async () => {
    const currentUrl = iframe.getAttribute('data-sb-current-url') || iframe.getAttribute('src') || '';
    if (currentUrl) {
      try {
        await navigator.clipboard.writeText(currentUrl);
        urlDisplay.textContent = 'Copied';
        setTimeout(() => {
          urlDisplay.textContent = currentUrl;
        }, 2000);
      } catch (err) {
        console.error('Failed to copy URL: ', err);
      }
    }
  });

  iframeWrapper.appendChild(urlDisplay);
  return urlDisplay;
};

/**
 * Updates the URL display for a given iframe.
 * @param {HTMLIFrameElement} iframe
 */
export const updateUrlDisplay = (iframe) => {
  const iframeWrapper = iframe.closest('.iframe-wrapper');
  if (iframeWrapper) {
    const urlDisplay = iframeWrapper.querySelector('.url-display');
    if (urlDisplay) {
      const currentUrl = iframe.getAttribute('data-sb-current-url') || iframe.getAttribute('src') || '';
      // only update if not currently showing "Copied"
      if (urlDisplay.textContent !== 'Copied') {
        urlDisplay.textContent = currentUrl;
      }
    }
  }
};
