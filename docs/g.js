// extension id
let extensionId = '';
if ('chrome' in window && chrome.runtime?.id) {
  extensionId = chrome.runtime.id;
} else if (window['__SANDWICH_BEAR_EXTENSION_ID']) {
  extensionId = window['__SANDWICH_BEAR_EXTENSION_ID'];
}

// get urls and titles from url search params (prefer single JSON `state`)
const search = new URLSearchParams(location.search);
const stateParam = search.get('state') || '{}';
const {
  urls = [],
  ratios = [],
  layout = 'horizontal',
  titles = [],
} = JSON.parse(stateParam);

// Check if extension is installed
if (urls.length > 0 && extensionId) {
  const state = { urls, ratios, layout, titles };
  const params = new URLSearchParams();
  params.set('state', JSON.stringify(state));
  const splitPageUrl = `chrome-extension://${extensionId}/src/split.html?${params.toString()}`;
  location.href = splitPageUrl;
}
