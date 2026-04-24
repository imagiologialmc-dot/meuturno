const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// INICIALIZAÇÃO SEGURA
try {
  const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!saRaw) throw new Error("Variável FIREBASE_SERVICE_ACCOUNT não encontrada!");

  // Corrige quebras de linha e limpa espaços extras
  const saClean = saRaw.trim().replace(/\\n/g, '\n');
  const serviceAccount = JSON.parse(saClean);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("✅ Conectado ao Firebase com sucesso!");
} catch (e) {
  console.error("❌ ERRO CRÍTICO NO FIREBASE:", e.message);
}

const db = admin.firestore();

app.get('/', (req, res) => res.send('Servidor Ativo!'));

app.post('/pedido', async (req, res) => {
  try {
    const { nome, colega_email } = req.body;
    const userSnap = await db.collection('Utilizadores').where('email', '==', colega_email).get();
    if (userSnap.empty) return res.status(404).send('Colega não encontrado');

    const tokensSnap = await db.collection('Utilizadores').doc(userSnap.docs[0].id).collection('tokens').get();
    const tokens = [];
    tokensSnap.forEach(t => tokens.push(t.data().token));

    if (tokens.length === 0) return res.send('Sem dispositivos');

    await admin.messaging().sendEachForMulticast({
      notification: { title: 'Nova Troca 🔄', body: `${nome} pediu uma troca.` },
      tokens: tokens
    });
    res.send('Notificado');
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/status', async (req, res) => {
  try {
    const { email, status } = req.body;
    const userSnap = await db.collection('Utilizadores').where('email', '==', email).get();
    if (userSnap.empty) return res.status(404).send('User não encontrado');

    const tokensSnap = await db.collection('Utilizadores').doc(userSnap.docs[0].id).collection('tokens').get();
    const tokens = [];
    tokensSnap.forEach(t => tokens.push(t.data().token));

    await admin.messaging().sendEachForMulticast({
      notification: { title: `Troca ${status}`, body: `O teu pedido foi ${status}.` },
      tokens: tokens
    });
    res.send('Status enviado');
  } catch (err) { res.status(500).send(err.message); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Porta: ${PORT}`));
