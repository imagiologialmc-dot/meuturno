const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// CONFIGURAÇÃO DO FIREBASE ADMIN
// No Render, vais colocar a tua chave JSON numa variável de ambiente chamada FIREBASE_SERVICE_ACCOUNT
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ROTA 1: NOTIFICAÇÃO DE NOVO PEDIDO DE TROCA
app.post('/pedido', async (req, res) => {
  const { nome, colega_email } = req.body;
  try {
    const userSnap = await db.collection('Utilizadores').where('email', '==', colega_email).get();
    if (userSnap.empty) return res.status(404).send('Colega não encontrado');

    const userId = userSnap.docs[0].id;
    const tokensSnap = await db.collection('Utilizadores').doc(userId).collection('tokens').get();
    
    const tokens = [];
    tokensSnap.forEach(t => tokens.push(t.data().token));

    if (tokens.length === 0) return res.status(200).send('Sem tokens');

    const message = {
      notification: {
        title: 'Nova Proposta de Troca 🔄',
        body: `${nome} enviou-te um pedido de troca.`
      },
      tokens: tokens
    };

    await admin.messaging().sendEachForMulticast(message);
    res.status(200).send('Notificado');
  } catch (e) { res.status(500).send(e.message); }
});

// ROTA 2: NOTIFICAÇÃO DE STATUS (APROVADO/REPROVADO)
app.post('/status', async (req, res) => {
  const { email, status } = req.body;
  try {
    const userSnap = await db.collection('Utilizadores').where('email', '==', email).get();
    if (userSnap.empty) return res.status(404).send('User não encontrado');

    const userId = userSnap.docs[0].id;
    const tokensSnap = await db.collection('Utilizadores').doc(userId).collection('tokens').get();
    
    const tokens = [];
    tokensSnap.forEach(t => tokens.push(t.data().token));

    const message = {
      notification: {
        title: `Pedido de Troca: ${status.toUpperCase()}`,
        body: `A coordenação marcou o teu pedido como ${status}.`
      },
      tokens: tokens
    };

    await admin.messaging().sendEachForMulticast(message);
    res.status(200).send('Notificado');
  } catch (e) { res.status(500).send(e.message); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor a correr na porta ${PORT}`));
