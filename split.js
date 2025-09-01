document.addEventListener('DOMContentLoaded', () => {
  const iframeContainer = document.getElementById('iframe-container');
  const urlParams = new URLSearchParams(window.location.search);
  const urlsParam = urlParams.get('urls');

  if (urlsParam) {
    const urls = urlsParam.split(',').map(url => decodeURIComponent(url));
    const numIframes = urls.length;
    const iframeWidth = 100 / numIframes;

    urls.forEach(url => {
      const iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-popups');
      iframe.setAttribute('allow', 'fullscreen');
      iframe.style.width = `${iframeWidth}%`;
      iframe.style.height = '100%';
      iframe.style.border = '1px solid #ccc';
      iframe.style.boxSizing = 'border-box';
      iframe.style.pointerEvents = 'auto';

      iframeContainer.appendChild(iframe);
    });
  }
});
