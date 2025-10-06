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
  resetDocumentTitleAndFavicon,
  resetFaviconToDefault,
  updateDocumentTitleAndFaviconFromIframe,
} from './title.js';
import { startContentTitleBridge } from './title.js';
import {
  attachActiveHoverListener,
  attachActiveListenersToAllIframes,
} from './active.js';
import { moveIframe } from './move.js';
import { removeIframe } from './remove.js';
import { expandIframe, collapseIframe, isFullPage } from './full-page.js';
import { createUrlDisplay, updateUrlDisplay } from './url-display.js';

document.addEventListener('DOMContentLoaded', () => {
  // Store the tabId for messaging iframes
  chrome.runtime.sendMessage({ action: 'get-tab-id' }, (response) => {
    if (response && response.tabId) {
      appState.setTabId(response.tabId);
    }
  });

  startContentTitleBridge();

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Return true to indicate that we will send a response asynchronously.
    // This is required for message handlers that use sendResponse.
    let isAsync = false;

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
    } else if (message.action === 'replace-iframe-right') {
      const { url } = message;
      if (!url) return;

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
      if (!sourceIframe) return;

      const sourceWrapper = /** @type {HTMLDivElement} */ (
        sourceIframe.closest('.iframe-wrapper')
      );
      if (!sourceWrapper) return;

      const sourceOrder = parseInt(sourceWrapper.style.order, 10);
      const targetOrder = sourceOrder + 2;

      const targetWrapper = /** @type {HTMLDivElement|null} */ (
        document.querySelector(`.iframe-wrapper[style*="order: ${targetOrder}"]`)
      );

      if (targetWrapper) {
        const targetIframe = targetWrapper.querySelector('iframe');
        if (targetIframe) {
          targetIframe.src = url;
        }
      }
    } else if (message.action === 'sb:key') {
      // Handle forwarded key events from iframes
      const code = message.code;
      if (!message.altKey) return;
      const validCodes = ['KeyA', 'KeyD', 'KeyE', 'KeyX', 'KeyF'];
      if (!validCodes.includes(code)) return;

      // Resolve the iframe from sender.frameId or message.frameName
      let srcIframe = null;
      if (typeof sender.frameId === 'number') {
        srcIframe = document.querySelector(
          `iframe[data-frame-id="${sender.frameId}"]`,
        );
      }
      if (!srcIframe && typeof message.frameName === 'string') {
        srcIframe = document.querySelector(
          `iframe[name="${message.frameName}"]`,
        );
      }
      const iframe = /** @type {HTMLIFrameElement|null} */ (srcIframe);
      if (!iframe) return;

      // Mark it active for consistency
      if (appState.setActiveIframe) appState.setActiveIframe(iframe);

      // Map Alt keys to actions
      if (code === 'KeyA') handleShortcutForIframe(iframe, 'move-left');
      else if (code === 'KeyD') handleShortcutForIframe(iframe, 'move-right');
      else if (code === 'KeyE') handleShortcutForIframe(iframe, 'detach-iframe');
      else if (code === 'KeyX') handleShortcutForIframe(iframe, 'remove-iframe');
      else if (code === 'KeyF')
        handleShortcutForIframe(iframe, 'toggle-full-page');
    } else if (message.action === 'sb:nav') {
      const { frameName, url } = message;
      if (!url || !frameName) return;

      // Find the iframe to update using its unique name
      const iframe = /** @type {HTMLIFrameElement|null} */ (
        document.querySelector(`iframe[name="${frameName}"]`)
      );

      if (iframe) {
        // Update the data attribute, which is the source of truth for the URL state
        iframe.setAttribute('data-sb-current-url', url);
        // Refresh the visible URL display for the user
        updateUrlDisplay(iframe);
        // Update the main browser URL to persist the new state
        updateUrlWithState();
      }
    } else if (message.action === 'get-current-urls') {
      const wrappers = /** @type {HTMLDivElement[]} */ (
        Array.from(document.querySelectorAll('.iframe-wrapper'))
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

      const currentUrls = wrappersSorted.map((wrapper) => {
        const iframe = /** @type {HTMLIFrameElement | null} */ (
          wrapper.querySelector('iframe')
        );
        if (!iframe) return '';
        const liveSrc = iframe.getAttribute('data-sb-current-url');
        const originalSrc = iframe.getAttribute('src');
        return (liveSrc && liveSrc.trim()) || originalSrc || iframe.src || '';
      });

      sendResponse({ urls: currentUrls });
      isAsync = true;
    }

    return isAsync;
  });

  const iframeContainer = /** @type {HTMLDivElement} */ (
    document.getElementById('iframe-container')
  );
  appState.setContainer(iframeContainer);

  // Handle tab visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Tab is inactive
      updateDocumentTitleFromIframes();
      resetFaviconToDefault();
    } else {
      // Tab is active
      const activeIframe = appState.getActiveIframe();
      if (activeIframe) {
        updateDocumentTitleAndFaviconFromIframe(activeIframe);
      } else {
        resetDocumentTitleAndFavicon();
      }
    }
  });

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
    createUrlDisplay(iframeWrapper, iframe);

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

  /**
   * Execute shortcut action for a specific iframe
   * @param {HTMLIFrameElement} iframe
   * @param {'move-left'|'move-right'|'detach-iframe'|'remove-iframe'|'toggle-full-page'} action
   * @returns
   */
  const handleShortcutForIframe = (iframe, action) => {
    if (!iframe) return;
    const wrapper = /** @type {HTMLDivElement|null} */ (
      iframe.closest('.iframe-wrapper')
    );
    if (!wrapper) return;

    // In full-page mode, ignore move-left/move-right actions
    if (
      isFullPage(wrapper) &&
      (action === 'move-left' || action === 'move-right')
    ) {
      return;
    }

    const iframeContainer = appState.getContainer();
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
    const index = wrappersSorted.indexOf(wrapper);
    if (index < 0) return;

    if (action === 'move-left') {
      moveIframe(index, -1);
      return;
    }
    if (action === 'move-right') {
      moveIframe(index, 1);
      return;
    }
    if (action === 'detach-iframe') {
      const wrapper = /** @type {HTMLDivElement|null} */ (
        iframe.closest('.iframe-wrapper')
      );
      if (wrapper) {
        const fullBtn = /** @type {HTMLButtonElement|null} */ (
          wrapper.querySelector('.iframe-menu [data-role="full-page"]')
        );
        if (fullBtn && isFullPage(wrapper)) fullBtn.click();
      }
      const liveSrc = iframe.getAttribute('data-sb-current-url');
      const originalSrc = iframe.getAttribute('src');
      const url =
        (liveSrc && liveSrc.trim()) || originalSrc || iframe.src || '';
      if (url) {
        try {
          chrome.tabs.create({ url, active: true });
        } catch (_e) {}
        removeIframe(index);
      }
      return;
    }
    if (action === 'remove-iframe') {
      const wrapper = /** @type {HTMLDivElement|null} */ (
        iframe.closest('.iframe-wrapper')
      );
      if (wrapper) {
        const fullBtn = /** @type {HTMLButtonElement|null} */ (
          wrapper.querySelector('.iframe-menu [data-role="full-page"]')
        );
        if (fullBtn && isFullPage(wrapper)) fullBtn.click();
      }
      removeIframe(index);
      return;
    }
    if (action === 'toggle-full-page') {
      const fullBtn = /** @type {HTMLButtonElement|null} */ (
        wrapper.querySelector('.iframe-menu [data-role="full-page"]')
      );
      if (fullBtn && typeof fullBtn.click === 'function') {
        fullBtn.click();
      } else {
        if (isFullPage(wrapper)) {
          collapseIframe(wrapper);
        } else {
          expandIframe(wrapper);
        }
      }
      return;
    }
  };

  // Keyboard shortcuts acting on the active iframe
  document.addEventListener('keydown', async (e) => {
    try {
      if (!e.altKey) return;
      const target = /** @type {HTMLElement} */ (e.target);
      const tag = (target && target.tagName) || '';
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        (target && target.isContentEditable)
      ) {
        return;
      }

      const active = appState.getActiveIframe && appState.getActiveIframe();
      if (!active) return;

      // Use `e.code` to check for physical keys, avoiding issues with macOS
      // and special characters when Alt is pressed.
      const validCodes = ['KeyA', 'KeyD', 'KeyE', 'KeyX', 'KeyF'];
      if (!validCodes.includes(e.code)) return;

      // If in full-page mode, do nothing for A/D (move) and don't intercept
      const wrapper = /** @type {HTMLDivElement|null} */ (
        active.closest('.iframe-wrapper')
      );
      if (wrapper && isFullPage(wrapper) && (e.code === 'KeyA' || e.code === 'KeyD')) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'KeyA') handleShortcutForIframe(active, 'move-left');
      else if (e.code === 'KeyD') handleShortcutForIframe(active, 'move-right');
      else if (e.code === 'KeyE') handleShortcutForIframe(active, 'detach-iframe');
      else if (e.code === 'KeyX') handleShortcutForIframe(active, 'remove-iframe');
      else if (e.code === 'KeyF')
        handleShortcutForIframe(active, 'toggle-full-page');
    } catch (_e) {
      // no-op
    }
  });
});
