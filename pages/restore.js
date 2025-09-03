document.addEventListener('DOMContentLoaded', () => {
  const urlList = document.getElementById('url-list');
  const urlParams = new URLSearchParams(window.location.search);
  const urlsParam = urlParams.get('urls');

  if (urlsParam) {
    const urls = urlsParam.split(',').map((url) => decodeURIComponent(url));
    urls.forEach((url) => {
      const a = document.createElement('a');
      a.href = url;
      a.textContent = url;
      a.target = '_blank';
      a.className = 'text-blue-500 hover:underline';
      urlList.appendChild(a);
    });
  } else {
    const p = document.createElement('p');
    p.textContent = 'No tabs to recover.';
    urlList.appendChild(p);
  }
});
