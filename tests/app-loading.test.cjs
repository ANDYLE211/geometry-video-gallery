const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const VideoOrder = require('../assets/video-order.js');
const source = fs.readFileSync(require.resolve('../assets/app.js'), 'utf8');

function dataRequest(scriptUrl, pageUrl) {
  const requests = [];
  const element = () => ({ addEventListener() {}, prepend() {} });
  const context = {
    URL, URLSearchParams,
    window: { VideoOrder, addEventListener() {} },
    document: { currentScript: { src: scriptUrl }, baseURI: pageUrl,
      querySelector: element, createElement: element },
    fetch(url, options) { requests.push({ url: String(url), options }); return new Promise(() => {}); }
  };
  vm.runInNewContext(source, context);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.cache, 'no-store');
  return requests[0].url;
}

assert.equal(dataRequest('https://example.com/gallery/assets/app.js?v=release123',
  'https://example.com/gallery/?v=page123#works'),
  'https://example.com/gallery/data/videos.json?v=release123');
console.log('PASS deployed data request uses the script release and preserves the project subpath');

assert.equal(dataRequest('http://127.0.0.1:8080/assets/app.js',
  'http://127.0.0.1:8080/?edit=1#works'), 'http://127.0.0.1:8080/data/videos.json');
console.log('PASS local editing still loads the unversioned source data');
