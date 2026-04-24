const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// CONFIGURAÇÃO REFORÇADA PARA EVITAR ERROS DE FORMATAÇÃO NO RENDER
try {
  let serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

  // Se a conta de serviço vier como string, tentamos converter e corrigir os \n
  if (typeof serviceAccount === 'string') {
    serviceAccount = JSON.parse(serviceAccount.replace(/\\n/g, '\n'));
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("✅ Firebase Admin inicializado com sucesso!");
} catch (error) {
  console.error("❌ Erro ao inicializar Firebase Admin:", error.message);
}

const db = admin.firestore();

// ROTA PARA NOVOS PEDIDOS
app.post('/pedido', async (req, res) => {
  const { nome, colega_email } = req.body;
  try {
    const userSnap = await db.collection('Utilizadores').where('email', '==', colega_email).get();
    if (userSnap.empty) return res.status(404).send('Colega não encontrado');

    const userId = userSnap.docs[0].id;
    const tokensSnap = await db.collection('Utilizadores').doc(userId).collection('tokens').get();
    
    const tokens = [];
    tokensSnap.forEach(t => tokens.push(t.data().token));

    if (tokens.length === 0) return res.status(200).send('Sem tokens registados para este colega');

    const message = {
      notification: {
        title: 'Nova Proposta de Troca 🔄',
        body: `${nome} solicitou uma troca de turno contigo.`
      },
      tokens: tokens
    };

    await admin.messaging().sendEachForMulticast(message);
    res.status(200).send('Notificações enviadas');
  } catch (e) { 
    console.error("Erro na rota /pedido:", e.message);
    res.status(500).send(e.message); 
  }
});

// ROTA PARA STATUS (APROVADO/REPROVADO)
app.post('/status', async (req, res) => {
  const { email, status } = req.body;
  try {
    const userSnap = await db.collection('Utilizadores').where('email', '==', email).get();
    if (userSnap.empty) return res.status(404).send('Utilizador não encontrado');

    const userId = userSnap.docs[0].id;
    const tokensSnap = await db.collection('Utilizadores').doc(userId).collection('tokens').get();
    
    const tokens = [];
    tokensSnap.forEach(t => tokens.push(t.data().token));

    const message = {
      notification: {
        title: `Troca de Turno: ${status.toUpperCase()}`,
        body: `O teu pedido de troca foi ${status} pela coordenação.`
      },
      tokens: tokens
    };

    await admin.messaging().sendEachForMulticast(message);
    res.status(200).send('Notificação de status enviada');
  } catch (e) { 
    console.error("Erro na rota /status:", e.message);
    res.status(500).send(e.message); 
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Servidor pronto na porta ${PORT}`));
