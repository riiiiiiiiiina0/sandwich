// Background script to remove headers that prevent iframe loading

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
});

// Also handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log(
    'Sandwich Bear extension started - frame-blocking headers will be removed',
  );
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
        chrome.action.enable(activeTab.id);
      } catch (_e) {
        title = 'Restore tabs';
        chrome.action.enable(activeTab.id);
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
        chrome.action.disable(activeTab.id);
      } else {
        const n = Math.max(2, Math.min(4, httpTabs.length));
        title = `Open ${n} tabs in split view`;
        chrome.action.enable(activeTab.id);
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
            if (
              typeof currentTab.groupId === 'number' &&
              currentTab.groupId > -1
            ) {
              await chrome.tabs.group({
                groupId: currentTab.groupId,
                tabIds: /** @type {number[]} */ (newTabIds),
              });
            }
            // Move the tabs to the desired position.
            await chrome.tabs.move(/** @type {number[]} */ (newTabIds), {
              index: baseIndex,
            });
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
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openAnchorLink') {
    // The tabs permission is required for chrome.tabs.create
    chrome.tabs.create({ url: message.url });
  }
});
