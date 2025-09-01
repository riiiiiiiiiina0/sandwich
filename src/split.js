document.addEventListener('DOMContentLoaded', () => {
  const iframeContainer = /** @type {HTMLDivElement} */ (
    document.getElementById('iframe-container')
  );
  const urlParams = new URLSearchParams(window.location.search);
  const urlsParam = urlParams.get('urls');

  if (urlsParam) {
    const urls = urlsParam.split(',').map((url) => decodeURIComponent(url));
    const numIframes = urls.length;
    const iframeWidth = 100 / numIframes;

    urls.forEach((url, index) => {
      // Create iframe
      const iframe = /** @type {HTMLIFrameElement} */ (
        document.createElement('iframe')
      );
      iframe.src = url;
      iframe.setAttribute(
        'sandbox',
        'allow-same-origin allow-scripts allow-forms allow-popups',
      );
      iframe.setAttribute('allow', 'fullscreen');
      iframe.style.width = `${iframeWidth}%`;
      iframe.className =
        'resizable-iframe h-full border border-gray-300 box-border rounded-lg pointer-events-auto flex-shrink-0 flex-grow-0';

      iframeContainer.appendChild(iframe);

      // Add divider after iframe (except for the last one)
      if (index < urls.length - 1) {
        const divider = document.createElement('div');
        divider.className =
          'm-0 p-0 w-1 h-full cursor-col-resize min-w-1 relative flex-shrink-0 flex-grow-0';
        iframeContainer.appendChild(divider);

        // Add drag functionality
        let isDragging = false;
        let startX = 0;
        let startWidths = [];
        let dragState = null;

        const handleMouseMove = (e) => {
          if (!isDragging || !dragState) return;

          // Prevent default to avoid any browser interference
          e.preventDefault();

          const deltaX = e.clientX - startX;
          const containerWidth = iframeContainer.clientWidth;
          const deltaPercentage = (deltaX / containerWidth) * 100;

          const { leftIframe, rightIframe, leftIndex, rightIndex } = dragState;

          if (leftIframe && rightIframe) {
            const newLeftWidth = startWidths[leftIndex] + deltaPercentage;
            const newRightWidth = startWidths[rightIndex] - deltaPercentage;

            // Ensure minimum and maximum widths
            const minWidth = 5;
            const maxLeftWidth =
              startWidths[leftIndex] + startWidths[rightIndex] - minWidth;
            const maxRightWidth =
              startWidths[leftIndex] + startWidths[rightIndex] - minWidth;

            // Clamp values to prevent going beyond boundaries
            const clampedLeftWidth = Math.max(
              minWidth,
              Math.min(maxLeftWidth, newLeftWidth),
            );
            const clampedRightWidth = Math.max(
              minWidth,
              Math.min(maxRightWidth, newRightWidth),
            );

            // Ensure total width remains constant
            const totalWidth = clampedLeftWidth + clampedRightWidth;
            const expectedTotal =
              startWidths[leftIndex] + startWidths[rightIndex];

            if (Math.abs(totalWidth - expectedTotal) < 0.1) {
              leftIframe.style.width = `${clampedLeftWidth}%`;
              rightIframe.style.width = `${clampedRightWidth}%`;
            }
          }
        };

        const handleMouseUp = (e) => {
          if (isDragging) {
            isDragging = false;
            dragState = null;

            // Restore styles
            document.body.style.userSelect = '';
            document.body.style.cursor = '';

            // Re-enable pointer events on iframes
            const iframes = document.querySelectorAll('.resizable-iframe');
            iframes.forEach((iframe) => {
              iframe.style.pointerEvents = 'auto';
            });

            // Release mouse capture
            if (divider.releaseCapture) {
              divider.releaseCapture();
            }

            // Remove event listeners
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('mouseleave', handleMouseUp);
          }
        };

        divider.addEventListener('mousedown', (e) => {
          // Prevent default to avoid text selection
          e.preventDefault();

          isDragging = true;
          startX = e.clientX;

          // Store current widths of all iframes
          const iframes = /** @type {NodeListOf<HTMLIFrameElement>} */ (
            document.querySelectorAll('.resizable-iframe')
          );
          startWidths = Array.from(iframes).map((iframe) =>
            parseFloat(iframe.style.width),
          );

          // Store drag state for this specific divider
          dragState = {
            leftIframe: iframes[index],
            rightIframe: iframes[index + 1],
            leftIndex: index,
            rightIndex: index + 1,
          };

          // Prevent text selection and iframe interaction during drag
          document.body.style.userSelect = 'none';
          document.body.style.cursor = 'col-resize';

          // Disable pointer events on iframes to prevent interference
          iframes.forEach((iframe) => {
            iframe.style.pointerEvents = 'none';
          });

          // Capture mouse to handle fast movements
          if (divider.setCapture) {
            divider.setCapture();
          }

          // Add event listeners to document for better capture
          document.addEventListener('mousemove', handleMouseMove, {
            passive: false,
          });
          document.addEventListener('mouseup', handleMouseUp);
          document.addEventListener('mouseleave', handleMouseUp);
        });
      }
    });
  }
});
