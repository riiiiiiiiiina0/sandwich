import { appState } from './state.js';
import { createIframeMenu } from './menu.js';
import { updateCssOrder } from './ordering.js';
import { updateUrlWithState } from './url.js';

export const rebuildInterface = () => {
  const iframeContainer = appState.getContainer();

  const wrappers = Array.from(iframeContainer.children).filter((child) =>
    child.classList.contains('iframe-wrapper'),
  );

  const wrappersSorted = wrappers
    .map((w, domIndex) => ({
      el: w,
      orderValue: Number.parseInt(
        /** @type {HTMLElement} */ (w).style.order || `${domIndex * 2}`,
        10,
      ),
    }))
    .sort((a, b) => a.orderValue - b.orderValue)
    .map((x) => x.el);

  wrappersSorted.forEach((wrapper, index) => {
    const menu = /** @type {HTMLElement} */ (
      wrapper.querySelector('.iframe-menu')
    );
    if (menu) {
      menu.remove();
    }
    const newMenu = createIframeMenu(wrapper, index, wrappersSorted.length);
    wrapper.appendChild(newMenu);
  });

  updateCssOrder();
  updateUrlWithState();
};
