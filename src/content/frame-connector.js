// Send a message to the parent to register this frame
if (window.name && window.name.startsWith('sb-iframe-')) {
  chrome.runtime.sendMessage({
    action: 'registerFrame',
    frameName: window.name,
  });
}

// Listen for commands from the parent
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message.action === 'reloadFrame') {
    window.location.reload();
  }
  if (message.action === 'goBack') {
    window.history.back();
  }
});
