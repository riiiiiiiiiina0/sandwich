import { appState } from './state.js';
import { toggleLayout } from './layout.js';
import { moveIframe } from './move.js';
import { removeIframe } from './remove.js';

export const createIframeMenu = (_iframeWrapper, index, totalCount) => {
  const isVerticalLayout = appState.getIsVerticalLayout();

  const menu = document.createElement('div');
  menu.className =
    'iframe-menu absolute top-0 left-0 bg-white border border-gray-300 rounded-br-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 flex gap-[2px] p-[2px] pointer-events-auto';

  const layoutBtn = document.createElement('button');
  layoutBtn.className =
    'btn btn-xs btn-ghost hover:btn-primary min-w-6 h-6 text-xs leading-none';
  layoutBtn.innerText = isVerticalLayout ? '↔️' : '↕️';
  layoutBtn.title = isVerticalLayout ? 'Horizontal layout' : 'Vertical layout';
  layoutBtn.addEventListener('click', toggleLayout);
  menu.appendChild(layoutBtn);

  if (index > 0) {
    const moveLeftBtn = document.createElement('button');
    moveLeftBtn.className =
      'btn btn-xs btn-ghost hover:btn-primary min-w-6 h-6 text-xs leading-none';
    moveLeftBtn.innerText = isVerticalLayout ? '⬆️' : '⬅️';
    moveLeftBtn.title = isVerticalLayout ? 'Move up' : 'Move left';
    moveLeftBtn.addEventListener('click', () => moveIframe(index, -1));
    menu.appendChild(moveLeftBtn);
  }

  if (index < totalCount - 1) {
    const moveRightBtn = document.createElement('button');
    moveRightBtn.className =
      'btn btn-xs btn-ghost hover:btn-primary min-w-6 h-6 text-xs leading-none';
    moveRightBtn.innerText = isVerticalLayout ? '⬇️' : '➡️';
    moveRightBtn.title = isVerticalLayout ? 'Move down' : 'Move right';
    moveRightBtn.addEventListener('click', () => moveIframe(index, 1));
    menu.appendChild(moveRightBtn);
  }

  const removeBtn = document.createElement('button');
  removeBtn.className =
    'btn btn-xs btn-ghost hover:btn-error min-w-6 h-6 text-xs leading-none';
  removeBtn.innerText = '❌';
  removeBtn.title = 'Remove';
  removeBtn.addEventListener('click', () => removeIframe(index));
  menu.appendChild(removeBtn);

  return menu;
};
