// functions/index.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true }); // Importa e configura o CORS para aceitar requisições do seu frontend
const { onSchedule } = require("firebase-functions/v2/scheduler");

admin.initializeApp();

// --- FUNÇÃO 1: CRIAR USUÁRIOS (COM VALIDAÇÃO DE IDADE) ---
exports.createNewUser = functions.https.onCall(async (data, context) => {
    // Verifica se o usuário que está fazendo a chamada é um administrador
    if (!context.auth || context.auth.token.perfil !== 'admin') {
        throw new functions.https.HttpsError("permission-denied", "Apenas administradores podem criar novos usuários.");
    }

    if (!data || !data.userData) {
        throw new functions.https.HttpsError("invalid-argument", "Dados do usuário ausentes.");
    }
    
    const { email, password, nome, cpf, dataNascimento, cargo, perfil } = data.userData;
    if (!email || !password || !nome || !cpf || !dataNascimento || !cargo || !perfil) {
        throw new functions.https.HttpsError("invalid-argument", "Todos os campos obrigatórios devem ser preenchidos.");
    }

    // --- VALIDAÇÃO DE DATA DE NASCIMENTO E IDADE ---
    const dob = new Date(dataNascimento);
    const today = new Date();
    // Ajusta o fuso horário para o do Brasil (UTC-3) para evitar erros de data
    dob.setUTCHours(dob.getUTCHours() - 3);
    today.setUTCHours(today.getUTCHours() - 3);

    if (dob >= today) { // Verifica se a data de nascimento não é hoje ou no futuro
        throw new functions.https.HttpsError("invalid-argument", "A data de nascimento não pode ser uma data futura.");
    }
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    if (age < 18) {
        throw new functions.https.HttpsError("invalid-argument", "O usuário deve ter no mínimo 18 anos.");
    }
    // --- FIM DA VALIDAÇÃO ---

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
        throw new functions.https.HttpsError("invalid-argument", "A senha deve ter no mínimo 8 caracteres, contendo letras e números.");
    }

    try {
        const cpfQuery = await admin.firestore().collection("usuarios").where("cpf", "==", cpf).get();
        if (!cpfQuery.empty) {
            throw new functions.https.HttpsError("already-exists", "Este CPF já está cadastrado no sistema.");
        }

        const userRecord = await admin.auth().createUser({ email, password, displayName: nome });
        await admin.auth().setCustomUserClaims(userRecord.uid, { perfil: perfil });

        await admin.firestore().collection("usuarios").doc(userRecord.uid).set({
            nome, cpf, dataNascimento, cargo, email, perfil,
            status: 'ativo',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { success: true, message: `Usuário ${nome} criado com sucesso.` };
    } catch (error) {
        console.error("CF: Erro ao criar usuário:", error);
        if (error.code === "auth/email-already-exists") {
            throw new functions.https.HttpsError("already-exists", "Este e-mail já está em uso.");
        }
        if (error.httpsErrorCode) { // Re-lança erros HttpsError já formatados (como os de validação)
            throw error;
        }
        throw new functions.https.HttpsError("internal", "Ocorreu um erro interno ao criar o usuário.");
    }
});


// --- FUNÇÃO 2: INATIVAR/REATIVAR USUÁRIO (CORRIGIDA COM CORS) ---
// Alterada para onRequest para resolver o problema de CORS que bloqueava a requisição do frontend.
exports.toggleUserStatus = functions.https.onRequest((req, res) => {
    // O 'cors' envolve a lógica da função para lidar com a requisição preflight (OPTIONS)
    cors(req, res, async () => {
        // Assegura que o método seja POST, que é o padrão para ações que modificam dados
        if (req.method !== 'POST') {
            return res.status(405).send({ error: 'Método não permitido.' });
        }

        // Validação do token de autenticação enviado pelo frontend no cabeçalho
        if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
            console.error("toggleUserStatus: Token não encontrado no cabeçalho.");
            return res.status(403).send({ error: 'Não autorizado: Token de autenticação ausente.' });
        }
        
        const idToken = req.headers.authorization.split('Bearer ')[1];

        try {
            // Verifica se o token é válido e decodifica para obter as informações do usuário
            const decodedToken = await admin.auth().verifyIdToken(idToken);

            // Verifica se o usuário que fez a chamada tem o perfil de 'admin'
            if (decodedToken.perfil !== 'admin') {
                return res.status(403).send({ error: 'Permissão negada: Apenas administradores podem realizar esta ação.' });
            }

            // Extrai os dados enviados no corpo da requisição pelo frontend
            const { uid, newStatus } = req.body.data; // O SDK do Firebase Functions encapsula em 'data'
            if (!uid || !newStatus || !['ativo', 'inativo'].includes(newStatus)) {
                return res.status(400).send({ error: 'Dados inválidos: UID do usuário e um status válido ("ativo" ou "inativo") são obrigatórios.' });
            }
            
            // Impede que um administrador se inactive
            if (decodedToken.uid === uid) {
                return res.status(400).send({ error: 'Ação não permitida: Você não pode inativar a si mesmo.' });
            }

            const isDisabled = newStatus === 'inativo';
            // Atualiza o status no serviço de Autenticação do Firebase (desabilita o login)
            await admin.auth().updateUser(uid, { disabled: isDisabled });
            // Atualiza o status no documento do Firestore para refletir na UI
            await admin.firestore().collection("usuarios").doc(uid).update({ status: newStatus });

            console.log(`Status do usuário ${uid} atualizado para ${newStatus} pelo admin ${decodedToken.uid}`);
            return res.status(200).send({ data: { success: true, message: `Status do usuário atualizado para ${newStatus}.` }});

        } catch (error) {
            console.error("CF: Erro ao alterar status do usuário:", error);
            if (error.code === 'auth/id-token-expired') {
                 return res.status(401).send({ error: 'Sessão expirada. Por favor, faça login novamente.'});
            }
            return res.status(500).send({ error: 'Ocorreu um erro interno ao tentar atualizar o status do usuário.' });
        }
    });
});


