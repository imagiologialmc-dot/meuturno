const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
});

const db = admin.firestore();

const ADMIN_EMAILS = [
  'carlos.martins@alivasaude.com',
  'ana.baiao@alivasaude.com'
];

async function getTokensByRoles(roles) {
  const snap = await db.collection('Utilizadores').where('role', 'in', roles).get();
  const tokens = [];

  for (const userDoc of snap.docs) {
    const tokenSnap = await userDoc.ref.collection('tokens').get();
    tokenSnap.forEach(t => {
      const token = t.data().token;
      if (token) tokens.push(token);
    });
  }

  return [...new Set(tokens)];
}

async function getTokensByEmails(emails) {
  const clean = [...new Set((emails || []).filter(Boolean))];
  if (!clean.length) return [];

  const snap = await db.collection('Utilizadores').where('email', 'in', clean).get();
  const tokens = [];

  for (const userDoc of snap.docs) {
    const tokenSnap = await userDoc.ref.collection('tokens').get();
    tokenSnap.forEach(t => {
      const token = t.data().token;
      if (token) tokens.push(token);
    });
  }

  return [...new Set(tokens)];
}

async function sendNotification(tokens, title, body, data = {}) {
  if (!tokens.length) return { sent: 0 };

  const payload = {
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
  };

  let sent = 0;
  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500);
    const res = await admin.messaging().sendEachForMulticast({
      tokens: chunk,
      ...payload
    });
    sent += res.successCount || 0;
  }

  return { sent };
}

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'meuturno-notifications' });
});

app.post('/aviso', async (req, res) => {
  try {
    const { titulo, texto, avisoId } = req.body;

    const tokens = await getTokensByRoles(['tecnico', 'medico', 'assistente']);
    const result = await sendNotification(
      tokens,
      titulo || 'Novo aviso',
      texto || 'Há um novo aviso.',
      { type: 'aviso', id: avisoId || '' }
    );

    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/pedido', async (req, res) => {
  try {
    const { nome, colega_nome, colega_email, pedidoId } = req.body;

    const adminTokens = await getTokensByEmails(ADMIN_EMAILS);
    const colegaTokens = await getTokensByEmails([colega_email]);

    const r1 = await sendNotification(
      adminTokens,
      'Novo pedido de troca',
      `${nome || 'Um colega'} pediu troca com ${colega_nome || 'outro colega'}.`,
      { type: 'pedido', id: pedidoId || '', event: 'novo' }
    );

    const r2 = await sendNotification(
      colegaTokens,
      'Pedido de troca',
      `${nome || 'Um colega'} pediu troca contigo.`,
      { type: 'pedido', id: pedidoId || '', event: 'colega' }
    );

    res.json({ ok: true, admin: r1.sent, colega: r2.sent });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/status', async (req, res) => {
  try {
    const { email, colega_email, status, pedidoId } = req.body;

    const tokens = await getTokensByEmails([email, colega_email]);
    const result = await sendNotification(
      tokens,
      'Estado da troca atualizado',
      `O pedido foi alterado para: ${status || 'novo estado'}.`,
      { type: 'pedido', id: pedidoId || '', event: 'status', status: status || '' }
    );

    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on ${port}`));
