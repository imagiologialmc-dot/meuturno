importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");
firebase.initializeApp({apiKey:"AIzaSyDnQ5fQFmx1-48lJwcaJhSKq2Y8MAaNAcY",authDomain:"meuturno-d7d1a.firebaseapp.com",projectId:"meuturno-d7d1a",storageBucket:"meuturno-d7d1a.firebasestorage.app",messagingSenderId:"634840990788",appId:"1:634840990788:web:3b7b0e8d1d051959d86811"});
const messaging = firebase.messaging();
messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || "MeuTurno";
  const options = { body: payload.notification?.body || "Tens uma nova notificação.", icon: "/meuturno/icon-192.png" };
  self.registration.showNotification(title, options);
});
