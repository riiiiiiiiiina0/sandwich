import { appState } from './state.js';
import { applyLayout } from './layout.js';
import { createIframeMenu } from './menu.js';
import { addDividerDragFunctionality } from './drag.js';
import {
  attachDividerPlus,
  updateDividerPlusVisibility,
  attachEdgePlusButtons,
} from './insert.js';

document.addEventListener('DOMContentLoaded', () => {
  const iframeContainer = /** @type {HTMLDivElement} */ (
    document.getElementById('iframe-container')
  );
  appState.setContainer(iframeContainer);

  const urlParams = new URLSearchParams(window.location.search);
  const urlsParam = urlParams.get('urls');
  const ratiosParam = urlParams.get('ratios');
  const layoutParam = urlParams.get('layout');

  appState.setVerticalLayout(layoutParam === 'vertical');

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

  applyLayout();
  attachEdgePlusButtons();

  urls.forEach((url, index) => {
    const isVerticalLayout = appState.getIsVerticalLayout();

    const iframeWrapper = document.createElement('div');
    iframeWrapper.className =
      'iframe-wrapper group relative flex-shrink-0 flex-grow-0';
    /** @type {HTMLElement} */ (iframeWrapper).style.order = String(index * 2);
    if (isVerticalLayout) {
      iframeWrapper.style.height = `${ratios[index]}%`;
      iframeWrapper.style.width = '100%';
    } else {
      iframeWrapper.style.width = `${ratios[index]}%`;
      iframeWrapper.style.height = '100%';
    }

    const iframe = /** @type {HTMLIFrameElement} */ (
      document.createElement('iframe')
    );
    iframe.src = url;
    iframe.setAttribute(
      'sandbox',
      'allow-same-origin allow-scripts allow-forms allow-popups',
    );
    iframe.setAttribute('allow', 'fullscreen');
    if (isVerticalLayout) {
      iframe.style.height = '100%';
      iframe.style.width = '100%';
      iframe.className =
        'resizable-iframe w-full h-full border border-gray-300 box-border rounded-lg pointer-events-auto flex-shrink-0 flex-grow-0';
    } else {
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.className =
        'resizable-iframe h-full w-full border border-gray-300 box-border rounded-lg pointer-events-auto flex-shrink-0 flex-grow-0';
    }

    iframeWrapper.appendChild(iframe);

    const menu = createIframeMenu(iframeWrapper, index, urls.length);
    iframeWrapper.appendChild(menu);

    iframeContainer.appendChild(iframeWrapper);

    if (index < urls.length - 1) {
      const divider = document.createElement('div');
      divider.className = 'iframe-divider group relative';
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
});
