import { heroicons } from '../shared/heroicons.js';

document.addEventListener('DOMContentLoaded', () => {
  const ungroupBtn = document.getElementById('ungroup-btn');
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
