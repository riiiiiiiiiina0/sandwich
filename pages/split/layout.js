import { appState } from './state.js';
import { heroicons } from './heroicons.js';
import { updateCssOrder } from './ordering.js';
import { updateUrlWithState } from './url.js';
import { recalcAllWrapperSizes } from './size.js';

export const applyLayout = () => {
  const iframeContainer = appState.getContainer();
  const layoutMode = appState.getLayoutMode();

  if (layoutMode === 'grid') {
    iframeContainer.className = 'flex flex-row h-screen w-screen';
    return;
  }

  if (layoutMode === 'vertical') {
    iframeContainer.className = 'flex flex-col h-screen w-screen';
  } else if (layoutMode === 'horizontal') {
    iframeContainer.className = 'flex flex-row h-screen w-screen';
  }

  const iframes = /** @type {NodeListOf<HTMLIFrameElement>} */ (
    document.querySelectorAll('.resizable-iframe')
  );
  const dividers = /** @type {NodeListOf<HTMLDivElement>} */ (
    document.querySelectorAll('.iframe-divider')
  );
  const wrappers = /** @type {NodeListOf<HTMLDivElement>} */ (
    document.querySelectorAll('.iframe-wrapper')
  );

  const isVertical = layoutMode === 'vertical';

  iframes.forEach((iframe) => {
    if (isVertical) {
      iframe.className =
        'resizable-iframe w-full border border-gray-300 box-border rounded-lg pointer-events-auto flex-shrink-0 flex-grow-0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
    } else {
      iframe.className =
        'resizable-iframe h-full border border-gray-300 box-border rounded-lg pointer-events-auto flex-shrink-0 flex-grow-0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
    }
  });

  // Recalculate wrapper sizes using stored ratios and divider count
  recalcAllWrapperSizes(iframeContainer, isVertical);

  // Enforce fixed 4px thickness (Tailwind h-1/w-1) for dividers
  dividers.forEach((divider) => {
    if (isVertical) {
      divider.className =
        'iframe-divider group relative bg-base-300 dark:bg-gray-600 hover:bg-blue-400 transition-colors delay-300 m-0 p-0 h-1 w-full cursor-row-resize min-h-1 flex-shrink-0 flex-grow-0';
      /** @type {HTMLElement} */ (divider).style.height = '4px';
      /** @type {HTMLElement} */ (divider).style.width = '';
    } else {
      divider.className =
        'iframe-divider group relative bg-base-300 dark:bg-gray-600 hover:bg-blue-400 transition-colors delay-300 m-0 p-0 w-1 h-full cursor-col-resize min-w-1 flex-shrink-0 flex-grow-0';
      /** @type {HTMLElement} */ (divider).style.width = '4px';
      /** @type {HTMLElement} */ (divider).style.height = '';
    }
  });

  updateCssOrder();
};

export const toggleLayout = () => {
  appState.toggleLayout();
  applyLayout();
  updateButtonLabels();
  updateUrlWithState();
};

export const updateButtonLabels = () => {
  const iframeContainer = appState.getContainer();
  const layoutMode = appState.getLayoutMode();
  const wrappers = Array.from(iframeContainer.children).filter((child) =>
    child.classList.contains('iframe-wrapper'),
  );

  wrappers.forEach((wrapper) => {
    const menu = wrapper.querySelector('.iframe-menu');
    if (menu) {
      const layoutBtn = /** @type {HTMLButtonElement|null} */ (
        menu.querySelector('button[data-role="layout"]')
      );
      const moveLeftBtn = /** @type {HTMLButtonElement|null} */ (
        menu.querySelector('button[data-role="move-left"]')
      );
      const moveRightBtn = /** @type {HTMLButtonElement|null} */ (
        menu.querySelector('button[data-role="move-right"]')
      );

      if (layoutBtn) {
        const isVertical = layoutMode === 'vertical';
        const iconName = isVertical ? 'columns' : 'rows';
        layoutBtn.innerHTML = heroicons[iconName].svg;
        const nextSvg = /** @type {SVGElement|null} */ (
          layoutBtn.querySelector('svg')
        );
        if (nextSvg) {
          const baseRotation =
            (heroicons[iconName] && heroicons[iconName].rotation) ?? 0;
          nextSvg.style.transform = `rotate(${baseRotation}deg)`;
        }
        layoutBtn.title = isVertical ? 'Horizontal layout' : 'Vertical layout';
      }

      if (moveLeftBtn) {
        const isVertical = layoutMode === 'vertical';
        const svg = /** @type {SVGElement|null} */ (
          moveLeftBtn.querySelector('svg')
        );
        if (svg) {
          const baseRotation =
            (heroicons.moveLeft && heroicons.moveLeft.rotation) ?? 0;
          const extraRotation = isVertical ? -90 : 0;
          svg.style.transform = `rotate(${baseRotation + extraRotation}deg)`;
        }
        moveLeftBtn.title = isVertical ? 'Move up' : 'Move left';
      }

      if (moveRightBtn) {
        const isVertical = layoutMode === 'vertical';
        const svg = /** @type {SVGElement|null} */ (
          moveRightBtn.querySelector('svg')
        );
        if (svg) {
          const baseRotation =
            (heroicons.moveRight && heroicons.moveRight.rotation) ?? 0;
          const extraRotation = isVertical ? 90 : 0;
          svg.style.transform = `rotate(${baseRotation + extraRotation}deg)`;
        }
        moveRightBtn.title = isVertical ? 'Move down' : 'Move right';
      }
    }
  });
};
