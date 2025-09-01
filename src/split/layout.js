import { appState } from './state.js';
import { updateCssOrder } from './ordering.js';
import { updateUrlWithState } from './url.js';

export const applyLayout = () => {
  const iframeContainer = appState.getContainer();
  const isVerticalLayout = appState.getIsVerticalLayout();

  if (isVerticalLayout) {
    iframeContainer.className = 'flex flex-col h-screen w-screen';
  } else {
    iframeContainer.className = 'flex flex-row h-screen w-screen';
  }

  const iframes = /** @type {NodeListOf<HTMLIFrameElement>} */ (
    document.querySelectorAll('.resizable-iframe')
  );
  const dividers = /** @type {NodeListOf<HTMLDivElement>} */ (
    document.querySelectorAll('.iframe-divider')
  );
  const wrappers = /** @type {NodeListOf<HTMLDivElement>} */ (
    document.querySelectorAll('.iframe-wrapper')
  );

  iframes.forEach((iframe) => {
    if (isVerticalLayout) {
      iframe.className =
        'resizable-iframe w-full border border-gray-300 box-border rounded-lg pointer-events-auto flex-shrink-0 flex-grow-0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
    } else {
      iframe.className =
        'resizable-iframe h-full border border-gray-300 box-border rounded-lg pointer-events-auto flex-shrink-0 flex-grow-0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
    }
  });

  wrappers.forEach((wrapper) => {
    if (isVerticalLayout) {
      const widthRatio =
        parseFloat(wrapper.style.width) || 100 / wrappers.length;
      wrapper.style.height = `${widthRatio}%`;
      wrapper.style.width = '100%';
    } else {
      const heightRatio =
        parseFloat(wrapper.style.height) || 100 / wrappers.length;
      wrapper.style.width = `${heightRatio}%`;
      wrapper.style.height = '100%';
    }
  });

  dividers.forEach((divider) => {
    if (isVerticalLayout) {
      divider.className =
        'iframe-divider m-0 p-0 h-1 w-full cursor-row-resize min-h-1 relative flex-shrink-0 flex-grow-0';
    } else {
      divider.className =
        'iframe-divider m-0 p-0 w-1 h-full cursor-col-resize min-w-1 relative flex-shrink-0 flex-grow-0';
    }
  });

  updateCssOrder();
};

export const toggleLayout = () => {
  appState.toggleVerticalLayout();
  applyLayout();
  updateButtonLabels();
  updateUrlWithState();
};

export const updateButtonLabels = () => {
  const iframeContainer = appState.getContainer();
  const isVerticalLayout = appState.getIsVerticalLayout();
  const wrappers = Array.from(iframeContainer.children).filter((child) =>
    child.classList.contains('iframe-wrapper'),
  );

  wrappers.forEach((wrapper) => {
    const menu = wrapper.querySelector('.iframe-menu');
    if (menu) {
      const layoutBtn = /** @type {HTMLButtonElement} */ (menu.children[0]);
      const moveLeftBtn = /** @type {HTMLButtonElement} */ (menu.children[1]);
      const moveRightBtn = /** @type {HTMLButtonElement} */ (
        menu.children[menu.children.length - 2]
      );

      if (layoutBtn) {
        layoutBtn.innerText = isVerticalLayout ? '↔️' : '↕️';
        layoutBtn.title = isVerticalLayout
          ? 'Horizontal layout'
          : 'Vertical layout';
      }

      if (
        moveLeftBtn &&
        (moveLeftBtn.innerText.includes('⬅️') ||
          moveLeftBtn.innerText.includes('⬆️'))
      ) {
        moveLeftBtn.innerText = isVerticalLayout ? '⬆️' : '⬅️';
        moveLeftBtn.title = isVerticalLayout ? 'Move up' : 'Move left';
      }

      if (
        moveRightBtn &&
        (moveRightBtn.innerText.includes('➡️') ||
          moveRightBtn.innerText.includes('⬇️'))
      ) {
        moveRightBtn.innerText = isVerticalLayout ? '⬇️' : '➡️';
        moveRightBtn.title = isVerticalLayout ? 'Move down' : 'Move right';
      }
    }
  });
};
