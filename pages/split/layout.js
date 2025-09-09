import { appState } from './state.js';
import { heroicons } from './heroicons.js';
import { updateCssOrder } from './ordering.js';
import { updateUrlWithState } from './url.js';
import { recalcAllWrapperSizes } from './size.js';
import {
  addDividerDragFunctionality,
  addGridDividerDragFunctionality,
} from './drag.js';
import { attachDividerPlus } from './insert.js';

import { rebuildInterface } from './rebuild.js';

export const applyLayout = () => {
  const iframeContainer = appState.getContainer();
  const mode = appState.getLayoutMode();
  const isVerticalLayout = mode === 'vertical';
  const isGridLayout = mode === 'grid';

  if (isGridLayout) {
    // Grid: 2x2 matrix with adjustable splits
    iframeContainer.className =
      'grid grid-cols-2 grid-rows-2 h-screen w-screen';
    const col = appState.getGridColumnPercent();
    const row = appState.getGridRowPercent();
    iframeContainer.style.display = 'grid';
    iframeContainer.style.gridTemplateColumns = `${col}% ${100 - col}%`;
    iframeContainer.style.gridTemplateRows = `${row}% ${100 - row}%`;
    // Remove any stale linear dividers or previous grid dividers before adding
    Array.from(
      iframeContainer.querySelectorAll(
        '.iframe-divider, [data-sb-grid-divider]',
      ),
    ).forEach((el) => el.remove());
  } else if (isVerticalLayout) {
    iframeContainer.className = 'flex flex-col h-screen w-screen';
    iframeContainer.style.display = '';
    iframeContainer.style.gridTemplateColumns = '';
    iframeContainer.style.gridTemplateRows = '';
  } else {
    iframeContainer.className = 'flex flex-row h-screen w-screen';
    iframeContainer.style.display = '';
    iframeContainer.style.gridTemplateColumns = '';
    iframeContainer.style.gridTemplateRows = '';
  }

  const iframes = /** @type {NodeListOf<HTMLIFrameElement>} */ (
    document.querySelectorAll('.resizable-iframe')
  );
  const dividers = /** @type {NodeListOf<HTMLDivElement>} */ (
    document.querySelectorAll('.iframe-divider')
  );
  const wrappers = /** @type {HTMLDivElement[]} */ (
    Array.from(document.querySelectorAll('.iframe-wrapper'))
  );

  iframes.forEach((iframe) => {
    // Reset inline sizing first to avoid stale styles across mode changes
    iframe.style.width = '';
    iframe.style.height = '';
    if (isGridLayout) {
      iframe.className =
        'resizable-iframe w-full h-full border border-gray-300 box-border rounded-lg pointer-events-auto';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
    } else if (isVerticalLayout) {
      iframe.className =
        'resizable-iframe w-full h-full border border-gray-300 box-border rounded-lg pointer-events-auto flex-shrink-0 flex-grow-0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
    } else {
      iframe.className =
        'resizable-iframe h-full w-full border border-gray-300 box-border rounded-lg pointer-events-auto flex-shrink-0 flex-grow-0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
    }
  });

  if (isGridLayout) {
    // Remove all linear dividers in grid layout
    dividers.forEach((d) => d.remove());

    // Clear wrapper inline sizes and reorder DOM by logical order TL,TR,BL,BR
    const sorted = wrappers
      .map((w, domIndex) => ({
        el: w,
        orderValue: Number.parseInt(
          /** @type {HTMLElement} */ (w).style.order || `${domIndex * 2}`,
          10,
        ),
      }))
      .sort((a, b) => a.orderValue - b.orderValue)
      .map((x) => x.el);

    sorted.forEach((w, idx) => {
      /** @type {HTMLElement} */ (w).style.width = '';
      /** @type {HTMLElement} */ (w).style.height = '';
      // Ensure wrappers are direct children in the right DOM order for CSS Grid
      iframeContainer.appendChild(w);
      // Normalize wrapper order indices to preserve movement semantics
      /** @type {HTMLElement} */ (w).style.order = String(idx * 2);
    });

    // Add grid dividers: one vertical and one horizontal
    // vertical divider overlay
    const vDivider = document.createElement('div');
    vDivider.dataset.sbGridDivider = 'vertical';
    vDivider.className =
      'absolute top-0 bottom-0 w-1 cursor-col-resize bg-gray-300/70 dark:bg-gray-600/70 hover:bg-blue-400 z-20';
    vDivider.style.position = 'absolute';
    vDivider.style.left = `calc(${appState.getGridColumnPercent()}% - 2px)`;
    vDivider.style.top = '0';
    vDivider.style.bottom = '0';
    iframeContainer.appendChild(vDivider);
    addGridDividerDragFunctionality(vDivider, 'vertical');

    const hDivider = document.createElement('div');
    hDivider.dataset.sbGridDivider = 'horizontal';
    hDivider.className =
      'absolute left-0 right-0 h-1 cursor-row-resize bg-gray-300/70 dark:bg-gray-600/70 hover:bg-blue-400 z-20';
    hDivider.style.position = 'absolute';
    hDivider.style.top = `calc(${appState.getGridRowPercent()}% - 2px)`;
    hDivider.style.left = '0';
    hDivider.style.right = '0';
    iframeContainer.appendChild(hDivider);
    addGridDividerDragFunctionality(hDivider, 'horizontal');
  } else {
    // Non-grid: Recalculate wrapper sizes using stored ratios and divider count
    // Remove any grid-specific dividers if present
    Array.from(
      iframeContainer.querySelectorAll('[data-sb-grid-divider]'),
    ).forEach((el) => el.remove());

    // Ensure wrappers get equal primary size if coming from grid (no ratios)
    const wrappersNoRatio = wrappers.filter(
      (w) => !(/** @type {HTMLElement} */ (w).dataset.ratio),
    );
    if (wrappersNoRatio.length > 0) {
      const equal = wrappers.length > 0 ? 100 / wrappers.length : 100;
      wrappers.forEach((w) => {
        /** @type {HTMLElement} */ (w).dataset.ratio = String(equal);
      });
    }

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
  }

  updateCssOrder();
};

