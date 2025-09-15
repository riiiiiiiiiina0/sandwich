import { heroicons } from '../../docs/shared/heroicons.js';

/**
 * Creates a URL display element and attaches it to the iframe wrapper.
 * @param {HTMLDivElement} iframeWrapper
 * @param {HTMLIFrameElement} iframe
 * @returns {HTMLDivElement}
 */
export const createUrlDisplay = (iframeWrapper, iframe) => {
  const urlDisplayWrapper = document.createElement('div');
  urlDisplayWrapper.className =
    'url-display-wrapper absolute bottom-2 left-2 right-2 flex flex-row gap-2 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300';

  const urlDisplayContainer = document.createElement('div');
  urlDisplayContainer.className =
    'url-display-container flex flex-row gap-2 items-center justify-center bg-gray-200/40 dark:bg-gray-800/40 backdrop-blur-xs text-black dark:text-white rounded-full px-2 py-1 transition-colors';

  const icon = document.createElement('div');
  icon.innerHTML = heroicons.link.svg;

  const urlDisplay = document.createElement('div');
  urlDisplay.className = 'url-display text-xs min-w-0 cursor-pointer truncate';

  const initialUrl = iframe.getAttribute('src') || '';
  urlDisplay.textContent = initialUrl;

  urlDisplay.addEventListener('click', async () => {
    const currentUrl =
      iframe.getAttribute('data-sb-current-url') ||
      iframe.getAttribute('src') ||
      '';
    if (currentUrl) {
      try {
        await navigator.clipboard.writeText(currentUrl);
        icon.innerHTML = heroicons.copy.svg;
        urlDisplayContainer.classList.add('bg-green-500/40');
        urlDisplay.textContent = 'Copied';
        setTimeout(() => {
          icon.innerHTML = heroicons.link.svg;
          urlDisplayContainer.classList.remove('bg-green-500/40');
          urlDisplay.textContent = currentUrl;
        }, 2000);
      } catch (err) {
        console.error('Failed to copy URL: ', err);
      }
    }
  });

  urlDisplayContainer.appendChild(icon);
  urlDisplayContainer.appendChild(urlDisplay);
  urlDisplayWrapper.appendChild(urlDisplayContainer);
  iframeWrapper.appendChild(urlDisplayWrapper);
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
      const currentUrl =
        iframe.getAttribute('data-sb-current-url') ||
        iframe.getAttribute('src') ||
        '';
      // only update if not currently showing "Copied"
      if (urlDisplay.textContent !== 'Copied') {
        urlDisplay.textContent = currentUrl;
      }
    }
  }
};
