const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");

admin.initializeApp();

// --- FUNÇÃO 1: CRIAR USUÁRIOS ---
exports.createNewUser = onCall(async (request) => {
    const data = request.data;
    if (!data || !data.userData) {
        throw new functions.https.HttpsError("invalid-argument", "Dados do usuário ausentes.");
    }
    const { email, password, nome, cpf, dataNascimento, cargo } = data.userData;
    if (!email || !password || !nome || !cpf || !dataNascimento || !cargo) {
        throw new functions.https.HttpsError("invalid-argument", "Todos os campos obrigatórios devem ser preenchidos.");
    }
    if (password.length < 6) {
        throw new functions.https.HttpsError("invalid-argument", "A senha deve ter no mínimo 6 caracteres.");
    }
    try {
        const userRecord = await admin.auth().createUser({ email, password, displayName: nome });
        await admin.firestore().collection("usuarios").doc(userRecord.uid).set({
            nome, cpf, dataNascimento, cargo, email,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, message: `Usuário ${nome} criado com sucesso.` };
    } catch (error) {
        console.error("CF: Erro ao criar usuário:", error);
        if (error.code === "auth/email-already-exists") {
            throw new functions.https.HttpsError("already-exists", "Este e-mail já está em uso.");
        }
        throw new functions.https.HttpsError("internal", "Ocorreu um erro interno ao criar o usuário.");
    }
});


// --- FUNÇÃO 2: NOTIFICAR SOBRE ANIVERSÁRIOS ---
exports.checkAniversarios = onSchedule("every 24 hours", async (event) => {
    const db = admin.firestore();
    console.log("Iniciando verificação de aniversários...");
    const hoje = new Date();
    const sufixoDataHoje = `-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    try {
        const clientesSnapshot = await db.collection("clientes").get();
        const usuariosSnapshot = await db.collection("usuarios").get();
        const allUserIds = usuariosSnapshot.docs.map(doc => doc.id);
        if(allUserIds.length === 0) return null;
        for (const clienteDoc of clientesSnapshot.docs) {
            const clienteData = clienteDoc.data();
            if (clienteData.DATANASCIMENTO && typeof clienteData.DATANASCIMENTO === 'string' && clienteData.DATANASCIMENTO.endsWith(sufixoDataHoje)) {
                const notificationPromises = allUserIds.map(userId =>
                    db.collection("notificacoes").add({
                        userId,
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

// --- FUNÇÃO 3: NOTIFICAR SOBRE ATENDIMENTOS AGENDADOS ---
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
            const mensagem = `Você tem um atendimento com ${atendimento.clienteNome} às ${atendimento.horario}.`;
            await db.collection("notificacoes").add({ userId: atendimento.advogadoId, titulo: "Atendimento Hoje", mensagem, clienteNome: atendimento.clienteNome, horario: atendimento.horario, tipo: "atendimento_hoje", lida: false, timestamp: admin.firestore.FieldValue.serverTimestamp(), link: `/atendimentos` });
            console.log(`Notificação de atendimento (hoje) criada para Dr(a). ${atendimento.advogadoNome}`);
        }
        const atendimentosAmanhaQuery = db.collection("agendamentos").where('data', '>=', inicioAmanha).where('data', '<=', fimAmanha);
        const amanhaSnapshot = await atendimentosAmanhaQuery.get();
        for (const doc of amanhaSnapshot.docs) {
            const atendimento = doc.data();
            const mensagem = `Você tem um atendimento com ${atendimento.clienteNome} às ${atendimento.horario}.`;
            await db.collection("notificacoes").add({ userId: atendimento.advogadoId, titulo: "Atendimento Amanhã", mensagem, clienteNome: atendimento.clienteNome, horario: atendimento.horario, tipo: "atendimento_amanha", lida: false, timestamp: admin.firestore.FieldValue.serverTimestamp(), link: `/atendimentos` });
            console.log(`Notificação de atendimento (amanhã) criada para Dr(a). ${atendimento.advogadoNome}`);
        }
        console.log("Verificação de atendimentos concluída.");
    } catch (error) { console.error("Erro ao verificar atendimentos:", error); }
});