import { appState } from './state.js';

export const updateCssOrder = () => {
  const iframeContainer = appState.getContainer();
  if (!iframeContainer) return;

  let order = 0;
  for (const child of iframeContainer.children) {
    const htmlChild = /** @type {HTMLElement} */ (child);
    if (
      htmlChild.classList.contains('iframe-wrapper') ||
      htmlChild.classList.contains('iframe-divider')
    ) {
      htmlChild.style.order = String(order++);
    }
  }
};
