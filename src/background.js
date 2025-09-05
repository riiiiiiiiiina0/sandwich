/**
 * Controller state associated with a newly created blank tab.
 * Keys are controller blank tab ids; values store popup windows and parent window.
 * @type {Map<number, { parentWindowId: number, popupWindowIds: number[], addressBarHeight: number, controllerTabIndex: number, controllerTabGroupId: number }>}
 */
const controllerByTabId = new Map();

/**
 * Reverse lookup from popup window id to controller tab id.
 * @type {Map<number, number>}
 */
const popupWindowIdToControllerTabId = new Map();

/**
 * Hide all popup windows for a given controller tab id (minimize them).
 * @param {number} controllerTabId
 */
const hideControllerPopups = async (controllerTabId) => {
  const controller = controllerByTabId.get(controllerTabId);
  if (!controller) return;

  // UPDATE: do nothing, just let the main window cover on top of the popups
  // for (const winId of controller.popupWindowIds) {
  //   try {
  //     await chrome.windows.update(winId, { state: 'minimized' });
  //   } catch (_e) {
  //     // window may already be closed/minimized
  //   }
  // }
};

/**
 * Compute and apply tiling for popup windows alongside their parent window bounds.
 * This also restores them to normal (visible) state.
 * @param {number} controllerTabId
 */
const tileControllerPopups = async (controllerTabId) => {
  const controller = controllerByTabId.get(controllerTabId);
  if (!controller) return;
  try {
    // Keep controller info up to date with any tab moves/group changes
    await refreshControllerFromTab(controllerTabId);

    const parentWindow = await chrome.windows.get(controller.parentWindowId);
    const windowWidth = parentWindow.width || 0;
    const windowHeight = parentWindow.height || 0;
    const windowTop = parentWindow.top || 0;
    const windowLeft = parentWindow.left || 0;

    const count = Math.max(1, controller.popupWindowIds.length);
    const popupWidth = Math.floor(windowWidth / count);
    const addressBarHeight = controller.addressBarHeight;

    await Promise.all(
      controller.popupWindowIds.map(async (winId, i) => {
        try {
          await chrome.windows.update(winId, {
            state: 'normal',
            focused: true,
            left: windowLeft + i * popupWidth,
            top: windowTop + addressBarHeight,
            width: popupWidth,
            height: Math.max(100, windowHeight - addressBarHeight),
          });
        } catch (_e) {
          // ignore if window was removed or cannot be updated
        }
      }),
    );
  } catch (_e) {
    // parent window may be gone
  }
};

/**
 * Ensure only the active controller's popups are visible; others are hidden.
 * @param {number} activeControllerTabId
 */
const showOnlyActiveController = async (activeControllerTabId) => {
  const allControllers = [...controllerByTabId.keys()];
  await Promise.all(
    allControllers.map(async (tabId) => {
      if (tabId === activeControllerTabId) {
        await tileControllerPopups(tabId);
      } else {
        await hideControllerPopups(tabId);
      }
    }),
  );
};

/**
 * Clean up controller state and reverse indices.
 * @param {number} controllerTabId
 */
const cleanupController = (controllerTabId) => {
  const controller = controllerByTabId.get(controllerTabId);
  if (!controller) return;
  for (const winId of controller.popupWindowIds) {
    popupWindowIdToControllerTabId.delete(winId);
  }
  controllerByTabId.delete(controllerTabId);
};

/**
 * Refresh stored controller info (index, groupId, window) from the actual tab.
 * @param {number} controllerTabId
 */
const refreshControllerFromTab = async (controllerTabId) => {
  const controller = controllerByTabId.get(controllerTabId);
  if (!controller) return;
  try {
    const tab = await chrome.tabs.get(controllerTabId);
    if (!tab) return;
    if (typeof tab.index === 'number')
      controller.controllerTabIndex = tab.index;
    if (typeof tab.groupId === 'number')
      controller.controllerTabGroupId = tab.groupId;
    if (typeof tab.windowId === 'number')
      controller.parentWindowId = tab.windowId;
  } catch (_e) {
    // ignore
  }
};

// Update action title to indicate what clicking will do in current context
const updateActionTitle = async () => {
  try {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!activeTab || typeof activeTab.id !== 'number') return;

    let title = 'Sandwich Bear';

    // If current tab is a controller, clicking does nothing
    if (controllerByTabId.has(activeTab.id)) {
      await chrome.action.setTitle({
        title: 'Popup windows linked to this tab; click does nothing',
        tabId: activeTab.id,
      });
      return;
    }

    // Not on split page: show Open {N (2<=N<=4)} tabs in split view
    const windowId = activeTab.windowId;
    const highlightedTabs = await chrome.tabs.query({
      highlighted: true,
      windowId,
    });
    if (highlightedTabs.length <= 1) {
      title = 'Highlight multiple tabs to open in popup windows';
    } else {
      const n = Math.max(2, Math.min(4, highlightedTabs.length));
      title = `Open ${n} tabs in popup windows`;
    }

    await chrome.action.setTitle({ title, tabId: activeTab.id });
  } catch (_e) {
    // no-op
  }
};

