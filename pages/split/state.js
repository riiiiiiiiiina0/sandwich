// Centralized application state for split view

export const appState = {
  iframeContainer: /** @type {HTMLDivElement | null} */ (null),
  layout: /** @type {'horizontal' | 'vertical' | 'grid'} */ ('horizontal'),
  preLayout: /** @type {'horizontal' | 'vertical' | 'grid' | null} */ (null),
  setContainer(el) {
    this.iframeContainer = el;
  },
  getContainer() {
    if (!this.iframeContainer)
      throw new Error('iframeContainer not initialized');
    return this.iframeContainer;
  },
  setLayout(layout) {
    this.preLayout = this.layout;
    this.layout = layout;
  },
  getLayout() {
    return this.layout;
  },
  getPreLayout() {
    return this.preLayout;
  },
  getIsVerticalLayout() {
    return this.layout === 'vertical';
  },
};
