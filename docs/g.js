// extension id
let extensionId = '';
if ('chrome' in window && chrome.runtime?.id) {
  extensionId = chrome.runtime.id;
} else if (window['__SANDWICH_BEAR_EXTENSION_ID']) {
  extensionId = window['__SANDWICH_BEAR_EXTENSION_ID'];
}
console.log('extensionId:', extensionId);

// get urls and titles from url search params (prefer single JSON `state`)
const search = new URLSearchParams(location.search);
const stateParam = search.get('state') || '{}';
const {
  urls = [],
  ratios = [],
  layout = 'horizontal',
  titles = [],
} = JSON.parse(stateParam);
console.log('data:', { urls, layout, titles, ratios });

// Check if extension is installed
if (urls.length > 0 && extensionId) {
  const state = { urls, ratios, layout, titles };
  const params = new URLSearchParams();
  params.set('state', JSON.stringify(state));
  const splitPageUrl = `chrome-extension://${extensionId}/src/split.html?${params.toString()}`;
  console.log('splitPageUrl:', splitPageUrl);
  location.href = splitPageUrl;
}