// --- FUNÇÃO 3: NOTIFICAR SOBRE ANIVERSÁRIOS ---
// (Nenhuma alteração necessária, seu código original está mantido)
exports.checkAniversarios = onSchedule("every 24 hours", async (event) => {
    const db = admin.firestore();
    console.log("Iniciando verificação de aniversários...");
    const hoje = new Date();
    const sufixoDataHoje = `-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    try {
        const clientesSnapshot = await db.collection("clientes").get();
        const usuariosSnapshot = await db.collection("usuarios").where("status", "==", "ativo").get(); // Notificar apenas usuários ativos
        const allUserIds = usuariosSnapshot.docs.map(doc => doc.id);
        if(allUserIds.length === 0) return null;
        for (const clienteDoc of clientesSnapshot.docs) {
            const clienteData = clienteDoc.data();
            if (clienteData.DATANASCIMENTO && typeof clienteData.DATANASCIMENTO === 'string' && clienteData.DATANASCIMENTO.endsWith(sufixoDataHoje)) {
                const notificationPromises = allUserIds.map(userId =>
                    db.collection("notificacoes").add({
                        usuarioId: userId,
                        titulo: "Aniversário de Cliente",
                        mensagem: `Hoje é aniversário de ${clienteData.NOMECLIENTE}!`,
                        clienteNome: clienteData.NOMECLIENTE,
                        dataNascimento: clienteData.DATANASCIMENTO,
                        tipo: "aniversario_cliente",
                        lida: false,
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        link: `/cliente/${clienteDoc.id}`
                    })
                );
                await Promise.all(notificationPromises);
                console.log(`Notificação de aniversário criada para ${clienteData.NOMECLIENTE}`);
            }
        }
        console.log("Verificação de aniversários concluída.");
    } catch (error) { console.error("Erro ao verificar aniversários:", error); }
});

// --- FUNÇÃO 4: NOTIFICAR SOBRE ATENDIMENTOS AGENDADOS ---
// (Nenhuma alteração necessária, seu código original está mantido)
exports.checkAtendimentos = onSchedule("every 24 hours", async (event) => {
    const db = admin.firestore();
    console.log("Iniciando verificação de atendimentos agendados...");
    const inicioHoje = new Date(); inicioHoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date(); fimHoje.setHours(23, 59, 59, 999);
    const inicioAmanha = new Date(inicioHoje); inicioAmanha.setDate(inicioHoje.getDate() + 1);
    const fimAmanha = new Date(fimHoje); fimAmanha.setDate(fimHoje.getDate() + 1);
    try {
        const atendimentosHojeQuery = db.collection("agendamentos").where('data', '>=', inicioHoje).where('data', '<=', fimHoje);
        const hojeSnapshot = await atendimentosHojeQuery.get();
        for (const doc of hojeSnapshot.docs) {
            const atendimento = doc.data();
            await db.collection("notificacoes").add({ 
                usuarioId: atendimento.advogadoId, 
                titulo: "Atendimento Hoje", 
                mensagem: `Você tem um atendimento com ${atendimento.clienteNome} às ${atendimento.horario}.`,
                clienteNome: atendimento.clienteNome,
                advogadoNome: atendimento.advogadoNome,
                horario: atendimento.horario, 
                tipo: "atendimento_hoje", 
                lida: false, 
                timestamp: admin.firestore.FieldValue.serverTimestamp(), 
                link: `/atendimentos` 
            });
            console.log(`Notificação de atendimento (hoje) criada para Dr(a). ${atendimento.advogadoNome}`);
        }
        const atendimentosAmanhaQuery = db.collection("agendamentos").where('data', '>=', inicioAmanha).where('data', '<=', fimAmanha);
        const amanhaSnapshot = await atendimentosAmanhaQuery.get();
        for (const doc of amanhaSnapshot.docs) {
            const atendimento = doc.data();
            await db.collection("notificacoes").add({ 
                usuarioId: atendimento.advogadoId,
                titulo: "Atendimento Amanhã", 
                mensagem: `Você tem um atendimento com ${atendimento.clienteNome} às ${atendimento.horario}.`,
                clienteNome: atendimento.clienteNome,
                advogadoNome: atendimento.advogadoNome,
                horario: atendimento.horario, 
                tipo: "atendimento_amanha", 
                lida: false, 
                timestamp: admin.firestore.FieldValue.serverTimestamp(), 
                link: `/atendimentos` 
            });
            console.log(`Notificação de atendimento (amanhã) criada para Dr(a). ${atendimento.advogadoNome}`);
        }
        console.log("Verificação de atendimentos concluída.");
    } catch (error) { console.error("Erro ao verificar atendimentos:", error); }
});