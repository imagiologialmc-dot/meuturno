const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let db;

try {
  const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!saRaw) throw new Error("Falta variável de ambiente");

  // Remove quebras de linha reais e limpa a string
  const saClean = saRaw.replace(/[\r\n]+/g, " ").trim();
  const serviceAccount = JSON.parse(saClean);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  db = admin.firestore();
  console.log("✅ Conectado ao Firebase!");
} catch (e) {
  console.error("❌ Erro no Firebase:", e.message);
}

app.get('/', (req, res) => res.send('Servidor Online'));

app.post('/pedido', async (req, res) => {
  if (!db) return res.status(500).send("Firebase não inicializado");
  try {
    const { nome, colega_email } = req.body;
    const userSnap = await db.collection('Utilizadores').where('email', '==', colega_email).get();
    if (userSnap.empty) return res.status(404).send('Colega não encontrado');

    const tokensSnap = await db.collection('Utilizadores').doc(userSnap.docs[0].id).collection('tokens').get();
    const tokens = [];
    tokensSnap.forEach(t => tokens.push(t.data().token));

    if (tokens.length > 0) {
      await admin.messaging().sendEachForMulticast({
        notification: { title: 'Nova Troca 🔄', body: `${nome} pediu uma troca.` },
        tokens: tokens
      });
    }
    res.send('Processado');
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/status', async (req, res) => {
  if (!db) return res.status(500).send("Firebase não inicializado");
  try {
    const { email, status } = req.body;
    const userSnap = await db.collection('Utilizadores').where('email', '==', email).get();
    if (userSnap.empty) return res.status(404).send('User não encontrado');

    const tokensSnap = await db.collection('Utilizadores').doc(userSnap.docs[0].id).collection('tokens').get();
    const tokens = [];
    tokensSnap.forEach(t => tokens.push(t.data().token));

    if (tokens.length > 0) {
      await admin.messaging().sendEachForMulticast({
        notification: { title: `Troca ${status}`, body: `O teu pedido foi ${status}.` },
        tokens: tokens
      });
    }
    res.send('Status enviado');
  } catch (err) { res.status(500).send(err.message); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Online na porta ${PORT}`));
