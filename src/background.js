// Background script to remove headers that prevent iframe loading

chrome.runtime.onInstalled.addListener(() => {
  // Remove headers that prevent iframe loading
  const rules = [
    {
      id: 1,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [
          {
            header: 'X-Frame-Options',
            operation: 'remove',
          },
        ],
      },
      condition: {
        urlFilter: '*',
        resourceTypes: ['main_frame', 'sub_frame'],
      },
    },
    {
      id: 2,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [
          {
            header: 'Frame-Options',
            operation: 'remove',
          },
        ],
      },
      condition: {
        urlFilter: '*',
        resourceTypes: ['main_frame', 'sub_frame'],
      },
    },
    {
      id: 3,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [
          {
            header: 'Content-Security-Policy',
            operation: 'remove',
          },
        ],
      },
      condition: {
        urlFilter: '*',
        resourceTypes: ['main_frame', 'sub_frame'],
      },
    },
    {
      id: 4,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [
          {
            header: 'Content-Security-Policy-Report-Only',
            operation: 'remove',
          },
        ],
      },
      condition: {
        urlFilter: '*',
        resourceTypes: ['main_frame', 'sub_frame'],
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
