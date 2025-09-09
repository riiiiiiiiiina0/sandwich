import { appState } from './state.js';
import { applyLayout } from './layout.js';
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

const createIframeWrapper = (
  url,
  ratio,
  isVertical,
  iframeContainer,
  name,
) => {
  const iframeWrapper = document.createElement('div');
  iframeWrapper.className =
    'iframe-wrapper group relative flex-shrink-0 flex-grow-0';
  iframeWrapper.dataset.ratio = String(ratio);
  applyWrapperPrimarySize(iframeWrapper, ratio, isVertical, iframeContainer);

  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.name = name;
  iframe.setAttribute(
    'sandbox',
    'allow-same-origin allow-scripts allow-forms allow-popups allow-downloads',
  );
  iframe.setAttribute('allow', 'fullscreen; clipboard-read; clipboard-write');
  if (isVertical) {
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
  attachIframeTitleListener(iframe);
  return iframeWrapper;
};

document.addEventListener('DOMContentLoaded', () => {
  startContentTitleBridge();

  chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.action === 'registerFrame') {
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

      const sourceIframe = document.querySelector(
        `iframe[data-frame-id="${message.frameId}"]`,
      );
      if (!sourceIframe) {
        // Fallback if frame not found
        insertAtEdge('tail', message.url);
        return;
      }

      const sourceWrapper = sourceIframe.closest('.iframe-wrapper');
      if (!sourceWrapper) {
        // Fallback if wrapper not found
        insertAtEdge('tail', message.url);
        return;
      }

      const sourceOrder = parseInt(sourceWrapper.style.order, 10);
      const dividerOrder = sourceOrder + 1;

      const dividers = document.querySelectorAll('.iframe-divider');
      const divider = Array.from(dividers).find(
        (d) => parseInt(d.style.order, 10) === dividerOrder,
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
  const urlsParam = urlParams.get('urls');
  const ratiosParam = urlParams.get('ratios');
  const layoutParam = urlParams.get('layout');

  if (layoutParam) {
    appState.setLayoutMode(layoutParam);
  }

  if (!urlsParam) return;

  const urls = urlsParam.split(',').map((url) => decodeURIComponent(url));
  const numIframes = urls.length;

  let ratios;
  if (ratiosParam) {
    ratios = ratiosParam.split(',').map((ratio) => parseFloat(ratio));
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

  if (urls.length === 4 && layoutParam !== 'horizontal' && layoutParam !== 'vertical') {
    appState.setLayoutMode('grid');
  }
  applyLayout();
  attachEdgePlusButtons();

  if (appState.getLayoutMode() === 'grid') {
    const column1 = document.createElement('div');
    column1.className = 'iframe-column-wrapper flex flex-col';
    column1.style.width = '50%';
    iframeContainer.appendChild(column1);

    const verticalDivider = document.createElement('div');
    verticalDivider.className =
      'iframe-divider group relative bg-base-200 dark:bg-gray-600 hover:bg-blue-400 transition-colors delay-300 m-0 p-0 w-1 h-full cursor-col-resize min-w-1 relative flex-shrink-0 flex-grow-0';
    iframeContainer.appendChild(verticalDivider);
    addDividerDragFunctionality(verticalDivider);

    const column2 = document.createElement('div');
    column2.className = 'iframe-column-wrapper flex flex-col';
    column2.style.width = '50%';
    iframeContainer.appendChild(column2);

    const wrapper1 = createIframeWrapper(
      urls[0],
      50,
      true,
      iframeContainer,
      'sb-iframe-0',
    );
    column1.appendChild(wrapper1);

    const horizontalDivider1 = document.createElement('div');
    horizontalDivider1.className =
      'iframe-divider grid-horizontal-divider group relative bg-base-200 dark:bg-gray-600 hover:bg-blue-400 transition-colors delay-300 m-0 p-0 h-1 w-full cursor-row-resize min-h-1 relative flex-shrink-0 flex-grow-0';
    column1.appendChild(horizontalDivider1);
    addDividerDragFunctionality(horizontalDivider1);

    const wrapper2 = createIframeWrapper(
      urls[1],
      50,
      true,
      iframeContainer,
      'sb-iframe-1',
    );
    column1.appendChild(wrapper2);

    const wrapper3 = createIframeWrapper(
      urls[2],
      50,
      true,
      iframeContainer,
      'sb-iframe-2',
    );
    column2.appendChild(wrapper3);

    const horizontalDivider2 = document.createElement('div');
    horizontalDivider2.className =
      'iframe-divider grid-horizontal-divider group relative bg-base-200 dark:bg-gray-600 hover:bg-blue-400 transition-colors delay-300 m-0 p-0 h-1 w-full cursor-row-resize min-h-1 relative flex-shrink-0 flex-grow-.0';
    column2.appendChild(horizontalDivider2);
    addDividerDragFunctionality(horizontalDivider2);

    const wrapper4 = createIframeWrapper(
      urls[3],
      50,
      true,
      iframeContainer,
      'sb-iframe-3',
    );
    column2.appendChild(wrapper4);

    [wrapper1, wrapper2, wrapper3, wrapper4].forEach((wrapper, index) => {
      const menu = createIframeMenu(wrapper, index, 4);
      wrapper.appendChild(menu);
    });
  } else {
    urls.forEach((url, index) => {
      const isVerticalLayout = appState.getLayoutMode() === 'vertical';

      const iframeWrapper = createIframeWrapper(
        url,
        ratios[index],
        isVerticalLayout,
        iframeContainer,
        `sb-iframe-${index}`,
      );
      /** @type {HTMLElement} */ (iframeWrapper).style.order = String(
        index * 2,
      );

      const menu = createIframeMenu(iframeWrapper, index, urls.length);
      iframeWrapper.appendChild(menu);

      iframeContainer.appendChild(iframeWrapper);

      if (index < urls.length - 1) {
        const divider = document.createElement('div');
        divider.className =
          'iframe-divider group relative bg-base-200 dark:bg-gray-600 hover:bg-blue-400 transition-colors delay-300';
        if (isVerticalLayout) {
          divider.className +=
            ' m-0 p-0 h-1 w-full cursor-row-resize min-h-1 relative flex-shrink-0 flex-grow-0';
        } else {
          divider.className +=
            ' m-0 p-0 w-1 h-full cursor-col-resize min-w-1 relative flex-shrink-0 flex-grow-0';
        }
        /** @type {HTMLElement} */ (divider).style.order = String(
          index * 2 + 1,
        );
        iframeContainer.appendChild(divider);
        addDividerDragFunctionality(divider);
        attachDividerPlus(divider);
      }
    });
  }
  // After initial creation, ensure plus visibility matches count
  updateDividerPlusVisibility();
  // Recalculate all wrapper sizes once with final divider count
  if (appState.getLayoutMode() !== 'grid') {
    recalcAllWrapperSizes(
      iframeContainer,
      appState.getLayoutMode() === 'vertical',
    );
  }
  // Initialize document title from iframes
  updateDocumentTitleFromIframes();
});
