const admin = require("firebase-admin");

// --- CORREÇÃO APLICADA AQUI ---
// Substitua "seu-arquivo-de-chave.json" pelo nome real do seu arquivo.
const serviceAccount = require("C:\\Users\\22015326\\Documents\\Analice\\SGAC PROJETO (2)\\SGAC PROJETO\\serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// O UID que você colou está correto.
const uid = "6hqnda1onEfdQwCU0nropXzvdHt2";

admin.auth().setCustomUserClaims(uid, { perfil: 'admin' })
  .then(() => {
    console.log(`Permissão de administrador concedida para o usuário ${uid}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`Erro ao definir a permissão de admin para ${uid}:`, error);
    process.exit(1);
  });
