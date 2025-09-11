document.addEventListener('DOMContentLoaded', () => {
  const ungroupBtn = document.getElementById('ungroup-btn');
  const gridBtn = document.getElementById('grid-btn');
  const verticalBtn = document.getElementById('vertical-btn');
  const horizontalBtn = document.getElementById('horizontal-btn');

  ungroupBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'ungroup' });
    window.close();
  });

  gridBtn.addEventListener('click', () => {
    sendMessageToActiveTab({ action: 'change-layout', layout: 'grid' });
    window.close();
  });

  verticalBtn.addEventListener('click', () => {
    sendMessageToActiveTab({ action: 'change-layout', layout: 'vertical' });
    window.close();
  });

  horizontalBtn.addEventListener('click', () => {
    sendMessageToActiveTab({ action: 'change-layout', layout: 'horizontal' });
    window.close();
  });
});

async function sendMessageToActiveTab(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, message);
  }
}
