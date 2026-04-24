const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let db;

try {
  const saBase64 = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!saBase64) throw new Error("Falta variável de ambiente");

  // Descodifica de Base64 para texto original
  const saJson = Buffer.from(saBase64, 'base64').toString('utf8');
  const serviceAccount = JSON.parse(saJson);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  db = admin.firestore();
  console.log("✅ SISTEMA OPERACIONAL: Conectado ao Firebase!");
} catch (e) {
  console.error("❌ ERRO NO ARRANQUE:", e.message);
}

app.get('/', (req, res) => res.send('Servidor Online 🚀'));

app.post('/pedido', async (req, res) => {
  if (!db) return res.status(500).send("Firebase Offline");
  try {
    const { nome, colega_email } = req.body;
    const userSnap = await db.collection('Utilizadores').where('email', '==', colega_email).get();
    
    if (!userSnap.empty) {
      const tokensSnap = await db.collection('Utilizadores').doc(userSnap.docs[0].id).collection('tokens').get();
      const tokens = [];
      tokensSnap.forEach(t => tokens.push(t.data().token));

      if (tokens.length > 0) {
        await admin.messaging().sendEachForMulticast({
          notification: { title: 'Nova Troca 🔄', body: `${nome} pediu uma troca.` },
          tokens: tokens
        });
      }
    }
    res.send('Processado');
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/status', async (req, res) => {
  if (!db) return res.status(500).send("Firebase Offline");
  try {
    const { email, status } = req.body;
    const userSnap = await db.collection('Utilizadores').where('email', '==', email).get();
    
    if (!userSnap.empty) {
      const tokensSnap = await db.collection('Utilizadores').doc(userSnap.docs[0].id).collection('tokens').get();
      const tokens = [];
      tokensSnap.forEach(t => tokens.push(t.data().token));

      if (tokens.length > 0) {
        await admin.messaging().sendEachForMulticast({
          notification: { title: `Troca ${status}`, body: `O teu pedido foi ${status}.` },
          tokens: tokens
        });
      }
    }
    res.send('Status enviado');
  } catch (err) { res.status(500).send(err.message); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Porta: ${PORT}`));
