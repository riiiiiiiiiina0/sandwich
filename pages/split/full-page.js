const expandIframe = (iframeWrapper) => {
  iframeWrapper.classList.add('full-page');
  const parent = iframeWrapper.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children);
    for (const sibling of siblings) {
      if (sibling !== iframeWrapper) {
        sibling.style.display = 'none';
      }
    }
  }
};

const collapseIframe = (iframeWrapper) => {
  iframeWrapper.classList.remove('full-page');
  const parent = iframeWrapper.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children);
    for (const sibling of siblings) {
      if (sibling !== iframeWrapper) {
        sibling.style.display = '';
      }
    }
  }
};

const isFullPage = (iframeWrapper) => {
  return iframeWrapper.classList.contains('full-page');
};

export { expandIframe, collapseIframe, isFullPage };
