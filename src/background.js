// Background script to remove headers that prevent iframe loading

const injectWindowSpoofing = async (tabId, frameId) => {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, frameIds: [frameId] },
      world: 'MAIN',
      injectImmediately: true,
      // @ts-ignore - 'args' is supported in MV3 executeScript; types may be outdated
      args: [chrome.runtime.id],
      func: (extensionId) => {
        try {
          if (!window['__SANDWICH_BEAR_EXTENSION_ID']) {
            Object.defineProperty(window, '__SANDWICH_BEAR_EXTENSION_ID', {
              value: String(extensionId),
              configurable: false,
              enumerable: false,
              writable: false,
            });
          }

          const originalStop = window.stop;
          const originalWrite = document.write;
          window.stop = () => {};
          document.write = (content) => {
            if (content === '') return;
            originalWrite(content);
          };
        } catch (e) {
          console.log('🐻‍❄️ Failed to inject window spoofing:', e);
        }
      },
    });
  } catch (e) {
    // Best-effort; ignore failures (e.g., chrome:// pages)
  }
};

const CONTEXT_MENU_ID_SPLIT = 'open-in-split-view';
const CONTEXT_MENU_ID_RIGHT = 'open-on-the-right';
const CONTEXT_MENU_ID_REPLACE = 'replace-on-the-right';

chrome.runtime.onInstalled.addListener(() => {
  // Remove existing rules and add new ones
  chrome.declarativeNetRequest
    .updateDynamicRules({
      removeRuleIds: [1],
      addRules: [
        {
          id: 1,
          condition: {
            urlFilter: '*',
            resourceTypes: [
              'sub_frame',
              'xmlhttprequest',
              'websocket',
              'main_frame',
              'other',
            ],
          },
          action: {
            type: 'modifyHeaders',
            responseHeaders: [
              {
                header: 'X-Frame-Options',
                operation: 'remove',
              },
              {
                header: 'Frame-Options',
                operation: 'remove',
              },
              {
                header: 'Content-Security-Policy',
                operation: 'remove',
              },
              {
                header: 'Content-Security-Policy-Report-Only',
                operation: 'remove',
              },
            ],
          },
        },
      ],
    })
    .then(() => {
      console.log(
        'Frame-blocking headers removal rules installed successfully',
      );
    })
    .catch((error) => {
      console.error('Failed to install header removal rules:', error);
    });

  // Create context menus
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID_SPLIT,
    title: 'Open link in split view',
    contexts: ['link'],
  });

  chrome.runtime.getPlatformInfo((platformInfo) => {
    const isMac = platformInfo.os === 'mac';
    const addShortcut = isMac ? 'Cmd+Click' : 'Meta+Click';
    const replaceShortcut = isMac ? 'Opt+Click' : 'Alt+Click';

    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID_RIGHT,
      title: `Add tab to the right (${addShortcut})`,
      contexts: ['link'],
    });

    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID_REPLACE,
      title: `Replace tab to the right (${replaceShortcut})`,
      contexts: ['link'],
    });
  });
});

// Also handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log(
    'Sandwich Bear extension started - frame-blocking headers will be removed',
  );
});

// Inject spoofing as early as possible on new documents
chrome.webNavigation.onCommitted.addListener(
  (details) => {
    if (details.frameId >= 0) {
      injectWindowSpoofing(details.tabId, details.frameId);
    }
  },
  { url: [{ schemes: ['http', 'https'] }] },
);

chrome.webNavigation.onBeforeNavigate.addListener(
  (details) => {
    if (details.frameId >= 0) {
      injectWindowSpoofing(details.tabId, details.frameId);
    }
  },
  { url: [{ schemes: ['http', 'https'] }] },
);