// Keep title updated on common events
chrome.tabs.onActivated.addListener(() => {
  updateActionTitle();
});
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, _tab) => {
  if (changeInfo.status === 'complete' || 'url' in changeInfo) {
    updateActionTitle();
  }
});
// Keep controller index/group up to date on tab updated (covers group changes)
chrome.tabs.onUpdated.addListener((tabId, _changeInfo, _tab) => {
  if (controllerByTabId.has(tabId)) {
    refreshControllerFromTab(tabId);
  }
});

// Keep controller index up to date on move/attach
chrome.tabs.onMoved.addListener((tabId, _moveInfo) => {
  if (controllerByTabId.has(tabId)) {
    refreshControllerFromTab(tabId);
  }
});
chrome.tabs.onAttached.addListener((tabId, _attachInfo) => {
  if (controllerByTabId.has(tabId)) {
    refreshControllerFromTab(tabId);
  }
});
chrome.tabs.onDetached.addListener((tabId, _detachInfo) => {
  if (controllerByTabId.has(tabId)) {
    refreshControllerFromTab(tabId);
  }
});
chrome.tabs.onHighlighted.addListener(() => {
  updateActionTitle();
});
chrome.windows.onFocusChanged.addListener(() => {
  updateActionTitle();
});

// Initialize title on install/startup
chrome.runtime.onInstalled.addListener(() => {
  updateActionTitle();
});
chrome.runtime.onStartup.addListener(() => {
  updateActionTitle();
});

// Handle action button click: open up to the first 4 highlighted tabs in popup windows
chrome.action.onClicked.addListener(async (currentTab) => {
  try {
    // If clicking while on a controller tab, do nothing
    if (
      typeof currentTab.id === 'number' &&
      controllerByTabId.has(currentTab.id)
    ) {
      return;
    }

    // Get highlighted tabs in the current window
    const highlightedTabs = await chrome.tabs.query({
      highlighted: true,
      currentWindow: true,
    });

    // Sort by tab index (left-to-right), take first 4
    const targetTabs = highlightedTabs
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .slice(0, 4);

    if (targetTabs.length < 2) {
      console.log(
        'Highlighted tabs did not include at least two pages; doing nothing.',
      );
      return;
    }

    const firstTab = targetTabs[0];

    // Create a new empty tab before the first target tab
    const blankTab = await chrome.tabs.create({
      url: 'about:blank',
      windowId: currentTab.windowId,
      index: firstTab.index,
    });

    // Get window details for positioning popups
    const window = await chrome.windows.get(currentTab.windowId);
    const windowWidth = window.width || 0;
    const windowHeight = window.height || 0;
    const windowTop = window.top || 0;
    const windowLeft = window.left || 0;

    const popupWidth = Math.floor(windowWidth / targetTabs.length);

    const addressBarHeight = 40;

    // Create a popup window for each tab
    /** @type {number[]} */
    const popupWindowIds = [];
    for (let i = 0; i < targetTabs.length; i++) {
      const tab = targetTabs[i];
      const popup = await chrome.windows.create({
        url: tab.url,
        type: 'popup',
        left: windowLeft + i * popupWidth,
        top: windowTop + addressBarHeight,
        width: popupWidth,
        height: windowHeight - addressBarHeight,
      });
      if (popup?.id != null) {
        popupWindowIds.push(popup.id);
      }
    }

    // Track association between the blank tab and its popup windows
    if (typeof blankTab.id === 'number') {
      controllerByTabId.set(blankTab.id, {
        parentWindowId: currentTab.windowId,
        popupWindowIds,
        addressBarHeight,
        controllerTabIndex:
          typeof blankTab.index === 'number' ? blankTab.index : 0,
        controllerTabGroupId:
          typeof blankTab.groupId === 'number' ? blankTab.groupId : -1,
      });
      for (const winId of popupWindowIds) {
        popupWindowIdToControllerTabId.set(winId, blankTab.id);
      }
      // Activate the controller tab and ensure its popups are shown/positioned
      try {
        await chrome.tabs.update(blankTab.id, { active: true });
        await showOnlyActiveController(blankTab.id);
      } catch (_e) {
        // ignore
      }
    }

    // Close the used highlighted tabs
    try {
      const tabIdsToClose = targetTabs
        .map((t) => t.id)
        .filter((id) => typeof id === 'number');
      if (tabIdsToClose.length > 0) {
        await chrome.tabs.remove(/** @type {number[]} */ (tabIdsToClose));
      }
    } catch (closeErr) {
      console.error('Failed to close used highlighted tabs:', closeErr);
    }
  } catch (error) {
    console.error('Failed to open popup windows from highlighted tabs:', error);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openAnchorLink') {
    // The tabs permission is required for chrome.tabs.create
    chrome.tabs.create({ url: message.url });
  }
});

