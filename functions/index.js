const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const ADMIN_EMAILS = [
  'carlos.martins@alivasaude.com',
  'ana.baiao@alivasaude.com'
];

async function getTokensFromUsersQuery(query) {
  const usersSnap = await query.get();
  const tokens = [];

  for (const userDoc of usersSnap.docs) {
    const tokenSnap = await userDoc.ref.collection('tokens').get();
    tokenSnap.forEach((t) => {
      const token = t.data().token;
      if (token) tokens.push(token);
    });
  }

  return [...new Set(tokens)];
}

async function getTokensByRoles(roles) {
  const query = admin.firestore()
    .collection('Utilizadores')
    .where('role', 'in', roles);

  return getTokensFromUsersQuery(query);
}

async function getTokensByEmails(emails) {
  const cleanEmails = [...new Set((emails || []).filter(Boolean))];
  if (!cleanEmails.length) return [];

  const query = admin.firestore()
    .collection('Utilizadores')
    .where('email', 'in', cleanEmails);

  return getTokensFromUsersQuery(query);
}

async function deleteTokenEverywhere(token) {
  const usersSnap = await admin.firestore().collection('Utilizadores').get();

  for (const userDoc of usersSnap.docs) {
    const tokenSnap = await userDoc.ref.collection('tokens').where('token', '==', token).get();
    for (const doc of tokenSnap.docs) {
      await doc.ref.delete();
    }
  }
}

async function sendNotification(tokens, title, body, data = {}) {
  if (!tokens.length) return;

  const payloadData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)])
  );

  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500);

    const response = await admin.messaging().sendEachForMulticast({
      tokens: chunk,
      notification: { title, body },
      data: payloadData
    });

    const failedTokens = [];
    response.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error && r.error.code ? r.error.code : '';
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/invalid-argument'
        ) {
          failedTokens.push(chunk[idx]);
        }
      }
    });

    for (const token of failedTokens) {
      await deleteTokenEverywhere(token);
    }
  }
}

exports.onAvisoCreate = functions.firestore
  .document('Avisos/{avisoId}')
  .onCreate(async (snap, context) => {
    const aviso = snap.data() || {};
    const tokens = await getTokensByRoles(['tecnico', 'medico', 'assistente']);

    await sendNotification(
      tokens,
      'Novo aviso',
      aviso.texto ? aviso.texto.slice(0, 120) : 'Há um novo aviso.',
      {
        type: 'aviso',
        id: context.params.avisoId
      }
    );
  });

exports.onPedidoCreate = functions.firestore
  .document('Pedidos/{pedidoId}')
  .onCreate(async (snap, context) => {
    const pedido = snap.data() || {};

    const adminTokens = await getTokensByEmails(ADMIN_EMAILS);
    await sendNotification(
      adminTokens,
      'Novo pedido de troca',
      `${pedido.nome || 'Um colega'} pediu troca com ${pedido.colega_nome || 'outro colega'}.`,
      {
        type: 'pedido',
        id: context.params.pedidoId,
        event: 'novo'
      }
    );

    const colegaTokens = await getTokensByEmails([pedido.colega_email]);
    await sendNotification(
      colegaTokens,
      'Pedido de troca',
      `${pedido.nome || 'Um colega'} pediu troca contigo.`,
      {
        type: 'pedido',
        id: context.params.pedidoId,
        event: 'colega'
      }
    );
  });

exports.onPedidoUpdate = functions.firestore
  .document('Pedidos/{pedidoId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() || {};
    const after = change.after.data() || {};

    if (before.status === after.status) return;

    const tokens = await getTokensByEmails([after.email, after.colega_email]);

    await sendNotification(
      tokens,
      'Estado da troca atualizado',
      `O pedido foi alterado para: ${after.status}`,
      {
        type: 'pedido',
        id: context.params.pedidoId,
        event: 'status'
      }
    );
  });
