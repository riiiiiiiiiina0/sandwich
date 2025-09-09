// Utilities for sizing panes and dividers so that panes + dividers = 100%
// Divider thickness is fixed to 4px (Tailwind w-1/h-1)

export const DIVIDER_THICKNESS_PX = 4;

/**
 * Count the number of dividers in the container.
 * @param {HTMLElement} container
 */
export function getDividerCount(container) {
  return container.querySelectorAll('.iframe-divider').length;
}

/**
 * Total divider thickness along the primary axis.
 * @param {HTMLElement} container
 */
export function getTotalDividerThicknessPx(container) {
  return getDividerCount(container) * DIVIDER_THICKNESS_PX;
}

/**
 * Read the ratio percent for a wrapper (0-100). Fallback to defaultPercent if missing.
 * @param {HTMLDivElement} wrapper
 * @param {number} defaultPercent
 */
export function getWrapperRatioPercent(wrapper, defaultPercent) {
  const ds = /** @type {HTMLElement} */ (wrapper).dataset;
  const raw = ds ? Number.parseFloat(ds.ratio || '') : NaN;
  if (Number.isFinite(raw) && raw > 0) return raw;
  return defaultPercent;
}

/**
 * Set the wrapper's primary size using CSS calc to account for divider pixels.
 * Also persists the ratio on dataset.
 * @param {HTMLDivElement} wrapper
 * @param {number} ratioPercent
 * @param {boolean} isVertical
 * @param {HTMLElement} container
 */
export function applyWrapperPrimarySize(
  wrapper,
  ratioPercent,
  isVertical,
  container,
) {
  const totalDividerPx = getTotalDividerThicknessPx(container);
  const ratioDecimal = Math.max(0, ratioPercent) / 100;
  const sizeExpr = `calc((100% - ${totalDividerPx}px) * ${ratioDecimal})`;

  /** @type {HTMLElement} */ (wrapper).dataset.ratio = String(ratioPercent);
  if (isVertical) {
    wrapper.style.height = sizeExpr;
    wrapper.style.width = '100%';
  } else {
    wrapper.style.width = sizeExpr;
    wrapper.style.height = '100%';
  }
}

/**
 * Recalculate sizes for all wrappers based on current ratios and divider count.
 * @param {HTMLDivElement} iframeContainer
 * @param {boolean} isVertical
 */
export function recalcAllWrapperSizes(container, isVertical) {
  const wrappers = /** @type {NodeListOf<HTMLDivElement>} */ (
    container.querySelectorAll('.iframe-wrapper')
  );
  const defaultPercent = wrappers.length > 0 ? 100 / wrappers.length : 100;
  wrappers.forEach((wrapper) => {
    const ratio = getWrapperRatioPercent(wrapper, defaultPercent);
    applyWrapperPrimarySize(wrapper, ratio, isVertical, container);
  });
}
