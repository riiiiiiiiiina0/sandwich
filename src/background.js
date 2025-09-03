// Background script to remove headers that prevent iframe loading

// Store tab IDs of split pages to efficiently update the uninstall URL.
let splitTabIds = new Set();

const syncSplitTabIds = async () => {
  const splitBaseUrl = chrome.runtime.getURL('pages/split.html');
  const splitTabs = await chrome.tabs.query({ url: `${splitBaseUrl}*` });
  splitTabIds = new Set(splitTabs.map((t) => t.id).filter((id) => id));
};

const updateUninstallURL = async () => {
  try {
    const allUrls = [];
    for (const tabId of splitTabIds) {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab && tab.url) {
          const urlObj = new URL(tab.url);
          const urlsParam = urlObj.searchParams.get('urls');
          if (urlsParam) {
            const urls = urlsParam
              .split(',')
              .map((s) => decodeURIComponent(s))
              .filter((u) => u && u.length > 0);
            allUrls.push(...urls);
          }
        }
      } catch (e) {
        // Tab might have been closed in the meantime.
      }
    }

    let uninstallUrl = chrome.runtime.getURL('pages/restore.html');
    if (allUrls.length > 0) {
      const urlsParam = allUrls.map((u) => encodeURIComponent(u)).join(',');
      uninstallUrl += `?urls=${urlsParam}`;
    }

    // It is not possible to run code when an extension is uninstalled.
    // The best we can do is open a page with instructions on how to restore the tabs.
    // This is why we use setUninstallURL.
    await chrome.runtime.setUninstallURL(uninstallUrl);
    console.log('Uninstall URL set to:', uninstallUrl);
  } catch (error) {
    console.error('Failed to update uninstall URL:', error);
  }
};

chrome.runtime.onInstalled.addListener(async () => {
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

  await syncSplitTabIds();
  await updateUninstallURL();
});

// Also handle extension startup
chrome.runtime.onStartup.addListener(async () => {
  console.log(
    'Sandwich Bear extension started - frame-blocking headers will be removed',
  );
  await syncSplitTabIds();
  await updateUninstallURL();
});

// Update action title to indicate what clicking will do in current context
const updateActionTitle = async () => {
  try {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!activeTab || typeof activeTab.id !== 'number') return;

    const splitBaseUrl = chrome.runtime.getURL('pages/split.html');
    let title = 'Sandwich Bear';

    if (
      typeof activeTab.url === 'string' &&
      activeTab.url.startsWith(splitBaseUrl)
    ) {
      // On split page: show Restore {N} tabs based on query param
      try {
        const urlObj = new URL(activeTab.url);
        const urlsParam = urlObj.searchParams.get('urls');
        const count = urlsParam
          ? urlsParam
              .split(',')
              .map((s) => decodeURIComponent(s))
              .filter((u) => u && u.length > 0).length
          : 0;
        title = `Restore ${count} tabs`;
      } catch (_e) {
        title = 'Restore tabs';
      }
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

// Update uninstall URL whenever a split tab is created or removed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const splitBaseUrl = chrome.runtime.getURL('pages/split.html');
  if (
    changeInfo.status === 'complete' &&
    tab.url &&
    tab.url.startsWith(splitBaseUrl)
  ) {
    if (tab.id) {
      splitTabIds.add(tab.id);
    }
    updateUninstallURL();
  }
});
chrome.tabs.onRemoved.addListener((tabId) => {
  if (splitTabIds.has(tabId)) {
    splitTabIds.delete(tabId);
    updateUninstallURL();
  }
});

// Handle action button click: open up to the first 4 highlighted tabs in split page
chrome.action.onClicked.addListener(async (currentTab) => {
  try {
    // If we're currently on the split page, unsplit: open all iframe URLs as tabs and close the split tab
    const splitBaseUrl = chrome.runtime.getURL('pages/split.html');
    if (
      typeof currentTab.url === 'string' &&
      currentTab.url.startsWith(splitBaseUrl)
    ) {
      try {
        const urlObj = new URL(currentTab.url);
        const urlsParam = urlObj.searchParams.get('urls');
        if (urlsParam) {
          const urls = urlsParam
            .split(',')
            .map((s) => decodeURIComponent(s))
            .filter((u) => typeof u === 'string' && u.length > 0);

          const baseIndex = (currentTab.index ?? 0) + 1;
          await Promise.all(
            urls.map((u, i) =>
              chrome.tabs.create({
                url: u,
                windowId: currentTab.windowId,
                index: baseIndex + i,
              }),
            ),
          );
        }
      } catch (unsplitErr) {
        console.error('Failed to unsplit tabs:', unsplitErr);
      }

      if (typeof currentTab.id === 'number') {
        try {
          const tabId = currentTab.id;
          await chrome.tabs.remove(tabId);
          if (splitTabIds.has(tabId)) {
            splitTabIds.delete(tabId);
            await updateUninstallURL();
          }
        } catch (removeErr) {
          console.error('Failed to close split tab:', removeErr);
        }
      }
      return;
    }

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

    const urlsParam = httpTabs
      .map((t) => encodeURIComponent(String(t.url)))
      .join(',');

    const splitUrl = `${chrome.runtime.getURL(
      'pages/split.html',
    )}?urls=${urlsParam}`;

    const newTab = await chrome.tabs.create({
      url: splitUrl,
      windowId: currentTab.windowId,
    });
    if (newTab.id) {
      splitTabIds.add(newTab.id);
    }
    await updateUninstallURL();

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
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openAnchorLink') {
    // The tabs permission is required for chrome.tabs.create
    chrome.tabs.create({ url: message.url });
  }
});
