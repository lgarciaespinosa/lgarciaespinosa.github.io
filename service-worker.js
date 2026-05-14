const CACHE_NAME = '2048-v1';
const ASSETS = [
  './',
  './index.html',
  './style/main.css',
  './style/fonts/clear-sans.css',
  './style/fonts/ClearSans-Bold-webfont.woff',
  './style/fonts/ClearSans-Light-webfont.woff',
  './style/fonts/ClearSans-Regular-webfont.woff',
  './js/animframe_polyfill.js',
  './js/application.js',
  './js/bind_polyfill.js',
  './js/classlist_polyfill.js',
  './js/game_manager.js',
  './js/grid.js',
  './js/html_actuator.js',
  './js/keyboard_input_manager.js',
  './js/local_storage_manager.js',
  './js/tile.js',
  './favicon.ico',
  './meta/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