export const toggleLayout = () => {
  appState.toggleVerticalLayout();
  applyLayout();
  updateButtonLabels();
  updateUrlWithState();
};

export const setLayoutToGrid = () => {
  appState.setLayoutMode('grid');
  // In grid, equalize size implicitly via grid; clear ratios for clarity
  const iframeContainer = appState.getContainer();
  const wrappers = /** @type {NodeListOf<HTMLDivElement>} */ (
    iframeContainer.querySelectorAll('.iframe-wrapper')
  );
  wrappers.forEach((w) => {
    /** @type {HTMLElement} */ (w).dataset.ratio = '';
  });
  applyLayout();
  rebuildInterface();
  updateButtonLabels();
  updateUrlWithState();
};

export const setLayoutToHorizontal = () => {
  appState.setLayoutMode('horizontal');
  const iframeContainer = appState.getContainer();
  // Rebuild linear dividers and reset equal widths
  ensureLinearDividers();
  const wrappers = /** @type {NodeListOf<HTMLDivElement>} */ (
    iframeContainer.querySelectorAll('.iframe-wrapper')
  );
  const equal = wrappers.length > 0 ? 100 / wrappers.length : 100;
  wrappers.forEach((w) => {
    /** @type {HTMLElement} */ (w).dataset.ratio = String(equal);
  });
  applyLayout();
  rebuildInterface();
  updateButtonLabels();
  updateUrlWithState();
};

export const setLayoutToVertical = () => {
  appState.setLayoutMode('vertical');
  const iframeContainer = appState.getContainer();
  // Rebuild linear dividers and reset equal heights
  ensureLinearDividers();
  const wrappers = /** @type {NodeListOf<HTMLDivElement>} */ (
    iframeContainer.querySelectorAll('.iframe-wrapper')
  );
  const equal = wrappers.length > 0 ? 100 / wrappers.length : 100;
  wrappers.forEach((w) => {
    /** @type {HTMLElement} */ (w).dataset.ratio = String(equal);
  });
  applyLayout();
  rebuildInterface();
  updateButtonLabels();
  updateUrlWithState();
};

