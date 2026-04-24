importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDnQ5fQFmx1-48lJwcaJhSKq2Y8MAaNAcY",
  projectId: "meuturno-d7d1a",
  messagingSenderId: "634840990788",
  appId: "1:634840990788:web:3b7b0e8d1d051959d86811"
});

const messaging = firebase.messaging();

// MODO OFFLINE (CACHING)
const CACHE_NAME = 'meuturno-v2-cache';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-512.png',
  './Hlogo.png',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0..1,0'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Tenta sempre ir buscar à net (para estar atualizado). Se não houver net, usa a memória (Offline).
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
