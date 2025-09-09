import { appState } from './state.js';
import { updateUrlWithState } from './url.js';
import { recalcAllWrapperSizes } from './size.js';

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
    // Use the content size excluding divider pixels for percent calculation
    const totalDividerCount =
      iframeContainer.querySelectorAll('.iframe-divider').length;
    const dividerPx = totalDividerCount * 4; // keep in sync with size.js
    const containerSize = isVerticalLayout()
      ? iframeContainer.clientHeight
      : iframeContainer.clientWidth;
    const effectiveSize = Math.max(1, containerSize - dividerPx);
    const deltaPercentage = (delta / effectiveSize) * 100;

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
        // Persist new ratios and recalc sizes via calc() including divider pixels
        /** @type {HTMLElement} */ (leftWrapper).dataset.ratio =
          String(clampedLeftSize);
        /** @type {HTMLElement} */ (rightWrapper).dataset.ratio =
          String(clampedRightSize);
        recalcAllWrapperSizes(iframeContainer, isVerticalLayout());
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
      const ds = /** @type {HTMLElement} */ (wrapper).dataset;
      const v = ds && ds.ratio ? Number.parseFloat(ds.ratio) : NaN;
      return Number.isFinite(v) ? v : 100 / wrappersSorted.length;
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

/**
 * Add drag behavior for grid dividers (one vertical, one horizontal) that
 * adjust the 2x2 grid split percentages in state and live styles.
 * @param {HTMLDivElement} divider
 * @param {'vertical'|'horizontal'} orientation
 */
export const addGridDividerDragFunctionality = (divider, orientation) => {
  const iframeContainer = appState.getContainer();

  let isDragging = false;
  const onMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const rect = iframeContainer.getBoundingClientRect();
    if (orientation === 'vertical') {
      const x = Math.max(rect.left, Math.min(rect.right, e.clientX));
      const percent = ((x - rect.left) / Math.max(1, rect.width)) * 100;
      appState.setGridColumnPercent(percent);
    } else {
      const y = Math.max(rect.top, Math.min(rect.bottom, e.clientY));
      const percent = ((y - rect.top) / Math.max(1, rect.height)) * 100;
      appState.setGridRowPercent(percent);
    }
    // Apply live styles without reflowing menus etc.
    const col = appState.getGridColumnPercent();
    const row = appState.getGridRowPercent();
    iframeContainer.style.gridTemplateColumns = `${col}% ${100 - col}%`;
    iframeContainer.style.gridTemplateRows = `${row}% ${100 - row}%`;
    const v = /** @type {HTMLDivElement|null} */ (
      iframeContainer.querySelector('[data-sb-grid-divider="vertical"]')
    );
    const h = /** @type {HTMLDivElement|null} */ (
      iframeContainer.querySelector('[data-sb-grid-divider="horizontal"]')
    );
    if (v) v.style.left = `calc(${col}% - 2px)`;
    if (h) h.style.top = `calc(${row}% - 2px)`;
  };

  const onMouseUp = () => {
    if (!isDragging) return;
    isDragging = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    const iframes = /** @type {NodeListOf<HTMLIFrameElement>} */ (
      document.querySelectorAll('.resizable-iframe')
    );
    iframes.forEach((iframe) => {
      iframe.style.pointerEvents = 'auto';
    });
    updateUrlWithState();
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('mouseleave', onMouseUp);
  };

  divider.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDragging = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor =
      orientation === 'vertical' ? 'col-resize' : 'row-resize';
    const iframes = /** @type {NodeListOf<HTMLIFrameElement>} */ (
      document.querySelectorAll('.resizable-iframe')
    );
    iframes.forEach((iframe) => {
      iframe.style.pointerEvents = 'none';
    });
    if ('setCapture' in divider && typeof divider.setCapture === 'function') {
      divider.setCapture();
    }
    document.addEventListener('mousemove', onMouseMove, { passive: false });
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mouseleave', onMouseUp);
  });
};
