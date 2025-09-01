// Background script to remove headers that prevent iframe loading

chrome.runtime.onInstalled.addListener(() => {
  // Remove headers that prevent iframe loading
  const rules = [
    {
      id: 1,
      priority: 1,
      action: {
        type: /** @type {'modifyHeaders'} */ ('modifyHeaders'),
        responseHeaders: [
          {
            header: 'X-Frame-Options',
            operation: /** @type {'remove'} */ ('remove'),
          },
        ],
      },
      condition: {
        urlFilter: '*',
        resourceTypes: /** @type {('main_frame'|'sub_frame')[]} */ ([
          'main_frame',
          'sub_frame',
        ]),
      },
    },
    {
      id: 2,
      priority: 1,
      action: {
        type: /** @type {'modifyHeaders'} */ ('modifyHeaders'),
        responseHeaders: [
          {
            header: 'Frame-Options',
            operation: /** @type {'remove'} */ ('remove'),
          },
        ],
      },
      condition: {
        urlFilter: '*',
        resourceTypes: /** @type {('main_frame'|'sub_frame')[]} */ ([
          'main_frame',
          'sub_frame',
        ]),
      },
    },
    {
      id: 3,
      priority: 1,
      action: {
        type: /** @type {'modifyHeaders'} */ ('modifyHeaders'),
        responseHeaders: [
          {
            header: 'Content-Security-Policy',
            operation: /** @type {'remove'} */ ('remove'),
          },
        ],
      },
      condition: {
        urlFilter: '*',
        resourceTypes: /** @type {('main_frame'|'sub_frame')[]} */ ([
          'main_frame',
          'sub_frame',
        ]),
      },
    },
    {
      id: 4,
      priority: 1,
      action: {
        type: /** @type {'modifyHeaders'} */ ('modifyHeaders'),
        responseHeaders: [
          {
            header: 'Content-Security-Policy-Report-Only',
            operation: /** @type {'remove'} */ ('remove'),
          },
        ],
      },
      condition: {
        urlFilter: '*',
        resourceTypes: /** @type {('main_frame'|'sub_frame')[]} */ ([
          'main_frame',
          'sub_frame',
        ]),
      },
    },
  ];

  // Remove existing rules and add new ones
  chrome.declarativeNetRequest
    .updateDynamicRules({
      removeRuleIds: [1, 2, 3, 4],
      addRules: rules,
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

// Handle action button click: open up to the first 4 highlighted tabs in split page
chrome.action.onClicked.addListener(async (currentTab) => {
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

    const urlsParam = httpTabs
      .map((t) => encodeURIComponent(String(t.url)))
      .join(',');

    const splitUrl = `${chrome.runtime.getURL(
      'src/split.html',
    )}?urls=${urlsParam}`;

    await chrome.tabs.create({ url: splitUrl, windowId: currentTab.windowId });
  } catch (error) {
    console.error('Failed to open split page from highlighted tabs:', error);
  }
});
