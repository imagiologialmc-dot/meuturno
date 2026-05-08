importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Configuração idêntica ao seu index.html
firebase.initializeApp({
  apiKey: "AIzaSyDnQ5fQFmx1-48lJwcaJhSKq2Y8MAaNAcY",
  projectId: "meuturno-d7d1a",
  messagingSenderId: "634840990788",
  appId: "1:634840990788:web:3b7b0e8d1d051959d86811"
});

const messaging = firebase.messaging();

// Exibe a notificação quando a app está em segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Notificação recebida em background:', payload);
  
  const notificationTitle = payload.notification.title || 'Alerta MeuTurno';
  const notificationOptions = {
    body: payload.notification.body,
    icon: './icon-512.png',
    badge: './icon-512.png',
    vibrate: [200, 100, 200],
    tag: 'alerta-geral', // Agrupa notificações para não encher o ecrã
    data: {
      url: './' // Define para onde ir ao clicar
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// LÓGICA DE CLIQUE: Abre a app ao clicar na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Fecha a notificação

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se a app já estiver aberta, foca nela
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Se estiver fechada, abre uma nova janela
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});

// CACHING E INSTALAÇÃO (v2.1 para forçar atualização no telemóvel)
const CACHE_NAME = 'meuturno-v2.1-cache';
const urlsToCache = ['./', './index.html', './manifest.json', './icon-512.png'];

self.addEventListener('install', event => {
  self.skipWaiting(); // Força o novo SW a assumir o controlo imediatamente
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