const updateContextMenuVisibility = async (tab) => {
  const splitBaseUrl = chrome.runtime.getURL('src/split.html');
  const isSplitPage = tab && tab.url && tab.url.startsWith(splitBaseUrl);

  let showRightMenu = isSplitPage;
  if (isSplitPage) {
    try {
      const urlObj = new URL(tab.url);
      let count = 0;
      const stateParam = urlObj.searchParams.get('state');
      if (stateParam) {
        try {
          const s = JSON.parse(stateParam);
          if (s && Array.isArray(s.urls)) count = s.urls.length;
        } catch (_e) {}
      }
      if (count >= 4) {
        showRightMenu = false;
      }
    } catch (e) {
      // ignore parsing errors
    }
  }

  await chrome.contextMenus.update(CONTEXT_MENU_ID_SPLIT, {
    visible: !isSplitPage,
  });
  await chrome.contextMenus.update(CONTEXT_MENU_ID_RIGHT, {
    visible: showRightMenu,
  });
  await chrome.contextMenus.update(CONTEXT_MENU_ID_REPLACE, {
    visible: showRightMenu,
  });
};

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  updateContextMenuVisibility(tab);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    updateContextMenuVisibility(tab);
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === CONTEXT_MENU_ID_SPLIT) {
    if (!tab || typeof tab.url !== 'string') return;
    const currentUrl = tab.url;
    const linkUrl = info.linkUrl ?? '';
    const state = {
      urls: [currentUrl, linkUrl],
    };
    const splitUrl = `${chrome.runtime.getURL(
      'src/split.html',
    )}?state=${encodeURIComponent(JSON.stringify(state))}`;
    const createOpts = { url: splitUrl };
    if (typeof tab.index === 'number') {
      // place new tab to the right if we know the index
      createOpts.index = tab.index + 1;
    }
    await chrome.tabs.create(createOpts);
    if (typeof tab.id === 'number') {
      await chrome.tabs.remove(tab.id);
    }
  } else if (info.menuItemId === CONTEXT_MENU_ID_RIGHT) {
    if (tab && typeof tab.id === 'number') {
      chrome.tabs.sendMessage(tab.id, {
        action: 'add-iframe-right',
        url: info.linkUrl,
        frameId: info.frameId,
      });
    }
  } else if (info.menuItemId === CONTEXT_MENU_ID_REPLACE) {
    if (tab && typeof tab.id === 'number') {
      chrome.tabs.sendMessage(tab.id, {
        action: 'replace-iframe-right',
        url: info.linkUrl,
        frameId: info.frameId,
      });
    }
  }
});

// Update action button contextually
const updateAction = async () => {
  try {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!activeTab || typeof activeTab.id !== 'number') return;

    const splitBaseUrl = chrome.runtime.getURL('src/split.html');
    let title = 'Sandwich Bear';

    if (
      typeof activeTab.url === 'string' &&
      activeTab.url.startsWith(splitBaseUrl)
    ) {
      // On split page: show popup with page controls
      title = 'Page Controls';
      await chrome.action.setPopup({
        tabId: activeTab.id,
        popup: 'src/action/popup.html',
      });
    } else {
      // Not on split page: show Open {N (2<=N<=4)} tabs in split view
      const windowId = activeTab.windowId;
      const highlightedTabs = await chrome.tabs.query({
        highlighted: true,
        windowId,
      });
      const httpTabs = highlightedTabs.filter(
        (t) =>
          typeof t.url === 'string' &&
          (t.url.startsWith('http://') || t.url.startsWith('https://')),
      );
      if (httpTabs.length <= 1) {
        title = 'Highlight multiple tabs to open in split view';
      } else {
        const n = Math.max(2, Math.min(4, httpTabs.length));
        title = `Open ${n} tabs in split view`;
      }
      // Clear popup so clicks are handled by the listener below
      await chrome.action.setPopup({ tabId: activeTab.id, popup: '' });
    }

    await chrome.action.setTitle({ title, tabId: activeTab.id });
  } catch (_e) {
    // no-op
  }
};

// Keep action state updated on common events
chrome.tabs.onActivated.addListener(() => {
  updateAction();
});
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, _tab) => {
  if (changeInfo.status === 'complete' || 'url' in changeInfo) {
    updateAction();
  }
});
chrome.tabs.onHighlighted.addListener(() => {
  updateAction();
});
chrome.windows.onFocusChanged.addListener(() => {
  updateAction();
});

// Initialize action state on install/startup
chrome.runtime.onInstalled.addListener(() => {
  updateAction();
});
chrome.runtime.onStartup.addListener(() => {
  updateAction();
});