export const updateButtonLabels = () => {
  const iframeContainer = appState.getContainer();
  const mode = appState.getLayoutMode();
  const isVerticalLayout = mode === 'vertical';
  const isGridLayout = mode === 'grid';
  const wrappers = Array.from(iframeContainer.children).filter((child) =>
    child.classList.contains('iframe-wrapper'),
  );

  wrappers.forEach((wrapper) => {
    const menu = wrapper.querySelector('.iframe-menu');
    if (menu) {
      const layoutBtn = /** @type {HTMLButtonElement|null} */ (
        menu.querySelector('button[data-role="layout"]')
      );
      const toHorizontalBtn = /** @type {HTMLButtonElement|null} */ (
        menu.querySelector('button[data-role="to-horizontal"]')
      );
      const toVerticalBtn = /** @type {HTMLButtonElement|null} */ (
        menu.querySelector('button[data-role="to-vertical"]')
      );
      const moveLeftBtn = /** @type {HTMLButtonElement|null} */ (
        menu.querySelector('button[data-role="move-left"]')
      );
      const moveRightBtn = /** @type {HTMLButtonElement|null} */ (
        menu.querySelector('button[data-role="move-right"]')
      );

      if (layoutBtn) {
        const iconName = isVerticalLayout ? 'columns' : 'rows';
        layoutBtn.innerHTML = heroicons[iconName].svg;
        const nextSvg = /** @type {SVGElement|null} */ (
          layoutBtn.querySelector('svg')
        );
        if (nextSvg) {
          const baseRotation =
            (heroicons[iconName] && heroicons[iconName].rotation) ?? 0;
          nextSvg.style.transform = `rotate(${baseRotation}deg)`;
        }
        layoutBtn.title = isVerticalLayout
          ? 'Horizontal layout'
          : 'Vertical layout';
      }

      if (toHorizontalBtn) {
        toHorizontalBtn.innerHTML = heroicons.columns.svg;
        const svg = /** @type {SVGElement|null} */ (
          toHorizontalBtn.querySelector('svg')
        );
        if (svg) {
          const baseRotation =
            (heroicons.columns && heroicons.columns.rotation) ?? 0;
          svg.style.transform = `rotate(${baseRotation}deg)`;
        }
        toHorizontalBtn.title = 'Horizontal layout';
      }

      if (toVerticalBtn) {
        toVerticalBtn.innerHTML = heroicons.rows.svg;
        const svg = /** @type {SVGElement|null} */ (
          toVerticalBtn.querySelector('svg')
        );
        if (svg) {
          const baseRotation = (heroicons.rows && heroicons.rows.rotation) ?? 0;
          svg.style.transform = `rotate(${baseRotation}deg)`;
        }
        toVerticalBtn.title = 'Vertical layout';
      }

      if (moveLeftBtn) {
        const svg = /** @type {SVGElement|null} */ (
          moveLeftBtn.querySelector('svg')
        );
        if (svg) {
          const baseRotation =
            (heroicons.moveLeft && heroicons.moveLeft.rotation) ?? 0;
          const extraRotation = isGridLayout ? 0 : isVerticalLayout ? -90 : 0;
          svg.style.transform = `rotate(${baseRotation + extraRotation}deg)`;
        }
        moveLeftBtn.title = isGridLayout
          ? 'Move left'
          : isVerticalLayout
          ? 'Move up'
          : 'Move left';
      }

      if (moveRightBtn) {
        const svg = /** @type {SVGElement|null} */ (
          moveRightBtn.querySelector('svg')
        );
        if (svg) {
          const baseRotation =
            (heroicons.moveRight && heroicons.moveRight.rotation) ?? 0;
          const extraRotation = isGridLayout ? 0 : isVerticalLayout ? 90 : 0;
          svg.style.transform = `rotate(${baseRotation + extraRotation}deg)`;
        }
        moveRightBtn.title = isGridLayout
          ? 'Move right'
          : isVerticalLayout
          ? 'Move down'
          : 'Move right';
      }
    }
  });
};

// Ensure there is a divider between each adjacent pair of wrappers in linear layouts
export const ensureLinearDividers = () => {
  const iframeContainer = appState.getContainer();
  const isVerticalLayout = appState.getIsVerticalLayout();
  // Remove all existing dividers and add fresh ones between wrappers
  const existing = /** @type {NodeListOf<HTMLDivElement>} */ (
    iframeContainer.querySelectorAll('.iframe-divider')
  );
  existing.forEach((d) => d.remove());

  const wrappers = /** @type {HTMLDivElement[]} */ (
    Array.from(iframeContainer.querySelectorAll('.iframe-wrapper'))
  );

  const sorted = wrappers
    .map((w, domIndex) => ({
      el: w,
      orderValue: Number.parseInt(
        /** @type {HTMLElement} */ (w).style.order || `${domIndex * 2}`,
        10,
      ),
    }))
    .sort((a, b) => a.orderValue - b.orderValue)
    .map((x) => x.el);

  sorted.forEach((w, index) => {
    /** @type {HTMLElement} */ (w).style.order = String(index * 2);
  });

  for (let i = 0; i < sorted.length - 1; i++) {
    const left = sorted[i];
    const divider = document.createElement('div');
    divider.className = 'iframe-divider group relative';
    if (isVerticalLayout) {
      divider.className +=
        ' bg-base-300 dark:bg-gray-600 hover:bg-blue-400 transition-colors delay-300 m-0 p-0 h-1 w-full cursor-row-resize min-h-1 relative flex-shrink-0 flex-grow-0';
      /** @type {HTMLElement} */ (divider).style.height = '4px';
      /** @type {HTMLElement} */ (divider).style.width = '';
    } else {
      divider.className +=
        ' bg-base-300 dark:bg-gray-600 hover:bg-blue-400 transition-colors delay-300 m-0 p-0 w-1 h-full cursor-col-resize min-w-1 relative flex-shrink-0 flex-grow-0';
      /** @type {HTMLElement} */ (divider).style.width = '4px';
      /** @type {HTMLElement} */ (divider).style.height = '';
    }
    /** @type {HTMLElement} */ (divider).style.order = String(i * 2 + 1);
    left.insertAdjacentElement('afterend', divider);
    addDividerDragFunctionality(divider);
    attachDividerPlus(divider);
  }
};
