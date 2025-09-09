import { appState } from './state.js';
import { updateUrlWithState } from './url.js';
import { applyWrapperPrimarySize } from './size.js';

export const addDividerDragFunctionality = (divider) => {
  const iframeContainer = appState.getContainer();
  const getLayoutMode = () => appState.getLayoutMode();

  let isDragging = false;
  let startPosition = 0;
  let startSizes = [];
  let dragState = null;

  const handleMouseMove = (e) => {
    if (!isDragging || !dragState) return;
    e.preventDefault();

    const {
      leftWrapper,
      rightWrapper,
      leftIndex,
      rightIndex,
      isVerticalDrag,
      container,
    } = dragState;

    const currentPosition = isVerticalDrag ? e.clientX : e.clientY;
    const delta = currentPosition - startPosition;

    const totalDividerCount = container.querySelectorAll('.iframe-divider').length;
    const dividerPx = totalDividerCount * 4;
    const containerSize = isVerticalDrag
      ? container.clientWidth
      : container.clientHeight;
    const effectiveSize = Math.max(1, containerSize - dividerPx);
    const deltaPercentage = (delta / effectiveSize) * 100;

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
        applyWrapperPrimarySize(
          leftWrapper,
          clampedLeftSize,
          !isVerticalDrag,
          container,
        );
        applyWrapperPrimarySize(
          rightWrapper,
          clampedRightSize,
          !isVerticalDrag,
          container,
        );

        if (!isVerticalDrag && getLayoutMode() === 'grid') {
          const otherDividers = document.querySelectorAll(
            '.grid-horizontal-divider',
          );
          otherDividers.forEach((otherDivider) => {
            if (otherDivider !== divider) {
              const otherContainer = otherDivider.parentElement;
              const otherLeftWrapper = otherDivider.previousElementSibling;
              const otherRightWrapper = otherDivider.nextElementSibling;
              applyWrapperPrimarySize(
                otherLeftWrapper,
                clampedLeftSize,
                true,
                otherContainer,
              );
              applyWrapperPrimarySize(
                otherRightWrapper,
                clampedRightSize,
                true,
                otherContainer,
              );
            }
          });
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
    const isVerticalDrag = window.getComputedStyle(divider).cursor === 'col-resize';
    startPosition = isVerticalDrag ? e.clientX : e.clientY;

    const container = isVerticalDrag ? iframeContainer : divider.parentElement;
    const wrappers = Array.from(container.children).filter(
      (c) =>
        c.classList.contains('iframe-wrapper') ||
        c.classList.contains('iframe-column-wrapper'),
    );

    startSizes = wrappers.map((wrapper) => {
      const ds = /** @type {HTMLElement} */ (wrapper).dataset;
      const v = ds && ds.ratio ? Number.parseFloat(ds.ratio) : NaN;
      return Number.isFinite(v) ? v : 100 / wrappers.length;
    });

    const dividerIndex = wrappers.indexOf(divider.previousElementSibling) + 1;

    dragState = {
      leftWrapper: wrappers[dividerIndex - 1],
      rightWrapper: wrappers[dividerIndex],
      leftIndex: dividerIndex - 1,
      rightIndex: dividerIndex,
      isVerticalDrag,
      container,
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = isVerticalDrag ? 'col-resize' : 'row-resize';

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
