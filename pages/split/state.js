// Centralized application state for split view

export const appState = {
  iframeContainer: /** @type {HTMLDivElement | null} */ (null),
  layoutMode: 'horizontal', // 'horizontal', 'vertical', 'grid'
  setContainer(el) {
    this.iframeContainer = el;
  },
  getContainer() {
    if (!this.iframeContainer)
      throw new Error('iframeContainer not initialized');
    return this.iframeContainer;
  },
  setLayoutMode(mode) {
    if (['horizontal', 'vertical', 'grid'].includes(mode)) {
      this.layoutMode = mode;
    } else {
      console.error('Invalid layout mode:', mode);
    }
  },
  getLayoutMode() {
    return this.layoutMode;
  },
  toggleLayout() {
    if (this.layoutMode === 'horizontal') {
      this.layoutMode = 'vertical';
    } else {
      this.layoutMode = 'horizontal';
    }
  },
};
