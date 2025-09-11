import { appState } from './state.js';
import { moveIframe } from './move.js';
import { removeIframe } from './remove.js';
import { detachIframe } from './url.js';

const defaultCommands = {
  'move-left': 'ctrl+left',
  'move-right': 'ctrl+right',
  'close': 'ctrl+x',
  'detach': 'ctrl+d',
};

let activeWrapper = null;
let commands = defaultCommands;

/**
 * @param {string} s
 * @returns {string}
 */
function normalizeShortcut(s) {
    const parts = s.toLowerCase().split('+').map(p => p.trim());
    const modifiers = parts.filter(p => ['ctrl', 'alt', 'shift', 'meta'].includes(p)).sort();
    const key = parts.find(p => !['ctrl', 'alt', 'shift', 'meta'].includes(p));
    return [...modifiers, key].join('+');
}

function handleKeyDown(e) {
  if (!activeWrapper) {
    return;
  }

  const key = e.key.toLowerCase();
  const parts = [];
  if (e.ctrlKey) parts.push('ctrl');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  if (e.metaKey) parts.push('meta');
  if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
      parts.push(key);
  }
  const shortcut = parts.join('+');

  for (const command in commands) {
    if (normalizeShortcut(commands[command]) === shortcut) {
      e.preventDefault();
      e.stopPropagation();
      performCommand(command, activeWrapper);
      break;
    }
  }
}

function performCommand(command, wrapper) {
    const iframe = wrapper.querySelector('iframe');
    if (!iframe) {
        return;
    }

    switch (command) {
        case 'move-left':
            moveIframe(wrapper, 'left');
            break;
        case 'move-right':
            moveIframe(wrapper, 'right');
            break;
        case 'close':
            removeIframe(wrapper);
            break;
        case 'detach':
            detachIframe(iframe);
            removeIframe(wrapper);
            break;
    }
}

export function initShortcuts() {
  chrome.storage.sync.get({ commands: defaultCommands }, (items) => {
    commands = items.commands;
  });

  const iframeContainer = appState.getContainer();

  iframeContainer.addEventListener('mouseenter', (e) => {
    const wrapper = e.target.closest('.iframe-wrapper');
    if (wrapper) {
      activeWrapper = wrapper;
    }
  }, true);

  iframeContainer.addEventListener('mouseleave', (e) => {
    const wrapper = e.target.closest('.iframe-wrapper');
    if (wrapper) {
      activeWrapper = null;
    }
  }, true);

  document.addEventListener('keydown', handleKeyDown);
}
