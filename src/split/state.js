// Centralized application state for split view

export const appState = {
  iframeContainer: /** @type {HTMLDivElement | null} */ (null),
  isVerticalLayout: false,
  setContainer(el) {
    this.iframeContainer = el;
  },
  getContainer() {
    if (!this.iframeContainer)
      throw new Error('iframeContainer not initialized');
    return this.iframeContainer;
  },
  setVerticalLayout(isVertical) {
    this.isVerticalLayout = Boolean(isVertical);
  },
  getIsVerticalLayout() {
    return this.isVerticalLayout;
  },
  toggleVerticalLayout() {
    this.isVerticalLayout = !this.isVerticalLayout;
  },
};
