import { appState } from './state.js';
import { updateUrlWithState } from './url.js';

export const addDividerDragFunctionality = (divider) => {
  const iframeContainer = appState.getContainer();
  const isVerticalLayout = () => appState.getIsVerticalLayout();

  let isDragging = false;
  let startPosition = 0;
  let startSizes = [];
  let dragState = null;

  const handleMouseMove = (e) => {
    if (!isDragging || !dragState) return;
    e.preventDefault();

    const currentPosition = isVerticalLayout() ? e.clientY : e.clientX;
    const delta = currentPosition - startPosition;
    const containerSize = isVerticalLayout()
      ? iframeContainer.clientHeight
      : iframeContainer.clientWidth;
    const deltaPercentage = (delta / containerSize) * 100;

    const { leftWrapper, rightWrapper, leftIndex, rightIndex } = dragState;

    if (leftWrapper && rightWrapper) {
      const newLeftSize = startSizes[leftIndex] + deltaPercentage;
      const newRightSize = startSizes[rightIndex] - deltaPercentage;

      const minSize = 5;
      const maxLeftSize =
        startSizes[leftIndex] + startSizes[rightIndex] - minSize;
      const maxRightSize =
        startSizes[leftIndex] + startSizes[rightIndex] - minSize;

      const clampedLeftSize = Math.max(
        minSize,
        Math.min(maxLeftSize, newLeftSize),
      );
      const clampedRightSize = Math.max(
        minSize,
        Math.min(maxRightSize, newRightSize),
      );

      const totalSize = clampedLeftSize + clampedRightSize;
      const expectedTotal = startSizes[leftIndex] + startSizes[rightIndex];

      if (Math.abs(totalSize - expectedTotal) < 0.1) {
        if (isVerticalLayout()) {
          leftWrapper.style.height = `${clampedLeftSize}%`;
          rightWrapper.style.height = `${clampedRightSize}%`;
        } else {
          leftWrapper.style.width = `${clampedLeftSize}%`;
          rightWrapper.style.width = `${clampedRightSize}%`;
        }
      }
    }
  };

  const handleMouseUp = (_e) => {
    if (isDragging) {
      isDragging = false;
      dragState = null;

      document.body.style.userSelect = '';
      document.body.style.cursor = '';

      const iframes = /** @type {NodeListOf<HTMLIFrameElement>} */ (
        document.querySelectorAll('.resizable-iframe')
      );
      iframes.forEach((iframe) => {
        iframe.style.pointerEvents = 'auto';
      });

      if (
        'releaseCapture' in divider &&
        typeof divider.releaseCapture === 'function'
      ) {
        divider.releaseCapture();
      }

      updateUrlWithState();

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseUp);
    }
  };

  divider.addEventListener('mousedown', (e) => {
    e.preventDefault();

    isDragging = true;
    startPosition = isVerticalLayout() ? e.clientY : e.clientX;

    const wrappers = /** @type {HTMLDivElement[]} */ (
      Array.from(iframeContainer.querySelectorAll('.iframe-wrapper'))
    );
    const wrappersSorted = wrappers
      .map((w, domIndex) => ({
        el: w,
        orderValue: Number.parseInt(
          /** @type {HTMLElement} */ (w).style.order || `${domIndex * 2}`,
          10,
        ),
      }))
      .sort((a, b) => a.orderValue - b.orderValue)
      .map((x) => x.el);

    startSizes = wrappersSorted.map((wrapper) => {
      if (isVerticalLayout()) {
        return parseFloat(wrapper.style.height);
      } else {
        return parseFloat(wrapper.style.width);
      }
    });

    const dividerOrder = Number.parseInt(
      /** @type {HTMLElement} */ (divider).style.order || '1',
      10,
    );
    const leftIndex = Math.max(0, Math.floor((dividerOrder - 1) / 2));
    const rightIndex = Math.min(wrappersSorted.length - 1, leftIndex + 1);

    dragState = {
      leftWrapper: wrappersSorted[leftIndex],
      rightWrapper: wrappersSorted[rightIndex],
      leftIndex,
      rightIndex,
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = isVerticalLayout()
      ? 'row-resize'
      : 'col-resize';

    const iframes = /** @type {NodeListOf<HTMLIFrameElement>} */ (
      document.querySelectorAll('.resizable-iframe')
    );
    iframes.forEach((iframe) => {
      iframe.style.pointerEvents = 'none';
    });

    if ('setCapture' in divider && typeof divider.setCapture === 'function') {
      divider.setCapture();
    }

    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseUp);
  });
};