// Hide/show popups when the active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tabId = activeInfo.tabId;
    if (controllerByTabId.has(tabId)) {
      await refreshControllerFromTab(tabId);
      await showOnlyActiveController(tabId);
    } else {
      // If leaving any controller's tab, hide all controllers in this window
      await Promise.all(
        [...controllerByTabId.entries()].map(async ([controllerTabId, ctl]) => {
          if (ctl.parentWindowId === activeInfo.windowId) {
            await hideControllerPopups(controllerTabId);
          }
        }),
      );
    }
    updateActionTitle();
  } catch (_e) {
    // ignore
  }
});

// When the focused window changes, update visibility accordingly
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  try {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      // Hide all if focus lost
      await Promise.all(
        [...controllerByTabId.keys()].map((id) => hideControllerPopups(id)),
      );
      return;
    }
    const [activeTab] = await chrome.tabs.query({ active: true, windowId });
    if (activeTab?.id != null && controllerByTabId.has(activeTab.id)) {
      await refreshControllerFromTab(activeTab.id);
      await showOnlyActiveController(activeTab.id);
    } else {
      // Hide controllers whose parent is this window
      await Promise.all(
        [...controllerByTabId.entries()].map(async ([controllerTabId, ctl]) => {
          if (ctl.parentWindowId === windowId) {
            await hideControllerPopups(controllerTabId);
          }
        }),
      );
    }
  } catch (_e) {
    // ignore
  }
});

// When the parent window moves or resizes, retile its popups
chrome.windows.onBoundsChanged.addListener(async (winOrId) => {
  try {
    const windowId = typeof winOrId === 'number' ? winOrId : winOrId.id;
    const affectedControllers = [...controllerByTabId.entries()].filter(
      ([, ctl]) => ctl.parentWindowId === windowId,
    );
    await Promise.all(
      affectedControllers.map(([tabId]) => tileControllerPopups(tabId)),
    );
  } catch (_e) {
    // ignore
  }
});

// When the controller (blank) tab is closed, restore popups to tabs and cleanup
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  if (!controllerByTabId.has(tabId)) return;
  const controller = controllerByTabId.get(tabId);
  if (!controller) return;
  try {
    // Sync latest position/group before restoring
    await refreshControllerFromTab(tabId);

    // Collect URLs from each popup window (active tab preferred)
    const urls = [];
    for (const winId of controller.popupWindowIds) {
      try {
        const popupWin = await chrome.windows.get(winId, { populate: true });
        const activeTab =
          popupWin.tabs?.find((t) => t.active) || popupWin.tabs?.[0];
        if (activeTab?.url) urls.push(activeTab.url);
      } catch (_e) {
        // window may be gone; skip
      }
    }

    // Insert restored tabs at the latest controller tab index
    let idx = controller.controllerTabIndex || 0;
    for (const url of urls) {
      try {
        await chrome.tabs.create({
          windowId: controller.parentWindowId,
          index: idx,
          url,
        });
        idx += 1;
      } catch (_e) {
        // ignore failures per tab
      }
    }

    // If the controller was in a tab group, regroup the newly created tabs
    if (
      typeof controller.controllerTabGroupId === 'number' &&
      controller.controllerTabGroupId >= 0
    ) {
      try {
        // Gather the most recently created tabs starting from starting index
        const tabs = await chrome.tabs.query({
          windowId: controller.parentWindowId,
        });
        const toGroup = tabs
          .filter(
            (t) =>
              typeof t.index === 'number' &&
              t.index >= (controller.controllerTabIndex || 0) &&
              t.index < (controller.controllerTabIndex || 0) + urls.length,
          )
          .map((t) => /** @type {number} */ (t.id))
          .filter((id) => typeof id === 'number');
        if (toGroup.length > 0) {
          if (toGroup.length === 1) {
            await chrome.tabs.group({
              tabIds: toGroup[0],
              groupId: controller.controllerTabGroupId,
            });
          } else {
            await chrome.tabs.group({
              tabIds: /** @type {[number, ...number[]]} */ (toGroup),
              groupId: controller.controllerTabGroupId,
            });
          }
        }
      } catch (_e) {
        // grouping might fail if group deleted; ignore
      }
    }

    // Close popup windows
    await Promise.all(
      controller.popupWindowIds.map(async (winId) => {
        try {
          await chrome.windows.remove(winId);
        } catch (_e) {
          // ignore
        }
      }),
    );
  } catch (_e) {
    // ignore
  } finally {
    cleanupController(tabId);
  }
});

// Cleanup reverse mapping if a popup window is closed manually
chrome.windows.onRemoved.addListener((windowId) => {
  const controllerTabId = popupWindowIdToControllerTabId.get(windowId);
  if (controllerTabId == null) return;
  popupWindowIdToControllerTabId.delete(windowId);
  const controller = controllerByTabId.get(controllerTabId);
  if (!controller) return;
  controller.popupWindowIds = controller.popupWindowIds.filter(
    (id) => id !== windowId,
  );
  // If all popups are gone, we can optionally close the controller tab to avoid orphaning
  if (controller.popupWindowIds.length === 0) {
    chrome.tabs.remove(controllerTabId).catch(() => {});
    cleanupController(controllerTabId);
  }
});
