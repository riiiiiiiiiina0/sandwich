import { appState } from './state.js';
import {
  applyLayout,
  ensureLinearDividers,
  setLayoutToGrid,
  setLayoutToHorizontal,
  setLayoutToVertical,
} from './layout.js';
import { createIframeMenu } from './menu.js';
import { addDividerDragFunctionality } from './drag.js';
import {
  attachDividerPlus,
  updateDividerPlusVisibility,
  attachEdgePlusButtons,
  insertAtEdge,
  insertAtDivider,
} from './insert.js';
import { applyWrapperPrimarySize, recalcAllWrapperSizes } from './size.js';
import {
  attachIframeTitleListener,
  updateDocumentTitleFromIframes,
} from './title.js';
import { startContentTitleBridge } from './title.js';
import {
  attachActiveHoverListener,
  attachActiveListenersToAllIframes,
} from './active.js';

document.addEventListener('DOMContentLoaded', () => {
  startContentTitleBridge();

  chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.action === 'change-layout') {
      if (message.layout === 'grid') {
        setLayoutToGrid();
      } else if (message.layout === 'vertical') {
        setLayoutToVertical();
      } else if (message.layout === 'horizontal') {
        setLayoutToHorizontal();
      }
    } else if (message.action === 'registerFrame') {
      const { frameName } = message;
      if (frameName && sender.frameId) {
        const iframe = /** @type {HTMLIFrameElement|null} */ (
          document.querySelector(`iframe[name="${frameName}"]`)
        );
        if (iframe) {
          iframe.dataset.frameId = String(sender.frameId);
        }
      }
    } else if (message.action === 'add-iframe-right') {
      const wrappers = document.querySelectorAll('.iframe-wrapper');
      if (wrappers.length >= 4) {
        console.log('Maximum number of iframes (4) reached.');
        return;
      }

      // Prefer explicit message.frameId, else use sender.frameId, else resolve by frameName
      const resolvedFrameId = message.frameId ?? sender.frameId;
      let sourceIframe = null;
      if (typeof resolvedFrameId === 'number') {
        sourceIframe = document.querySelector(
          `iframe[data-frame-id="${resolvedFrameId}"]`,
        );
      }
      if (!sourceIframe && typeof message.frameName === 'string') {
        sourceIframe = document.querySelector(
          `iframe[name="${message.frameName}"]`,
        );
      }
      if (!sourceIframe) {
        // Fallback if frame not found
        insertAtEdge('tail', message.url);
        return;
      }

      const sourceWrapper = /** @type {HTMLDivElement} */ (
        sourceIframe.closest('.iframe-wrapper')
      );
      if (!sourceWrapper) {
        // Fallback if wrapper not found
        insertAtEdge('tail', message.url);
        return;
      }

      const sourceOrder = parseInt(sourceWrapper.style.order, 10);
      const dividerOrder = sourceOrder + 1;

      const dividers = document.querySelectorAll('.iframe-divider');
      const divider = Array.from(dividers).find(
        (d) =>
          parseInt(/** @type {HTMLElement} */ (d).style.order, 10) ===
          dividerOrder,
      );

      if (divider) {
        insertAtDivider(/** @type {HTMLDivElement} */ (divider), message.url);
      } else {
        insertAtEdge('tail', message.url);
      }
    }
  });

  const iframeContainer = /** @type {HTMLDivElement} */ (
    document.getElementById('iframe-container')
  );
  appState.setContainer(iframeContainer);

  const urlParams = new URLSearchParams(window.location.search);
  const stateParam = urlParams.get('state');
  /** @type {{urls?: string[]; ratios?: number[]; layout?: 'horizontal'|'vertical'|'grid'; titles?: string[]}|null} */
  let parsedState = null;
  try {
    if (stateParam) parsedState = JSON.parse(stateParam);
  } catch (_e) {
    parsedState = null;
  }

  /** @type {string[]} */
  let urls = Array.isArray(parsedState?.urls)
    ? parsedState.urls.map((u) => String(u))
    : [];

  /** @type {number[]} */
  let ratios = Array.isArray(parsedState?.ratios)
    ? parsedState.ratios.map((r) => Number(r))
    : [];

  /** @type {'horizontal'|'vertical'|'grid'|null} */
  let layout =
    parsedState &&
    (parsedState.layout === 'horizontal' ||
      parsedState.layout === 'vertical' ||
      parsedState.layout === 'grid')
      ? parsedState.layout
      : null;

  if (layout) {
    appState.setLayoutMode(layout);
  }

  if (!urls || urls.length === 0) return;

  const numIframes = urls.length;

  if (ratios && ratios.length > 0) {
    const totalRatio = ratios.reduce((sum, ratio) => sum + ratio, 0);
    if (
      ratios.length !== numIframes ||
      Math.abs(totalRatio - 100) > 0.1 ||
      ratios.some((ratio) => ratio <= 0)
    ) {
      ratios = Array(numIframes).fill(100 / numIframes);
    }
  } else {
    ratios = Array(numIframes).fill(100 / numIframes);
  }

  // If exactly four urls and no explicit layout specified, default to grid
  if (!layout && urls && urls.length === 4) {
    appState.setLayoutMode('grid');
  }

  applyLayout();
  attachEdgePlusButtons();

  urls.forEach((url, index) => {
    const isVerticalLayout = appState.getIsVerticalLayout();

    const iframeWrapper = document.createElement('div');
    iframeWrapper.className =
      'iframe-wrapper group relative flex-shrink-0 flex-grow-0';
    /** @type {HTMLElement} */ (iframeWrapper).style.order = String(index * 2);
    if (appState.getLayoutMode() !== 'grid') {
      /** @type {HTMLElement} */ (iframeWrapper).dataset.ratio = String(
        ratios[index],
      );
      applyWrapperPrimarySize(
        iframeWrapper,
        ratios[index],
        isVerticalLayout,
        iframeContainer,
      );
    } else {
      // In grid, do not assign linear ratios or inline sizes
      /** @type {HTMLElement} */ (iframeWrapper).dataset.ratio = '';
      iframeWrapper.style.width = '';
      iframeWrapper.style.height = '';
    }

    const iframe = /** @type {HTMLIFrameElement} */ (
      document.createElement('iframe')
    );
    iframe.src = url;
    iframe.name = `sb-iframe-${index}`;
    iframe.setAttribute(
      'sandbox',
      'allow-same-origin allow-scripts allow-forms allow-popups allow-downloads',
    );
    iframe.setAttribute('allow', 'fullscreen; clipboard-read; clipboard-write');
    if (isVerticalLayout) {
      iframe.style.height = '100%';
      iframe.style.width = '100%';
      iframe.className =
        'resizable-iframe w-full h-full box-border pointer-events-auto flex-shrink-0 flex-grow-0';
    } else {
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.className =
        'resizable-iframe h-full w-full box-border pointer-events-auto flex-shrink-0 flex-grow-0';
    }

    iframeWrapper.appendChild(iframe);
    attachActiveHoverListener(iframe);
    attachIframeTitleListener(iframe);

    const menu = createIframeMenu(iframeWrapper, index, urls.length);
    iframeWrapper.appendChild(menu);

    iframeContainer.appendChild(iframeWrapper);

    if (appState.getLayoutMode() !== 'grid' && index < urls.length - 1) {
      const divider = document.createElement('div');
      divider.className =
        'iframe-divider group relative bg-gray-300 dark:bg-gray-600 hover:bg-blue-400 transition-colors delay-300';
      if (isVerticalLayout) {
        divider.className +=
          ' m-0 p-0 h-1 w-full cursor-row-resize min-h-1 relative flex-shrink-0 flex-grow-0';
      } else {
        divider.className +=
          ' m-0 p-0 w-1 h-full cursor-col-resize min-w-1 relative flex-shrink-0 flex-grow-0';
      }
      /** @type {HTMLElement} */ (divider).style.order = String(index * 2 + 1);
      iframeContainer.appendChild(divider);
      addDividerDragFunctionality(divider);
      attachDividerPlus(divider);
    }
  });
  // After initial creation, ensure plus visibility matches count
  updateDividerPlusVisibility();
  // Recalculate sizes for linear layouts; in grid let CSS grid handle equal sizing
  if (appState.getLayoutMode() !== 'grid') {
    recalcAllWrapperSizes(iframeContainer, appState.getIsVerticalLayout());
  }
  // Initialize document title from iframes
  updateDocumentTitleFromIframes();
  attachActiveListenersToAllIframes();
});