const doSplit = async (currentTab) => {
  try {
    // Get highlighted tabs in the current window
    const highlightedTabs = await chrome.tabs.query({
      highlighted: true,
      currentWindow: true,
    });

    // Filter to http/https tabs, sort by tab index (left-to-right), take first 4
    const httpTabs = highlightedTabs
      .filter(
        (t) =>
          typeof t.url === 'string' &&
          (t.url.startsWith('http://') || t.url.startsWith('https://')),
      )
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .slice(0, 4);

    if (httpTabs.length < 2) {
      console.log(
        'Highlighted tabs did not include at least two HTTP(S) pages; doing nothing.',
      );
      return;
    }

    const state = {
      urls: httpTabs.map((t) => String(t.url)),
    };
    const splitUrl = `${chrome.runtime.getURL(
      'src/split.html',
    )}?state=${encodeURIComponent(JSON.stringify(state))}`;

    // Create the new split tab at the position of the first of the highlighted tabs,
    // and in the same tab group if they are in one.
    const firstTab = httpTabs[0];
    const newTab = await chrome.tabs.create({
      url: splitUrl,
      windowId: currentTab.windowId,
    });

    if (typeof newTab.id === 'number') {
      // If the first tab is in a group, move the new split tab into the same group.
      // This action moves the tab to the end of the group.
      if (typeof firstTab.groupId === 'number' && firstTab.groupId > -1) {
        await chrome.tabs.group({
          groupId: firstTab.groupId,
          tabIds: newTab.id,
        });
      }
      // Finally, move the tab to the desired index.
      await chrome.tabs.move(newTab.id, { index: firstTab.index });
    }

    // Close the used highlighted tabs
    try {
      const tabIdsToClose = httpTabs
        .map((t) => t.id)
        .filter((id) => typeof id === 'number');
      if (tabIdsToClose.length > 0) {
        await chrome.tabs.remove(/** @type {number[]} */ (tabIdsToClose));
      }
    } catch (closeErr) {
      console.error('Failed to close used highlighted tabs:', closeErr);
    }
  } catch (error) {
    console.error('Failed to open split page from highlighted tabs:', error);
  }
};

const doUngroup = async () => {
  // Find the current active tab, which should be the split page
  const [currentTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!currentTab || !currentTab.url) return;

  try {
    const urlObj = new URL(currentTab.url);
    let urls = [];
    const stateParam = urlObj.searchParams.get('state');
    if (stateParam) {
      try {
        const s = JSON.parse(stateParam);
        if (s && Array.isArray(s.urls)) {
          urls = s.urls.filter((u) => typeof u === 'string' && u.length > 0);
        }
      } catch (_e) {}
    }

    const baseIndex = (currentTab.index ?? 0) + 1;
    const newTabs = await Promise.all(
      urls.map((u) =>
        chrome.tabs.create({
          url: u,
          windowId: currentTab.windowId,
        }),
      ),
    );

    const newTabIds = newTabs
      .map((tab) => tab.id)
      .filter((id) => typeof id === 'number');

    if (newTabIds.length > 0) {
      // If the split page was in a group, move the new tabs into that group.
      if (typeof currentTab.groupId === 'number' && currentTab.groupId > -1) {
        for (const id of newTabIds) {
          await chrome.tabs.group({
            groupId: currentTab.groupId,
            tabIds: id,
          });
        }
      }
      // Move the tabs to the desired position.
      if (newTabIds.length === 1) {
        await chrome.tabs.move(newTabIds[0], { index: baseIndex });
      } else {
        await chrome.tabs.move(newTabIds, { index: baseIndex });
      }
    }
  } catch (unsplitErr) {
    console.error('Failed to unsplit tabs:', unsplitErr);
  }

  if (typeof currentTab.id === 'number') {
    try {
      await chrome.tabs.remove(currentTab.id);
    } catch (removeErr) {
      console.error('Failed to close split tab:', removeErr);
    }
  }
};

// Handle action button click: open up to the first 4 highlighted tabs in split page
// This only fires on non-split pages, since split pages have a popup.
chrome.action.onClicked.addListener(doSplit);

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'get-tab-id') {
    if (sender.tab && sender.tab.id) {
      sendResponse({ tabId: sender.tab.id });
    }
    return;
  }

  if (message.action === 'openAnchorLink') {
    // The tabs permission is required for chrome.tabs.create
    chrome.tabs.create({ url: message.url });
  } else if (message.action === 'ungroup') {
    await doUngroup();
  } else if (message === 'isInstalled') {
    sendResponse({ status: 'installed' });
  }
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'toggle-split-view') return;

  const splitBaseUrl = chrome.runtime.getURL('src/split.html');
  const isSplitPage = tab && tab.url && tab.url.startsWith(splitBaseUrl);

  if (isSplitPage) {
    await doUngroup();
  } else {
    await doSplit(tab);
  }
});
