import { appState } from './state.js';
import { heroicons } from './heroicons.js';
import { updateCssOrder } from './ordering.js';
import { updateUrlWithState } from './url.js';
import { recalcAllWrapperSizes } from './size.js';
import { addDividerDragFunctionality } from './drag.js';

export const applyLayout = () => {
  const iframeContainer = appState.getContainer();
  const layout = appState.getLayout();
  const isVerticalLayout = layout === 'vertical';

  if (layout === 'grid') {
    iframeContainer.className = 'flex flex-col h-screen w-screen';
  } else if (isVerticalLayout) {
    iframeContainer.className = 'flex flex-col h-screen w-screen';
  } else {
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

  if (layout === 'grid') {
    if (wrappers.length === 4) {
      // Clear container
      while (iframeContainer.firstChild) {
        iframeContainer.removeChild(iframeContainer.firstChild);
      }

      const topRow = document.createElement('div');
      topRow.className = 'flex flex-row flex-1';
      const bottomRow = document.createElement('div');
      bottomRow.className = 'flex flex-row flex-1';

      topRow.appendChild(wrappers[0]);
      topRow.appendChild(wrappers[1]);
      bottomRow.appendChild(wrappers[2]);
      bottomRow.appendChild(wrappers[3]);

      iframeContainer.appendChild(topRow);
      iframeContainer.appendChild(bottomRow);

      wrappers.forEach((wrapper) => {
        wrapper.style.flex = '1 1 50%';
      });
      // Clear existing dividers
      dividers.forEach((d) => d.remove());

      // Create new dividers
      const horizontalDivider1 = document.createElement('div');
      horizontalDivider1.className =
        'iframe-divider group relative bg-base-300 dark:bg-gray-600 hover:bg-blue-400 transition-colors delay-300 m-0 p-0 w-1 h-full cursor-col-resize min-w-1 flex-shrink-0 flex-grow-0';
      horizontalDivider1.style.order = '1';
      topRow.insertBefore(horizontalDivider1, wrappers[1]);

      const horizontalDivider2 = document.createElement('div');
      horizontalDivider2.className =
        'iframe-divider group relative bg-base-300 dark:bg-gray-600 hover:bg-blue-400 transition-colors delay-300 m-0 p-0 w-1 h-full cursor-col-resize min-w-1 flex-shrink-0 flex-grow-0';
      horizontalDivider2.style.order = '1';
      bottomRow.insertBefore(horizontalDivider2, wrappers[3]);

      const verticalDivider = document.createElement('div');
      verticalDivider.className =
        'iframe-divider group relative bg-base-300 dark:bg-gray-600 hover:bg-blue-400 transition-colors delay-300 m-0 p-0 h-1 w-full cursor-row-resize min-h-1 flex-shrink-0 flex-grow-0';
      iframeContainer.insertBefore(verticalDivider, bottomRow);

      addDividerDragFunctionality(horizontalDivider1);
      addDividerDragFunctionality(horizontalDivider2);
      addDividerDragFunctionality(verticalDivider);
    }
  } else {
    const preLayout = appState.getPreLayout();
    if (preLayout === 'grid') {
      const numWrappers = wrappers.length;
      const ratio = 100 / numWrappers;
      wrappers.forEach((wrapper) => {
        wrapper.dataset.ratio = String(ratio);
      });
    }
    // Move wrappers back to container if they are in rows
    const rows = iframeContainer.querySelectorAll('.flex-row');
    if (rows.length > 0) {
      rows.forEach((row) => {
        while (row.firstChild) {
          iframeContainer.appendChild(row.firstChild);
        }
        row.remove();
      });
    }

    iframes.forEach((iframe) => {
      if (isVerticalLayout) {
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
    dividers.forEach((divider) => {
      divider.style.display = '';
    });
  }

  // Recalculate wrapper sizes using stored ratios and divider count
  recalcAllWrapperSizes(iframeContainer, isVerticalLayout);

  // Enforce fixed 4px thickness (Tailwind h-1/w-1) for dividers
  dividers.forEach((divider) => {
    if (isVerticalLayout) {
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


export const updateButtonLabels = () => {
  const iframeContainer = appState.getContainer();
  const layout = appState.getLayout();
  const isVerticalLayout = layout === 'vertical';
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
        const iconName =
          layout === 'horizontal'
            ? 'rows'
            : layout === 'vertical'
            ? 'grid'
            : 'columns';
        layoutBtn.innerHTML = heroicons[iconName].svg;
        const nextSvg = /** @type {SVGElement|null} */ (
          layoutBtn.querySelector('svg')
        );
        if (nextSvg) {
          const baseRotation =
            (heroicons[iconName] && heroicons[iconName].rotation) ?? 0;
          nextSvg.style.transform = `rotate(${baseRotation}deg)`;
        }
        layoutBtn.title =
          layout === 'horizontal'
            ? 'Vertical layout'
            : layout === 'vertical'
            ? 'Grid layout'
            : 'Horizontal layout';
      }

      if (moveLeftBtn) {
        const svg = /** @type {SVGElement|null} */ (
          moveLeftBtn.querySelector('svg')
        );
        if (svg) {
          const baseRotation =
            (heroicons.moveLeft && heroicons.moveLeft.rotation) ?? 0;
          const extraRotation = isVerticalLayout ? -90 : 0;
          svg.style.transform = `rotate(${baseRotation + extraRotation}deg)`;
        }
        moveLeftBtn.title = isVerticalLayout ? 'Move up' : 'Move left';
      }

      if (moveRightBtn) {
        const svg = /** @type {SVGElement|null} */ (
          moveRightBtn.querySelector('svg')
        );
        if (svg) {
          const baseRotation =
            (heroicons.moveRight && heroicons.moveRight.rotation) ?? 0;
          const extraRotation = isVerticalLayout ? 90 : 0;
          svg.style.transform = `rotate(${baseRotation + extraRotation}deg)`;
        }
        moveRightBtn.title = isVerticalLayout ? 'Move down' : 'Move right';
      }
    }
  });
};
