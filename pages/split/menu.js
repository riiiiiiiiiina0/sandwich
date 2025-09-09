import { appState } from './state.js';
import { heroicons } from './heroicons.js';
import {
  toggleLayout,
  setLayoutToGrid,
  setLayoutToHorizontal,
  setLayoutToVertical,
} from './layout.js';
import { moveIframe } from './move.js';
import { removeIframe } from './remove.js';

export const createIframeMenu = (_iframeWrapper, index, totalCount) => {
  const mode = appState.getLayoutMode();
  const isVerticalLayout = mode === 'vertical';
  const isGridLayout = mode === 'grid';

  const menu = document.createElement('div');
  menu.className =
    'iframe-menu absolute -top-[1px] left-[50%] -translate-x-1/2 bg-white/50 dark:bg-gray-700/50 dark:text-white backdrop-blur-md rounded-b-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 flex gap-[2px] p-[2px] pointer-events-auto';

  /**
   * @param {keyof typeof heroicons} name
   */
  const createHeroicon = (name) => {
    const container = document.createElement('span');
    container.innerHTML = heroicons[name].svg;
    const svg = /** @type {SVGElement} */ (container.firstElementChild);
    if (svg) {
      const baseRotation = (heroicons[name] && heroicons[name].rotation) ?? 0;
      svg.style.transform = `rotate(${baseRotation}deg)`;
    }
    return svg;
  };

  if (isGridLayout) {
    // In grid, show explicit Horizontal and Vertical buttons
    const toHorizontalBtn = document.createElement('button');
    toHorizontalBtn.className =
      'btn btn-xs btn-ghost hover:btn-primary min-w-6 h-6 text-xs leading-none';
    toHorizontalBtn.dataset.role = 'to-horizontal';
    // Icon should depict columns to indicate horizontal split
    toHorizontalBtn.appendChild(createHeroicon('columns'));
    toHorizontalBtn.title = 'Horizontal layout';
    toHorizontalBtn.addEventListener('click', setLayoutToHorizontal);
    menu.appendChild(toHorizontalBtn);

    const toVerticalBtn = document.createElement('button');
    toVerticalBtn.className =
      'btn btn-xs btn-ghost hover:btn-primary min-w-6 h-6 text-xs leading-none';
    toVerticalBtn.dataset.role = 'to-vertical';
    // Icon should depict rows to indicate vertical split
    toVerticalBtn.appendChild(createHeroicon('rows'));
    toVerticalBtn.title = 'Vertical layout';
    toVerticalBtn.addEventListener('click', setLayoutToVertical);
    menu.appendChild(toVerticalBtn);
  } else {
    // In linear layouts, show a Grid switcher plus the existing toggle
    if (totalCount === 4) {
      const gridBtn = document.createElement('button');
      gridBtn.className =
        'btn btn-xs btn-ghost hover:btn-primary min-w-6 h-6 text-xs leading-none';
      gridBtn.dataset.role = 'grid';
      gridBtn.appendChild(createHeroicon('grid'));
      gridBtn.title = 'Grid layout';
      gridBtn.addEventListener('click', setLayoutToGrid);
      menu.appendChild(gridBtn);
    }

    const layoutBtn = document.createElement('button');
    layoutBtn.className =
      'btn btn-xs btn-ghost hover:btn-primary min-w-6 h-6 text-xs leading-none';
    layoutBtn.dataset.role = 'layout';
    layoutBtn.appendChild(
      createHeroicon(isVerticalLayout ? 'columns' : 'rows'),
    );
    layoutBtn.title = isVerticalLayout
      ? 'Horizontal layout'
      : 'Vertical layout';
    layoutBtn.addEventListener('click', toggleLayout);
    menu.appendChild(layoutBtn);
  }

  const reloadBtn = document.createElement('button');
  reloadBtn.className =
    'btn btn-xs btn-ghost hover:btn-primary min-w-6 h-6 text-xs leading-none';
  reloadBtn.dataset.role = 'reload';
  reloadBtn.appendChild(createHeroicon('reload'));
  reloadBtn.title = 'Reload';
  reloadBtn.addEventListener('click', () => {
    const iframe = /** @type {HTMLIFrameElement|null} */ (
      _iframeWrapper.querySelector('iframe')
    );
    if (iframe && iframe.dataset.frameId) {
      const frameId = parseInt(iframe.dataset.frameId, 10);
      // @ts-ignore
      chrome.tabs.getCurrent((tab) => {
        if (tab && tab.id) {
          // @ts-ignore
          chrome.tabs.sendMessage(
            tab.id,
            { action: 'reloadFrame' },
            { frameId: frameId },
          );
        }
      });
    }
  });
  menu.appendChild(reloadBtn);

  const backBtn = document.createElement('button');
  backBtn.className =
    'btn btn-xs btn-ghost hover:btn-primary min-w-6 h-6 text-xs leading-none';
  backBtn.dataset.role = 'back';
  backBtn.appendChild(createHeroicon('back'));
  backBtn.title = 'Back';
  backBtn.addEventListener('click', () => {
    const iframe = /** @type {HTMLIFrameElement|null} */ (
      _iframeWrapper.querySelector('iframe')
    );
    if (iframe && iframe.dataset.frameId) {
      const frameId = parseInt(iframe.dataset.frameId, 10);
      // @ts-ignore
      chrome.tabs.getCurrent((tab) => {
        if (tab && tab.id) {
          // @ts-ignore
          chrome.tabs.sendMessage(
            tab.id,
            { action: 'goBack' },
            { frameId: frameId },
          );
        }
      });
    }
  });
  menu.appendChild(backBtn);

  if (index > 0) {
    const moveLeftBtn = document.createElement('button');
    moveLeftBtn.className =
      'btn btn-xs btn-ghost hover:btn-primary min-w-6 h-6 text-xs leading-none';
    moveLeftBtn.dataset.role = 'move-left';
    const moveLeftIcon = /** @type {SVGElement} */ (createHeroicon('moveLeft'));
    const baseRotation =
      (heroicons.moveLeft && heroicons.moveLeft.rotation) ?? 0;
    const extraRotation = isVerticalLayout ? 90 : 0;
    moveLeftIcon.style.transform = `rotate(${baseRotation + extraRotation}deg)`;
    moveLeftBtn.appendChild(moveLeftIcon);
    moveLeftBtn.title = isVerticalLayout ? 'Move up' : 'Move left';
    moveLeftBtn.addEventListener('click', () => moveIframe(index, -1));
    menu.appendChild(moveLeftBtn);
  }

  if (index < totalCount - 1) {
    const moveRightBtn = document.createElement('button');
    moveRightBtn.className =
      'btn btn-xs btn-ghost hover:btn-primary min-w-6 h-6 text-xs leading-none';
    moveRightBtn.dataset.role = 'move-right';
    const moveRightIcon = /** @type {SVGElement} */ (
      createHeroicon('moveRight')
    );
    const baseRotationR =
      (heroicons.moveRight && heroicons.moveRight.rotation) ?? 0;
    const extraRotationR = isVerticalLayout ? 90 : 0;
    moveRightIcon.style.transform = `rotate(${
      baseRotationR + extraRotationR
    }deg)`;
    moveRightBtn.appendChild(moveRightIcon);
    moveRightBtn.title = isVerticalLayout ? 'Move down' : 'Move right';
    moveRightBtn.addEventListener('click', () => moveIframe(index, 1));
    menu.appendChild(moveRightBtn);
  }

  const removeBtn = document.createElement('button');
  removeBtn.className =
    'btn btn-xs btn-ghost hover:btn-error min-w-6 h-6 text-xs leading-none';
  removeBtn.dataset.role = 'remove';
  removeBtn.appendChild(createHeroicon('close'));
  removeBtn.title = 'Remove';
  removeBtn.addEventListener('click', () => removeIframe(index));
  menu.appendChild(removeBtn);

  // Detach to new browser tab
  const detachBtn = document.createElement('button');
  detachBtn.className =
    'btn btn-xs btn-ghost hover:btn-primary min-w-6 h-6 text-xs leading-none';
  detachBtn.dataset.role = 'detach';
  detachBtn.appendChild(createHeroicon('openInNewTab'));
  detachBtn.title = 'Open in new tab';
  detachBtn.addEventListener('click', async () => {
    try {
      const iframe = /** @type {HTMLIFrameElement|null} */ (
        _iframeWrapper.querySelector('iframe')
      );
      if (!iframe) return;
      const liveSrc = iframe.getAttribute('data-sb-current-url');
      const originalSrc = iframe.getAttribute('src');
      const url =
        (liveSrc && liveSrc.trim()) || originalSrc || iframe.src || '';
      if (!url) return;
      try {
        await chrome.tabs.create({ url, active: true });
      } catch (_e) {
        // no-op
      }
      removeIframe(index);
    } catch (_e) {
      // no-op
    }
  });
  menu.appendChild(detachBtn);

  return menu;
};
