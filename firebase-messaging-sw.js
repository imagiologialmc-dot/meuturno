// ESCUTA MENSAGENS EM BACKGROUND
// Este código é o que faz a janela da notificação aparecer no telemóvel/PC
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Mensagem recebida em background:', payload);

  const notificationTitle = payload.notification.title || 'Novo Alerta MeuTurno';
  const notificationOptions = {
    body: payload.notification.body,
    icon: './icon-512.png', // Garante que o caminho do ícone está correto
    badge: './icon-512.png',
    vibrate: [200, 100, 200],
    data: {
      url: './index.html' // Para onde o utilizador vai ao clicar
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// AÇÃO AO CLICAR NA NOTIFICAÇÃO
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('./index.html');
    })
  );
});
