document.addEventListener('DOMContentLoaded', () => {
  const tabListContainer = document.getElementById('tab-list');
  const openSplitScreenBtn = document.getElementById('open-split-screen');

  chrome.tabs.query({}, (tabs) => {
    const windows = tabs.reduce((acc, tab) => {
      if (!acc[tab.windowId]) {
        acc[tab.windowId] = [];
      }
      acc[tab.windowId].push(tab);
      return acc;
    }, {});

    for (const windowId in windows) {
      const windowDiv = document.createElement('div');
      windowDiv.className = 'mb-4';

      const windowHeader = document.createElement('h2');
      windowHeader.className = 'text-lg font-semibold';
      windowHeader.textContent = `Window ${windowId}`;
      windowDiv.appendChild(windowHeader);

      windows[windowId].forEach((tab) => {
        const tabDiv = document.createElement('div');
        tabDiv.className = 'flex items-center my-1';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'checkbox checkbox-primary';
        checkbox.value = tab.url;
        checkbox.dataset.tabId = tab.id;

        const label = document.createElement('label');
        label.className = 'ml-2 flex items-center';

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
      encodeURIComponent(cb.value),
    );
    const splitScreenUrl = `src/split.html?urls=${urls.join(',')}`;

    chrome.tabs.create({ url: splitScreenUrl });
  });
});
