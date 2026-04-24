const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let db;

// INICIALIZAÇÃO BLINDADA (BASE64)
try {
  const saBase64 = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!saBase64) throw new Error("Variável FIREBASE_SERVICE_ACCOUNT não encontrada no Render!");

  // Converte de Base64 para String e depois para Objeto JSON
  const saJson = Buffer.from(saBase64, 'base64').toString('utf8');
  const serviceAccount = JSON.parse(saJson);

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  
  db = admin.firestore();
  console.log("✅ SERVIDOR CONECTADO AO FIREBASE!");
} catch (e) {
  console.error("❌ ERRO CRÍTICO:", e.message);
}

app.get('/', (req, res) => res.send('Servidor Ativo 🚀'));

app.post('/pedido', async (req, res) => {
  if (!db) return res.status(500).send("Erro: Firebase não carregou.");
  try {
    const { nome, colega_email } = req.body;
    // Procura o colega pelo email
    const userSnap = await db.collection('Utilizadores').where('email', '==', colega_email).get();
    
    if (userSnap.empty) return res.status(404).send('Colega não encontrado');

    const userId = userSnap.docs[0].id;
    const tokensSnap = await db.collection('Utilizadores').doc(userId).collection('tokens').get();
    
    const tokens = [];
    tokensSnap.forEach(t => tokens.push(t.data().token));

    if (tokens.length === 0) return res.send('O colega não tem notificações ativas.');

    const message = {
      notification: {
        title: 'Nova Troca de Turno 🔄',
        body: `${nome} solicitou uma troca contigo no MeuTurno.`
      },
      tokens: tokens
    };

    await admin.messaging().sendEachForMulticast(message);
    res.send('Notificação enviada com sucesso!');
  } catch (err) {
    console.error("Erro na rota /pedido:", err.message);
    res.status(500).send(err.message);
  }
});

app.post('/status', async (req, res) => {
  if (!db) return res.status(500).send("Erro: Firebase não carregou.");
  try {
    const { email, status } = req.body;
    const userSnap = await db.collection('Utilizadores').where('email', '==', email).get();
    
    if (userSnap.empty) return res.status(404).send('Utilizador não encontrado');

    const userId = userSnap.docs[0].id;
    const tokensSnap = await db.collection('Utilizadores').doc(userId).collection('tokens').get();
    
    const tokens = [];
    tokensSnap.forEach(t => tokens.push(t.data().token));

    if (tokens.length === 0) return res.send('Utilizador sem tokens.');

    const message = {
      notification: {
        title: `Troca ${status.toUpperCase()}`,
        body: `O teu pedido de troca foi ${status} pela coordenação.`
      },
      tokens: tokens
    };

    await admin.messaging().sendEachForMulticast(message);
    res.send('Notificação de status enviada!');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Servidor a rodar na porta ${PORT}`));
