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

  const saJson = Buffer.from(saBase64, 'base64').toString('utf8');
  const serviceAccount = JSON.parse(saJson);

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  
  db = admin.firestore();
  console.log("✅ SISTEMA OPERACIONAL: Conectado ao Firebase!");
} catch (e) {
  console.error("❌ ERRO NO ARRANQUE:", e.message);
}

app.get('/', (req, res) => res.send('Servidor Online 🚀'));

// ROTA 1: NOVOS PEDIDOS DE TROCA
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
          notification: { title: 'Nova Troca de Turno 🔄', body: `${nome} solicitou uma troca contigo no MeuTurno.` },
          tokens: tokens
        });
      }
    }
    res.send('Notificação de pedido enviada');
  } catch (err) { res.status(500).send(err.message); }
});

// ROTA 2: STATUS DA TROCA (APROVADO/REPROVADO)
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
          notification: { title: `Troca ${status.toUpperCase()}`, body: `O teu pedido foi ${status}.` },
          tokens: tokens
        });
      }
    }
    res.send('Notificação de status enviada');
  } catch (err) { res.status(500).send(err.message); }
});

// ROTA 3: NOVOS AVISOS NO QUADRO (O QUE ESTAVA A DAR ERRO 404)
app.post('/aviso', async (req, res) => {
  if (!db) return res.status(500).send("Firebase Offline");
  try {
    const { titulo, texto } = req.body;
    
    // Procura todos os tokens de todos os utilizadores para o aviso geral
    const allTokensSnap = await db.collectionGroup('tokens').get();
    const tokens = [];
    allTokensSnap.forEach(t => tokens.push(t.data().token));

    if (tokens.length > 0) {
      // Remove tokens duplicados para não enviar várias vezes para o mesmo telemóvel
      const uniqueTokens = [...new Set(tokens)];
      
      await admin.messaging().sendEachForMulticast({
        notification: { title: titulo || 'Novo Aviso 📢', body: texto },
        tokens: uniqueTokens
      });
    }
    res.send('Notificação de aviso enviada');
  } catch (err) { res.status(500).send(err.message); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Porta: ${PORT}`));
