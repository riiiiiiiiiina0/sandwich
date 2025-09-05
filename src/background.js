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

    let title = 'Sandwich Bear';

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
    await chrome.tabs.create({
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

    // Create a popup window for each tab
    for (let i = 0; i < targetTabs.length; i++) {
      const tab = targetTabs[i];
      await chrome.windows.create({
        url: tab.url,
        type: 'popup',
        left: windowLeft + i * popupWidth,
        top: windowTop,
        width: popupWidth,
        height: windowHeight,
      });
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
