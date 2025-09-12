import { heroicons } from '../../docs/shared/heroicons.js';

document.addEventListener('DOMContentLoaded', () => {
  const ungroupBtn = document.getElementById('ungroup-btn');
  const copyLinkBtn = document.getElementById('copy-link-btn');
  const gridBtn = document.getElementById('grid-btn');
  const verticalBtn = document.getElementById('vertical-btn');
  const horizontalBtn = document.getElementById('horizontal-btn');

  const setIcon = (button, iconName) => {
    if (!button) return;
    button.innerHTML = heroicons[iconName].svg;
    const svg = /** @type {SVGElement|null} */ (button.querySelector('svg'));
    if (svg) {
      const baseRotation =
        (heroicons[iconName] && heroicons[iconName].rotation) ?? 0;
      svg.style.transform = `rotate(${baseRotation}deg)`;
    }
  };

  // Replace text with icons
  if (gridBtn) {
    setIcon(gridBtn, 'grid');
    gridBtn.title = 'Grid layout';
  }
  if (verticalBtn) {
    setIcon(verticalBtn, 'rows');
    verticalBtn.title = 'Vertical layout';
  }
  if (horizontalBtn) {
    setIcon(horizontalBtn, 'columns');
    horizontalBtn.title = 'Horizontal layout';
  }

  if (ungroupBtn) {
    ungroupBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'ungroup' });
      window.close();
    });
  }

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', async () => {
      const originalLabel = copyLinkBtn.textContent || 'Copy link';
      try {
        const splitBaseUrl = chrome.runtime.getURL('src/split.html');
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const tabUrl = tab && typeof tab.url === 'string' ? tab.url : '';
        if (!tabUrl || !tabUrl.startsWith(splitBaseUrl)) {
          await temporarilySetLabel(
            copyLinkBtn,
            'Not split page',
            originalLabel,
          );
          return;
        }

        const search = new URL(tabUrl).search || '';

        // Collect iframe titles from the split page (ordered)
        const titles =
          typeof tab.id === 'number' ? await collectIframeTitles(tab) : [];

        const urlObj = new URL(
          `https://riiiiiiiiiina0.github.io/sandwich/g.html${search}`,
        );
        // Append title param as JSON string
        urlObj.searchParams.set('title', JSON.stringify({ titles }));
        const shareUrl = urlObj.toString();
        await writeToClipboard(shareUrl);
        await temporarilySetLabel(copyLinkBtn, 'Copied', originalLabel);
      } catch (err) {
        console.error('Failed to copy link', err);
        await temporarilySetLabel(copyLinkBtn, 'Failed', originalLabel);
      }
    });
  }

  if (gridBtn) {
    gridBtn.addEventListener('click', () => {
      sendMessageToActiveTab({ action: 'change-layout', layout: 'grid' });
      window.close();
    });
  }

  if (verticalBtn) {
    verticalBtn.addEventListener('click', () => {
      sendMessageToActiveTab({ action: 'change-layout', layout: 'vertical' });
      window.close();
    });
  }

  if (horizontalBtn) {
    horizontalBtn.addEventListener('click', () => {
      sendMessageToActiveTab({ action: 'change-layout', layout: 'horizontal' });
      window.close();
    });
  }
});

async function sendMessageToActiveTab(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, message);
  }
}

async function writeToClipboard(text) {
  await navigator.clipboard.writeText(text);
}

async function collectIframeTitles(tab) {
  try {
    const tabId = typeof tab.id === 'number' ? tab.id : undefined;
    const tabUrl = typeof tab.url === 'string' ? tab.url : '';
    if (typeof tabId !== 'number' || !tabUrl) return [];

    // Determine desired order from split page URL params
    let orderedFromParam = [];
    try {
      const u = new URL(tabUrl);
      const urlsParam = u.searchParams.get('urls');
      if (urlsParam) {
        orderedFromParam = urlsParam
          .split(',')
          .map((s) => decodeURIComponent(s))
          .filter(Boolean);
      }
    } catch (_e) {}

    const normalize = (u) => {
      try {
        const x = new URL(u);
        return `${x.origin}${x.pathname}`;
      } catch (_e) {
        return u || '';
      }
    };
    const orderedNormalized = orderedFromParam.map((s) => normalize(s));

    // Ask each frame for its current title/url via content script
    const frames = (await chrome.webNavigation.getAllFrames({ tabId })) || [];
    const responses = [];
    for (const f of frames) {
      try {
        const resp = await chrome.tabs.sendMessage(
          tabId,
          { action: 'sb:get-title' },
          { frameId: f.frameId },
        );
        if (
          resp &&
          typeof resp.title === 'string' &&
          typeof resp.url === 'string'
        ) {
          responses.push({ title: resp.title, url: resp.url });
        }
      } catch (_e) {
        // ignore frames that do not respond
      }
    }

    const byNorm = new Map();
    for (const r of responses) {
      const key = normalize(r.url);
      if (!byNorm.has(key)) byNorm.set(key, r.title);
    }

    const titlesOrdered = [];
    if (orderedNormalized.length > 0) {
      for (const key of orderedNormalized) {
        if (byNorm.has(key)) titlesOrdered.push(String(byNorm.get(key) || ''));
      }
    }
    if (titlesOrdered.length === 0) {
      for (const r of responses) titlesOrdered.push(String(r.title || ''));
    }
    return titlesOrdered;
  } catch (_e) {
    return [];
  }
}

async function temporarilySetLabel(button, tempText, originalText) {
  button.textContent = tempText;
  await new Promise((resolve) => setTimeout(resolve, 2000));
  button.textContent = originalText;
}
