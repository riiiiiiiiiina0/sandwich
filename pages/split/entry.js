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

  if (!urlsParam) return;

  const urls = urlsParam.split(',').map((url) => decodeURIComponent(url));
  const numIframes = urls.length;

  if (layoutParam === 'grid' || layoutParam === 'vertical') {
    appState.setLayout(layoutParam);
  } else if (numIframes === 4 && !layoutParam) {
    appState.setLayout('grid');
  } else {
    appState.setLayout('horizontal');
  }

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

  attachEdgePlusButtons();

  urls.forEach((url, index) => {
    const layout = appState.getLayout();
    const isVerticalLayout = layout === 'vertical';

    const iframeWrapper = document.createElement('div');
    iframeWrapper.className =
      'iframe-wrapper group relative flex-shrink-0 flex-grow-0';
    /** @type {HTMLElement} */ (iframeWrapper).style.order = String(index * 2);
    /** @type {HTMLElement} */ (iframeWrapper).dataset.ratio = String(
      ratios[index],
    );
    applyWrapperPrimarySize(
      iframeWrapper,
      ratios[index],
      isVerticalLayout,
      iframeContainer,
    );

    const iframe = /** @type {HTMLIFrameElement} */ (
      document.createElement('iframe')
    );
    iframe.src = url;
    iframe.name = `sb-iframe-${index}`;
    iframe.setAttribute(
      'sandbox',
      'allow-same-origin allow-scripts allow-forms allow-popups allow-downloads',
    );
    iframe.setAttribute(
      'allow',
      'fullscreen; clipboard-read; clipboard-write',
    );
    if (layout === 'grid') {
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.className =
        'resizable-iframe h-full w-full box-border pointer-events-auto flex-shrink-0 flex-grow-0';
    } else if (isVerticalLayout) {
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
      /** @type {HTMLElement} */ (divider).style.order = String(index * 2 + 1);
      iframeContainer.appendChild(divider);
      addDividerDragFunctionality(divider);
      attachDividerPlus(divider);
    }
  });
  // After initial creation, ensure plus visibility matches count
  updateDividerPlusVisibility();
  // Apply layout now that iframes are in the DOM
  applyLayout();
  // Initialize document title from iframes
  updateDocumentTitleFromIframes();
});
