document.addEventListener('DOMContentLoaded', () => {
  const iframeContainer = /** @type {HTMLDivElement} */ (
    document.getElementById('iframe-container')
  );
  const urlParams = new URLSearchParams(window.location.search);
  const urlsParam = urlParams.get('urls');
  const ratiosParam = urlParams.get('ratios');
  const layoutParam = urlParams.get('layout');

  // Layout state - default to horizontal
  let isVerticalLayout = layoutParam === 'vertical';

  // Function to update URL with current order, ratios, and layout
  const updateUrlWithState = () => {
    const wrappers = /** @type {HTMLDivElement[]} */ (
      Array.from(document.querySelectorAll('.iframe-wrapper'))
    );

    // Sort wrappers by visual order (CSS order)
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

    const currentRatios = wrappersSorted.map((wrapper) => {
      if (isVerticalLayout) {
        return parseFloat(wrapper.style.height).toFixed(1);
      } else {
        return parseFloat(wrapper.style.width).toFixed(1);
      }
    });

    const currentUrls = wrappersSorted.map((wrapper) => {
      const iframe = /** @type {HTMLIFrameElement | null} */ (
        wrapper.querySelector('iframe')
      );
      if (!iframe) return '';
      const originalSrc = iframe.getAttribute('src');
      return originalSrc || iframe.src || '';
    });

    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set(
      'urls',
      currentUrls.map((u) => encodeURIComponent(u)).join(','),
    );
    newUrl.searchParams.set('ratios', currentRatios.join(','));
    newUrl.searchParams.set(
      'layout',
      isVerticalLayout ? 'vertical' : 'horizontal',
    );
    window.history.replaceState({}, '', newUrl.toString());
  };

  // Function to apply layout styles
  const applyLayout = () => {
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

    // Update wrapper dimensions - convert between width and height ratios
    wrappers.forEach((wrapper) => {
      if (isVerticalLayout) {
        // Convert width ratio to height ratio
        const widthRatio =
          parseFloat(wrapper.style.width) || 100 / wrappers.length;
        wrapper.style.height = `${widthRatio}%`;
        wrapper.style.width = '100%';
      } else {
        // Convert height ratio to width ratio
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

    // Keep CSS order values in sync after layout changes
    updateCssOrder();
  };

  // Function to toggle layout
  const toggleLayout = () => {
    isVerticalLayout = !isVerticalLayout;
    applyLayout();
    updateButtonLabels();
    updateUrlWithState();
  };

  // Function to create iframe menu
  const createIframeMenu = (iframeWrapper, index, totalCount) => {
    const menu = document.createElement('div');
    menu.className =
      'iframe-menu absolute top-0 left-0 bg-white border border-gray-300 rounded-br-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 flex gap-[2px] p-[2px] pointer-events-auto';

    // Layout toggle button
    const layoutBtn = document.createElement('button');
    layoutBtn.className =
      'btn btn-xs btn-ghost hover:btn-primary min-w-6 h-6 text-xs leading-none';
    layoutBtn.innerText = isVerticalLayout ? '↔️' : '↕️';
    layoutBtn.title = isVerticalLayout
      ? 'Horizontal layout'
      : 'Vertical layout';
    layoutBtn.addEventListener('click', toggleLayout);
    menu.appendChild(layoutBtn);

    // Move left/up button
    if (index > 0) {
      const moveLeftBtn = document.createElement('button');
      moveLeftBtn.className =
        'btn btn-xs btn-ghost hover:btn-primary min-w-6 h-6 text-xs leading-none';
      moveLeftBtn.innerText = isVerticalLayout ? '⬆️' : '⬅️';
      moveLeftBtn.title = isVerticalLayout ? 'Move up' : 'Move left';
      moveLeftBtn.addEventListener('click', () => moveIframe(index, -1));
      menu.appendChild(moveLeftBtn);
    }

    // Move right/down button
    if (index < totalCount - 1) {
      const moveRightBtn = document.createElement('button');
      moveRightBtn.className =
        'btn btn-xs btn-ghost hover:btn-primary min-w-6 h-6 text-xs leading-none';
      moveRightBtn.innerText = isVerticalLayout ? '⬇️' : '➡️';
      moveRightBtn.title = isVerticalLayout ? 'Move down' : 'Move right';
      moveRightBtn.addEventListener('click', () => moveIframe(index, 1));
      menu.appendChild(moveRightBtn);
    }

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className =
      'btn btn-xs btn-ghost hover:btn-error min-w-6 h-6 text-xs leading-none';
    removeBtn.innerText = '❌';
    removeBtn.title = 'Remove';
    removeBtn.addEventListener('click', () => removeIframe(index));
    menu.appendChild(removeBtn);

    return menu;
  };

  // Function to move iframe without reloading (swap CSS order values only)
  const moveIframe = (fromIndex, direction) => {
    const wrappers = /** @type {HTMLDivElement[]} */ (
      Array.from(iframeContainer.querySelectorAll('.iframe-wrapper'))
    );

    // Determine visual order from CSS order
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

    const toIndex = fromIndex + direction;
    if (
      toIndex < 0 ||
      toIndex >= wrappersSorted.length ||
      toIndex === fromIndex
    ) {
      return;
    }

    const fromWrapper = wrappersSorted[fromIndex];
    const toWrapper = wrappersSorted[toIndex];

    const fromOrder = Number.parseInt(
      /** @type {HTMLElement} */ (fromWrapper).style.order ||
        `${fromIndex * 2}`,
      10,
    );
    const toOrder = Number.parseInt(
      /** @type {HTMLElement} */ (toWrapper).style.order || `${toIndex * 2}`,
      10,
    );

    // Swap their order values
    /** @type {HTMLElement} */ (fromWrapper).style.order = String(toOrder);
    /** @type {HTMLElement} */ (toWrapper).style.order = String(fromOrder);

    // Normalize orders and dividers
    updateCssOrder();

    // Refresh menus and URL state
    rebuildInterface();
  };

  // Function to remove iframe
  const removeIframe = (index) => {
    const wrappers = Array.from(iframeContainer.children).filter((child) =>
      child.classList.contains('iframe-wrapper'),
    );

    if (wrappers.length <= 1) return; // Don't remove if it's the last one

    const wrapperToRemove = wrappers[index];
    if (wrapperToRemove) {
      // Remove the wrapper and its following divider if it exists
      const nextSibling = wrapperToRemove.nextSibling;
      wrapperToRemove.remove();
      if (
        nextSibling &&
        /** @type {HTMLElement} */ (nextSibling).classList.contains(
          'iframe-divider',
        )
      ) {
        nextSibling.remove();
      }

      // If we removed the first item and there's still a divider at the beginning, remove it
      const firstChild = iframeContainer.firstChild;
      if (
        firstChild &&
        /** @type {HTMLElement} */ (firstChild).classList.contains(
          'iframe-divider',
        )
      ) {
        firstChild.remove();
      }

      // Redistribute sizes
      const remainingWrappers = document.querySelectorAll('.iframe-wrapper');
      const newRatio = 100 / remainingWrappers.length;
      remainingWrappers.forEach((wrapper) => {
        if (isVerticalLayout) {
          /** @type {HTMLElement} */ (wrapper).style.height = `${newRatio}%`;
        } else {
          /** @type {HTMLElement} */ (wrapper).style.width = `${newRatio}%`;
        }
      });

      // Rebuild the interface
      rebuildInterface();
    }
  };

  // Function to rebuild the interface
  const rebuildInterface = () => {
    const wrappers = Array.from(iframeContainer.children).filter((child) =>
      child.classList.contains('iframe-wrapper'),
    );

    // Build in visual order so button indices match what user sees
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

    // Update menu buttons for all wrappers
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

    // Normalize CSS order values to reflect current visual order
    updateCssOrder();

    updateUrlWithState();
  };

  // Ensure CSS order reflects current visual order
  const updateCssOrder = () => {
    const wrappers = /** @type {HTMLDivElement[]} */ (
      Array.from(iframeContainer.querySelectorAll('.iframe-wrapper'))
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
      /** @type {HTMLElement} */ (wrapper).style.order = String(index * 2);
    });

    const dividers = /** @type {HTMLDivElement[]} */ (
      Array.from(iframeContainer.querySelectorAll('.iframe-divider'))
    );
    dividers.forEach((divider, index) => {
      /** @type {HTMLElement} */ (divider).style.order = String(index * 2 + 1);
    });
  };

  // Function to add drag functionality to a divider
  const addDividerDragFunctionality = (divider) => {
    let isDragging = false;
    let startPosition = 0;
    let startSizes = [];
    let dragState = null;

    const handleMouseMove = (e) => {
      if (!isDragging || !dragState) return;

      // Prevent default to avoid any browser interference
      e.preventDefault();

      const currentPosition = isVerticalLayout ? e.clientY : e.clientX;
      const delta = currentPosition - startPosition;
      const containerSize = isVerticalLayout
        ? iframeContainer.clientHeight
        : iframeContainer.clientWidth;
      const deltaPercentage = (delta / containerSize) * 100;

      const { leftWrapper, rightWrapper, leftIndex, rightIndex } = dragState;

      if (leftWrapper && rightWrapper) {
        const newLeftSize = startSizes[leftIndex] + deltaPercentage;
        const newRightSize = startSizes[rightIndex] - deltaPercentage;

        // Ensure minimum and maximum sizes
        const minSize = 5;
        const maxLeftSize =
          startSizes[leftIndex] + startSizes[rightIndex] - minSize;
        const maxRightSize =
          startSizes[leftIndex] + startSizes[rightIndex] - minSize;

        // Clamp values to prevent going beyond boundaries
        const clampedLeftSize = Math.max(
          minSize,
          Math.min(maxLeftSize, newLeftSize),
        );
        const clampedRightSize = Math.max(
          minSize,
          Math.min(maxRightSize, newRightSize),
        );

        // Ensure total size remains constant
        const totalSize = clampedLeftSize + clampedRightSize;
        const expectedTotal = startSizes[leftIndex] + startSizes[rightIndex];

        if (Math.abs(totalSize - expectedTotal) < 0.1) {
          if (isVerticalLayout) {
            leftWrapper.style.height = `${clampedLeftSize}%`;
            rightWrapper.style.height = `${clampedRightSize}%`;
          } else {
            leftWrapper.style.width = `${clampedLeftSize}%`;
            rightWrapper.style.width = `${clampedRightSize}%`;
          }
        }
      }
    };

    const handleMouseUp = (e) => {
      if (isDragging) {
        isDragging = false;
        dragState = null;

        // Restore styles
        document.body.style.userSelect = '';
        document.body.style.cursor = '';

        // Re-enable pointer events on iframes
        const iframes = /** @type {NodeListOf<HTMLIFrameElement>} */ (
          document.querySelectorAll('.resizable-iframe')
        );
        iframes.forEach((iframe) => {
          iframe.style.pointerEvents = 'auto';
        });

        // Release mouse capture (IE legacy support)
        if (
          'releaseCapture' in divider &&
          typeof divider.releaseCapture === 'function'
        ) {
          divider.releaseCapture();
        }

        // Update URL with new ratios
        updateUrlWithState();

        // Remove event listeners
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('mouseleave', handleMouseUp);
      }
    };

    divider.addEventListener('mousedown', (e) => {
      // Prevent default to avoid text selection
      e.preventDefault();

      isDragging = true;
      startPosition = isVerticalLayout ? e.clientY : e.clientX;

      // Determine visual order and sizes of wrappers
      const wrappers = /** @type {HTMLDivElement[]} */ (
        Array.from(iframeContainer.querySelectorAll('.iframe-wrapper'))
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

      startSizes = wrappersSorted.map((wrapper) => {
        if (isVerticalLayout) {
          return parseFloat(wrapper.style.height);
        } else {
          return parseFloat(wrapper.style.width);
        }
      });

      // Adjacent wrappers are determined by this divider's CSS order
      const dividerOrder = Number.parseInt(
        /** @type {HTMLElement} */ (divider).style.order || '1',
        10,
      );
      const leftIndex = Math.max(0, Math.floor((dividerOrder - 1) / 2));
      const rightIndex = Math.min(wrappersSorted.length - 1, leftIndex + 1);

      dragState = {
        leftWrapper: wrappersSorted[leftIndex],
        rightWrapper: wrappersSorted[rightIndex],
        leftIndex,
        rightIndex,
      };

      // Prevent text selection and iframe interaction during drag
      document.body.style.userSelect = 'none';
      document.body.style.cursor = isVerticalLayout
        ? 'row-resize'
        : 'col-resize';

      // Disable pointer events on iframes to prevent interference
      const iframes = /** @type {NodeListOf<HTMLIFrameElement>} */ (
        document.querySelectorAll('.resizable-iframe')
      );
      iframes.forEach((iframe) => {
        iframe.style.pointerEvents = 'none';
      });

      // Capture mouse to handle fast movements (IE legacy support)
      if ('setCapture' in divider && typeof divider.setCapture === 'function') {
        divider.setCapture();
      }

      // Add event listeners to document for better capture
      document.addEventListener('mousemove', handleMouseMove, {
        passive: false,
      });
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('mouseleave', handleMouseUp);
    });
  };

  // Function to update button labels in existing menus
  const updateButtonLabels = () => {
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
        ); // Second to last

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

  if (urlsParam) {
    const urls = urlsParam.split(',').map((url) => decodeURIComponent(url));
    const numIframes = urls.length;

    // Parse ratios or default to equal distribution
    let ratios;
    if (ratiosParam) {
      ratios = ratiosParam.split(',').map((ratio) => parseFloat(ratio));
      // Validate ratios - they should sum to 100 and be positive
      const totalRatio = ratios.reduce((sum, ratio) => sum + ratio, 0);
      if (
        ratios.length !== numIframes ||
        Math.abs(totalRatio - 100) > 0.1 ||
        ratios.some((ratio) => ratio <= 0)
      ) {
        // Invalid ratios, fall back to equal distribution
        ratios = Array(numIframes).fill(100 / numIframes);
      }
    } else {
      ratios = Array(numIframes).fill(100 / numIframes);
    }

    // Apply initial layout
    applyLayout();

    urls.forEach((url, index) => {
      // Create iframe wrapper
      const iframeWrapper = document.createElement('div');
      iframeWrapper.className =
        'iframe-wrapper group relative flex-shrink-0 flex-grow-0';
      /** @type {HTMLElement} */ (iframeWrapper).style.order = String(
        index * 2,
      );
      if (isVerticalLayout) {
        iframeWrapper.style.height = `${ratios[index]}%`;
        iframeWrapper.style.width = '100%';
      } else {
        iframeWrapper.style.width = `${ratios[index]}%`;
        iframeWrapper.style.height = '100%';
      }

      // Create iframe
      const iframe = /** @type {HTMLIFrameElement} */ (
        document.createElement('iframe')
      );
      iframe.src = url;
      iframe.setAttribute(
        'sandbox',
        'allow-same-origin allow-scripts allow-forms allow-popups',
      );
      iframe.setAttribute('allow', 'fullscreen');
      if (isVerticalLayout) {
        iframe.style.height = '100%';
        iframe.style.width = '100%';
        iframe.className =
          'resizable-iframe w-full h-full border border-gray-300 box-border rounded-lg pointer-events-auto flex-shrink-0 flex-grow-0';
      } else {
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.className =
          'resizable-iframe h-full w-full border border-gray-300 box-border rounded-lg pointer-events-auto flex-shrink-0 flex-grow-0';
      }

      iframeWrapper.appendChild(iframe);

      // Create hover menu
      const menu = createIframeMenu(iframeWrapper, index, urls.length);
      iframeWrapper.appendChild(menu);

      iframeContainer.appendChild(iframeWrapper);

      // Add divider after iframe wrapper (except for the last one)
      if (index < urls.length - 1) {
        const divider = document.createElement('div');
        divider.className = 'iframe-divider';
        if (isVerticalLayout) {
          divider.className +=
            ' m-0 p-0 h-1 w-full cursor-row-resize min-h-1 relative flex-shrink-0 flex-grow-0';
        } else {
          divider.className +=
            ' m-0 p-0 w-1 h-full cursor-col-resize min-w-1 relative flex-shrink-0 flex-grow-0';
        }
        /** @type {HTMLElement} */ (divider).style.order = String(
          index * 2 + 1,
        );
        iframeContainer.appendChild(divider);

        // Add drag functionality
        addDividerDragFunctionality(divider);
      }
    });
  }
});
