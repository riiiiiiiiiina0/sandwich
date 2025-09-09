import { appState } from './state.js';
import { addDividerDragFunctionality } from './drag.js';
import { rebuildInterface } from './rebuild.js';
import { applyWrapperPrimarySize, recalcAllWrapperSizes } from './size.js';
import {
  attachIframeTitleListener,
  updateDocumentTitleFromIframes,
} from './title.js';
import { setLayoutToGrid } from './layout.js';
import { updateUrlWithState } from './url.js';

/**
 * Attach a hover-visible plus button to a divider that opens a tab picker.
 * @param {HTMLDivElement} divider
 */
export const attachDividerPlus = (divider) => {
  const plusBtn = document.createElement('button');
  plusBtn.className =
    'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-base-200 hover:bg-blue-300 text-base-content shadow flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-auto z-20';
  plusBtn.title = 'Insert tab here';
  plusBtn.textContent = '➕';
  plusBtn.dataset.sbPlus = 'true';

  // Prevent divider drag when interacting with the button
  ['mousedown', 'mousemove'].forEach((evt) =>
    plusBtn.addEventListener(evt, (e) => e.stopPropagation()),
  );

  plusBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openTabPicker(divider, { x: e.clientX, y: e.clientY }, undefined);
  });

  divider.appendChild(plusBtn);
  updateDividerPlusVisibility();
};

/**
 * Open a floating picker of http(s) tabs grouped by window near the click.
 * @param {HTMLDivElement|null} context
 * @param {{x:number,y:number}} anchor
 * @param {(url:string)=>HTMLIFrameElement|null|undefined} [onSelect]
 */
const openTabPicker = async (context, anchor, onSelect) => {
  closeExistingPicker();

  const overlay = document.createElement('div');
  overlay.className =
    'fixed inset-0 z-30 flex items-start justify-start bg-transparent';
  overlay.dataset.sbPicker = 'true';

  const panel = document.createElement('div');
  panel.className =
    'absolute max-h-[60vh] w-[420px] overflow-auto bg-white border border-gray-300 rounded-lg shadow-xl p-2 space-y-2';
  panel.style.left = `${Math.max(
    8,
    Math.min(window.innerWidth - 428, anchor.x - 210),
  )}px`;
  panel.style.top = `${Math.max(
    8,
    Math.min(window.innerHeight - 8, anchor.y + 12),
  )}px`;

  const header = document.createElement('div');
  header.className = 'text-sm font-medium text-gray-600 px-1';
  header.textContent = 'Select a tab to insert';
  panel.appendChild(header);

  const listContainer = document.createElement('div');
  listContainer.className = 'flex flex-col gap-2';
  panel.appendChild(listContainer);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const dismiss = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') dismiss();
  };
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) dismiss();
  });
  document.addEventListener('keydown', onKey);

  // Load tabs
  try {
    /** @type {chrome.tabs.Tab[]} */
    const allTabs = await chrome.tabs.query({});
    const httpTabs = allTabs.filter(
      (t) =>
        typeof t.url === 'string' &&
        (t.url.startsWith('http://') || t.url.startsWith('https://')),
    );

    // Group by windowId without showing any window id/title
    /** @type {Record<number, chrome.tabs.Tab[]>} */
    const byWindow = {};
    for (const tab of httpTabs) {
      const wid = tab.windowId ?? -1;
      if (!byWindow[wid]) byWindow[wid] = [];
      byWindow[wid].push(tab);
    }

    const windowIds = Object.keys(byWindow)
      .map((x) => Number.parseInt(x, 10))
      .sort((a, b) => a - b);

    for (let i = 0; i < windowIds.length; i++) {
      const tabs = byWindow[windowIds[i]].sort(
        (a, b) => (a.index ?? 0) - (b.index ?? 0),
      );

      if (i > 0) {
        const sep = document.createElement('div');
        sep.className = 'border-t border-gray-200 my-1';
        listContainer.appendChild(sep);
      }

      const ul = document.createElement('ul');
      ul.className = 'menu bg-white w-full rounded-box';
      for (const tab of tabs) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = 'flex items-center gap-2 py-1';
        a.href = '#';

        const icon = document.createElement('img');
        icon.className = 'w-4 h-4 rounded';
        if (tab.favIconUrl) icon.src = tab.favIconUrl;
        else icon.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
        a.appendChild(icon);

        const title = document.createElement('div');
        title.className = 'truncate text-sm';
        title.textContent = tab.title || tab.url || 'Untitled';
        a.appendChild(title);

        a.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const url = String(tab.url || '');
          if (url) {
            /** @type {HTMLIFrameElement|null|undefined} */
            let createdIframe;
            if (typeof onSelect === 'function') {
              createdIframe = onSelect(url);
            } else {
              createdIframe = insertAtDivider(
                /** @type {HTMLDivElement} */ (context),
                url,
              );
            }
            if (typeof tab.id === 'number') {
              const maybeClose = () => {
                try {
                  chrome.tabs.remove(tab.id || -1);
                } catch (_e) {
                  // no-op
                }
              };
              if (createdIframe && createdIframe.addEventListener) {
                createdIframe.addEventListener('load', maybeClose, {
                  once: true,
                });
              } else {
                // Fallback: close immediately after initiating insertion
                maybeClose();
              }
            }
          }
          dismiss();
        });

        li.appendChild(a);
        ul.appendChild(li);
      }
      listContainer.appendChild(ul);
    }
  } catch (err) {
    const errorMsg = document.createElement('div');
    errorMsg.className = 'text-sm text-error px-1';
    errorMsg.textContent = 'Failed to load tabs.';
    listContainer.appendChild(errorMsg);
    // eslint-disable-next-line no-console
    console.error('Failed to query tabs for picker', err);
  }
};

