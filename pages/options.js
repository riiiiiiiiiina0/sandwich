const commandInputIds = [
  'move-left',
  'move-right',
  'close',
  'detach',
];

const defaultCommands = {
  'move-left': 'ctrl+left',
  'move-right': 'ctrl+right',
  'close': 'ctrl+x',
  'detach': 'ctrl+d',
};

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

function saveOptions() {
  const commands = {};
  for (const id of commandInputIds) {
    const input = /** @type {HTMLInputElement} */ (document.getElementById(id));
    commands[id] = normalizeShortcut(input.value);
  }

  chrome.storage.sync.set({ commands }, () => {
    const status = document.getElementById('status');
    if (status) {
      status.textContent = 'Options saved.';
      setTimeout(() => {
        status.textContent = '';
      }, 750);
    }
  });
}

function restoreOptions() {
  chrome.storage.sync.get({ commands: defaultCommands }, (items) => {
    for (const id of commandInputIds) {
      const input = /** @type {HTMLInputElement} */ (document.getElementById(id));
      input.value = items.commands[id] || defaultCommands[id];
    }
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save')?.addEventListener('click', saveOptions);

for (const id of commandInputIds) {
  const input = /** @type {HTMLInputElement} */ (document.getElementById(id));
  input.addEventListener('keydown', (e) => {
    e.preventDefault();
    const key = e.key.toLowerCase();
    const parts = [];
    if (e.ctrlKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    if (e.metaKey) parts.push('meta');
    if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
        parts.push(key);
    }
    input.value = parts.join('+');
  });
}
