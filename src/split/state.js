// Centralized application state for split view

export const appState = {
  iframeContainer: /** @type {HTMLDivElement | null} */ (null),
  // layoutMode can be 'horizontal' | 'vertical' | 'grid'
  layoutMode: /** @type {'horizontal'|'vertical'|'grid'} */ ('horizontal'),
  // Grid split percentages (for 2x2): left column width and top row height
  gridColumnPercent: 50,
  gridRowPercent: 50,
  // Currently hovered/active iframe
  activeIframe: /** @type {HTMLIFrameElement | null} */ (null),
  setContainer(el) {
    this.iframeContainer = el;
  },
  getContainer() {
    if (!this.iframeContainer)
      throw new Error('iframeContainer not initialized');
    return this.iframeContainer;
  },
  setActiveIframe(iframe) {
    if (this.activeIframe !== iframe) {
      this.activeIframe = iframe;
    }
  },
  getActiveIframe() {
    return this.activeIframe;
  },
  // Back-compat APIs with prior boolean vertical state
  setVerticalLayout(isVertical) {
    this.layoutMode = isVertical ? 'vertical' : 'horizontal';
  },
  getIsVerticalLayout() {
    return this.layoutMode === 'vertical';
  },
  toggleVerticalLayout() {
    // Only toggles between horizontal and vertical
    if (this.layoutMode === 'vertical') this.layoutMode = 'horizontal';
    else this.layoutMode = 'vertical';
  },
  // New layout mode helpers
  setLayoutMode(mode) {
    if (mode === 'horizontal' || mode === 'vertical' || mode === 'grid') {
      this.layoutMode = mode;
    }
  },
  getLayoutMode() {
    return this.layoutMode;
  },
  getIsGridLayout() {
    return this.layoutMode === 'grid';
  },
  // Grid split setters/getters
  setGridColumnPercent(p) {
    const clamped = Math.max(5, Math.min(95, Number(p)));
    this.gridColumnPercent = clamped;
  },
  getGridColumnPercent() {
    return this.gridColumnPercent;
  },
  setGridRowPercent(p) {
    const clamped = Math.max(5, Math.min(95, Number(p)));
    this.gridRowPercent = clamped;
  },
  getGridRowPercent() {
    return this.gridRowPercent;
  },
};
