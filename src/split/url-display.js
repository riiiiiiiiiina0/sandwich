/**
 * Creates a URL display element for an iframe and attaches it to the DOM.
 * The URL display is shown on hover and can be clicked to copy the URL.
 * @param {HTMLIFrameElement} iframe The iframe element.
 */
export function createUrlDisplay(iframe) {
  const wrapper = iframe.closest('.iframe-wrapper');
  if (!wrapper) {
    return;
  }

  const urlDisplay = document.createElement('div');
  urlDisplay.className = 'iframe-url-display';

  const getIframeUrl = () => {
    const liveSrc = iframe.getAttribute('data-sb-current-url');
    const originalSrc = iframe.getAttribute('src');
    return (liveSrc && liveSrc.trim()) || originalSrc || iframe.src || '';
  };

  urlDisplay.textContent = getIframeUrl();
  wrapper.appendChild(urlDisplay);

  wrapper.addEventListener('mouseenter', () => {
    urlDisplay.textContent = getIframeUrl();
    urlDisplay.style.opacity = '1';
    urlDisplay.style.pointerEvents = 'auto';
  });

  wrapper.addEventListener('mouseleave', () => {
    urlDisplay.style.opacity = '0';
    urlDisplay.style.pointerEvents = 'none';
  });

  urlDisplay.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(getIframeUrl());
      urlDisplay.textContent = 'Copied';
      setTimeout(() => {
        urlDisplay.textContent = getIframeUrl();
      }, 2000);
    } catch (err) {
      console.error('Failed to copy URL: ', err);
    }
  });
}