const closeExistingPicker = () => {
  const existing = document.querySelector('[data-sb-picker="true"]');
  if (existing) existing.remove();
};

/**
 * Insert a new iframe at the divider position and rebalance sizes.
 * @param {HTMLDivElement} divider
 * @param {string} url
 * @returns {HTMLIFrameElement}
 */
export const insertAtDivider = (divider, url) => {
  const iframeContainer = appState.getContainer();
  const isVerticalLayout = appState.getIsVerticalLayout();

  // Compute current sorted wrappers and divider order
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

  const dividerOrder = Number.parseInt(
    /** @type {HTMLElement} */ (divider).style.order || '1',
    10,
  );
  const leftIndex = Math.max(0, Math.floor((dividerOrder - 1) / 2));
  const rightIndex = Math.min(wrappersSorted.length - 1, leftIndex + 1);

  // Create new wrapper + iframe
  const newWrapper = document.createElement('div');
  newWrapper.className =
    'iframe-wrapper group relative flex-shrink-0 flex-grow-0';
  /** @type {HTMLElement} */ (newWrapper).style.order = String(
    dividerOrder + 1,
  );

  const iframe = /** @type {HTMLIFrameElement} */ (
    document.createElement('iframe')
  );
  iframe.src = url;
  iframe.name = `sb-iframe-${Date.now()}`;
  iframe.setAttribute(
    'sandbox',
    'allow-same-origin allow-scripts allow-forms allow-popups allow-downloads',
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
  newWrapper.appendChild(iframe);
  attachIframeTitleListener(iframe);

  // Insert in DOM immediately after the clicked divider, preserving DOM adjacency
  divider.insertAdjacentElement('afterend', newWrapper);

  const newDivider = document.createElement('div');
  newDivider.className = 'iframe-divider group relative';
  if (isVerticalLayout) {
    newDivider.className +=
      ' m-0 p-0 h-1 w-full cursor-row-resize min-h-1 relative flex-shrink-0 flex-grow-0';
    /** @type {HTMLElement} */ (newDivider).style.height = '4px';
    /** @type {HTMLElement} */ (newDivider).style.width = '';
  } else {
    newDivider.className +=
      ' m-0 p-0 w-1 h-full cursor-col-resize min-w-1 relative flex-shrink-0 flex-grow-0';
    /** @type {HTMLElement} */ (newDivider).style.width = '4px';
    /** @type {HTMLElement} */ (newDivider).style.height = '';
  }
  /** @type {HTMLElement} */ (newDivider).style.order = String(
    dividerOrder + 2,
  );
  newWrapper.insertAdjacentElement('afterend', newDivider);
  addDividerDragFunctionality(newDivider);
  attachDividerPlus(newDivider);

  // Rebalance sizes or switch to grid if reaching 4 wrappers
  const allWrappers = /** @type {NodeListOf<HTMLDivElement>} */ (
    iframeContainer.querySelectorAll('.iframe-wrapper')
  );
  if (allWrappers.length === 4) {
    setLayoutToGrid();
    updateDividerPlusVisibility();
    updateDocumentTitleFromIframes();
    updateUrlWithState();
    return iframe;
  } else {
    const newRatio = 100 / allWrappers.length;
    allWrappers.forEach((w) => {
      /** @type {HTMLElement} */ (w).dataset.ratio = String(newRatio);
      applyWrapperPrimarySize(w, newRatio, isVerticalLayout, iframeContainer);
    });

    // Recreate menus and normalize order/url
    rebuildInterface();
    updateDividerPlusVisibility();
    // Ensure final calc sizes consider the new divider count
    recalcAllWrapperSizes(iframeContainer, isVerticalLayout);
    updateDocumentTitleFromIframes();
    return iframe;
  }
};

/**
 * Insert at the head or tail of wrappers.
 * @param {'head'|'tail'} position
 * @param {string} url
 * @returns {HTMLIFrameElement}
 */
export const insertAtEdge = (position, url) => {
  const iframeContainer = appState.getContainer();
  const isVerticalLayout = appState.getIsVerticalLayout();

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

  const newWrapper = document.createElement('div');
  newWrapper.className =
    'iframe-wrapper group relative flex-shrink-0 flex-grow-0';

  const iframe = /** @type {HTMLIFrameElement} */ (
    document.createElement('iframe')
  );
  iframe.src = url;
  iframe.name = `sb-iframe-${Date.now()}`;
  iframe.setAttribute(
    'sandbox',
    'allow-same-origin allow-scripts allow-forms allow-popups allow-downloads',
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
  newWrapper.appendChild(iframe);
  attachIframeTitleListener(iframe);

  if (wrappersSorted.length === 0) {
    iframeContainer.appendChild(newWrapper);
  } else if (position === 'head') {
    const first = wrappersSorted[0];
    iframeContainer.insertBefore(newWrapper, first);
    const divider = document.createElement('div');
    divider.className = 'iframe-divider group relative';
    if (isVerticalLayout) {
      divider.className +=
        ' m-0 p-0 h-1 w-full cursor-row-resize min-h-1 relative flex-shrink-0 flex-grow-0';
      /** @type {HTMLElement} */ (divider).style.height = '4px';
      /** @type {HTMLElement} */ (divider).style.width = '';
    } else {
      divider.className +=
        ' m-0 p-0 w-1 h-full cursor-col-resize min-w-1 relative flex-shrink-0 flex-grow-0';
      /** @type {HTMLElement} */ (divider).style.width = '4px';
      /** @type {HTMLElement} */ (divider).style.height = '';
    }
    newWrapper.insertAdjacentElement('afterend', divider);
    addDividerDragFunctionality(divider);
    attachDividerPlus(divider);
  } else {
    const last = wrappersSorted[wrappersSorted.length - 1];
    const divider = document.createElement('div');
    divider.className = 'iframe-divider group relative';
    if (isVerticalLayout) {
      divider.className +=
        ' m-0 p-0 h-1 w-full cursor-row-resize min-h-1 relative flex-shrink-0 flex-grow-0';
      /** @type {HTMLElement} */ (divider).style.height = '4px';
      /** @type {HTMLElement} */ (divider).style.width = '';
    } else {
      divider.className +=
        ' m-0 p-0 w-1 h-full cursor-col-resize min-w-1 relative flex-shrink-0 flex-grow-0';
      /** @type {HTMLElement} */ (divider).style.width = '4px';
      /** @type {HTMLElement} */ (divider).style.height = '';
    }
    last.insertAdjacentElement('afterend', divider);
    addDividerDragFunctionality(divider);
    attachDividerPlus(divider);
    divider.insertAdjacentElement('afterend', newWrapper);
  }

  // Rebalance sizes or switch to grid if reaching 4 wrappers
  const allWrappers = /** @type {NodeListOf<HTMLDivElement>} */ (
    iframeContainer.querySelectorAll('.iframe-wrapper')
  );
  if (allWrappers.length === 4) {
    setLayoutToGrid();
    updateDividerPlusVisibility();
    updateDocumentTitleFromIframes();
    updateUrlWithState();
    return iframe;
  } else {
    const newRatio = 100 / allWrappers.length;
    allWrappers.forEach((w) => {
      /** @type {HTMLElement} */ (w).dataset.ratio = String(newRatio);
      applyWrapperPrimarySize(w, newRatio, isVerticalLayout, iframeContainer);
    });

    rebuildInterface();
    updateDividerPlusVisibility();
    recalcAllWrapperSizes(iframeContainer, isVerticalLayout);
    updateDocumentTitleFromIframes();
    return iframe;
  }
};

/**
 * Attach left/right edge plus buttons for inserting at head/tail.
 */
export const attachEdgePlusButtons = () => {
  if (document.querySelector('[data-sb-edge-container="left"]')) return;

  const makeContainer = (side) => {
    const container = document.createElement('div');
    container.dataset.sbEdgeContainer = side;
    container.className =
      'fixed inset-y-0 ' +
      (side === 'left' ? 'left-0 ' : 'right-0 ') +
      'w-6 z-30 group';
    container.style.pointerEvents = 'auto';
    container.style.background = 'transparent';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.sbEdge = side;
    btn.className =
      'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-base-200 hover:bg-blue-300 text-base-content shadow flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-all duration-150';
    btn.textContent = '➕';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTabPicker(null, { x: e.clientX, y: e.clientY }, (url) =>
        insertAtEdge(side === 'left' ? 'head' : 'tail', url),
      );
    });

    container.appendChild(btn);
    return container;
  };

  const leftContainer = makeContainer('left');
  const rightContainer = makeContainer('right');

  document.body.appendChild(leftContainer);
  document.body.appendChild(rightContainer);
  updateDividerPlusVisibility();
};
/**
 * Hide or show plus buttons depending on iframe count (hide when >= 4).
 */
export const updateDividerPlusVisibility = () => {
  try {
    const wrappers = document.querySelectorAll('.iframe-wrapper');
    const hide = wrappers.length >= 4;
    // Divider plus buttons
    const dividers = /** @type {NodeListOf<HTMLDivElement>} */ (
      document.querySelectorAll('.iframe-divider')
    );
    dividers.forEach((divider) => {
      const btn = /** @type {HTMLButtonElement|null} */ (
        divider.querySelector('button[data-sb-plus="true"]')
      );
      if (btn) {
        btn.style.display = hide ? 'none' : '';
      }
    });
    // Edge plus containers
    const leftEdgeContainer = /** @type {HTMLElement|null} */ (
      document.querySelector('[data-sb-edge-container="left"]')
    );
    const rightEdgeContainer = /** @type {HTMLElement|null} */ (
      document.querySelector('[data-sb-edge-container="right"]')
    );
    if (leftEdgeContainer) leftEdgeContainer.style.display = hide ? 'none' : '';
    if (rightEdgeContainer)
      rightEdgeContainer.style.display = hide ? 'none' : '';
  } catch (_e) {
    // no-op
  }
};
