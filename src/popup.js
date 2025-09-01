document.addEventListener('DOMContentLoaded', () => {
  const tabListContainer = /** @type {HTMLElement} */ (
    document.getElementById('tab-list')
  );
  const openSplitScreenBtn = /** @type {HTMLButtonElement} */ (
    document.getElementById('open-split-screen')
  );

  if (!tabListContainer || !openSplitScreenBtn) {
    throw new Error('Tab list container or open split screen button not found');
  }

  chrome.tabs.query({}, (tabs) => {
    // Filter out tabs that are not HTTP/HTTPS
    const httpTabs = tabs.filter(
      (tab) =>
        tab.url &&
        (tab.url.startsWith('http://') || tab.url.startsWith('https://')),
    );

    const windows = httpTabs.reduce((acc, tab) => {
      if (!acc[tab.windowId]) {
        acc[tab.windowId] = [];
      }
      acc[tab.windowId].push(tab);
      return acc;
    }, {});

    for (const windowId in windows) {
      const windowDiv = document.createElement('div');
      windowDiv.className = 'mb-4 p-3 bg-gray-100 rounded-lg';

      windows[windowId].forEach((tab) => {
        const tabDiv = document.createElement('div');
        tabDiv.className = 'flex items-center my-1';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'checkbox checkbox-primary';
        checkbox.value = tab.url;
        checkbox.dataset.tabId = tab.id;
        checkbox.id = `tab-${tab.id}`;

        const label = document.createElement('label');
        label.className = 'ml-2 flex items-center cursor-pointer';
        label.htmlFor = `tab-${tab.id}`;

        if (tab.favIconUrl) {
          const favicon = document.createElement('img');
          favicon.src = tab.favIconUrl;
          favicon.className = 'w-4 h-4 mr-2';
          label.appendChild(favicon);
        }

        const title = document.createElement('span');
        title.textContent = tab.title;
        label.appendChild(title);

        tabDiv.appendChild(checkbox);
        tabDiv.appendChild(label);
        windowDiv.appendChild(tabDiv);
      });
      tabListContainer.appendChild(windowDiv);
    }
  });

  tabListContainer.addEventListener('change', () => {
    const selectedCheckboxes = tabListContainer.querySelectorAll(
      'input[type="checkbox"]:checked',
    );
    if (selectedCheckboxes.length >= 2 && selectedCheckboxes.length <= 4) {
      openSplitScreenBtn.disabled = false;
    } else {
      openSplitScreenBtn.disabled = true;
    }
  });

  openSplitScreenBtn.addEventListener('click', () => {
    const selectedCheckboxes = tabListContainer.querySelectorAll(
      'input[type="checkbox"]:checked',
    );
    const urls = Array.from(selectedCheckboxes).map((cb) =>
      encodeURIComponent(/** @type {HTMLInputElement} */ (cb).value),
    );
    const splitScreenUrl = `src/split.html?urls=${urls.join(',')}`;

    chrome.tabs.create({ url: splitScreenUrl });
  });
});
