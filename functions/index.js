// functions/index.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { onSchedule } = require("firebase-functions/v2/scheduler");

admin.initializeApp();

// --- FUNÇÃO 1: CRIAR USUÁRIOS (onCall - CORRIGIDA PARA USAR UID COMO DOC ID) ---
exports.createNewUser = functions.https.onCall(async (data, context) => {
    // ***** LINHA DE DEPURAÇÃO (Pode remover após confirmar que funciona) *****
    console.log("Token de autenticação recebido:", JSON.stringify(context.auth, null, 2));
    // ***** FIM DA LINHA DE DEPURAÇÃO *****

    // Verifica admin
    if (!context.auth || !context.auth.token || context.auth.token.perfil !== 'admin') {
        console.error("Tentativa de criar usuário sem permissão de admin. Token:", JSON.stringify(context.auth?.token, null, 2));
        throw new functions.https.HttpsError("permission-denied", "Apenas administradores podem criar novos usuários.");
    }

    // Valida dados recebidos
    if (!data || !data.email || !data.password || !data.nome || !data.cpf || !data.dataNascimento || !data.cargo || !data.perfil) {
        throw new functions.https.HttpsError("invalid-argument", "Todos os campos obrigatórios devem ser preenchidos.");
    }
    const { email, password, nome, cpf, dataNascimento, cargo, perfil } = data;

    // Valida idade (mantida)
    const dob = new Date(dataNascimento + 'T00:00:00-03:00');
    const today = new Date();
    const todayBrasil = new Date(today.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    todayBrasil.setHours(0, 0, 0, 0);
    if (dob >= todayBrasil) { throw new functions.https.HttpsError("invalid-argument", "A data de nascimento deve ser anterior ao dia de hoje."); }
    let age = todayBrasil.getFullYear() - dob.getFullYear();
    const m = todayBrasil.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && todayBrasil.getDate() < dob.getDate())) { age--; }
    if (age < 18) { throw new functions.https.HttpsError("invalid-argument", "O usuário deve ter no mínimo 18 anos."); }

    // Valida senha (mantida)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(password)) { throw new functions.https.HttpsError("invalid-argument", "A senha deve ter no mínimo 8 caracteres, contendo letras e números."); }

    try {
        console.log("INFO: Iniciando criação do usuário...");
        // Verifica CPF duplicado (mantida)
        const cpfLimpo = cpf.replace(/\D/g, '');
        const cpfQuery = await admin.firestore().collection("usuarios").where("cpf", "==", cpfLimpo).get();
        if (!cpfQuery.empty) { throw new functions.https.HttpsError("already-exists", "Este CPF já está cadastrado no sistema."); }

        // Cria usuário no Auth (mantida)
        const userRecord = await admin.auth().createUser({ email, password, displayName: nome });
        console.log(`INFO: Usuário criado no Auth: ${userRecord.uid}`);

        // Define Custom Claim no Auth (mantida)
        await admin.auth().setCustomUserClaims(userRecord.uid, { perfil: perfil });
        console.log(`INFO: Custom claim { perfil: '${perfil}' } definida para ${userRecord.uid}`);

        // ----- CORREÇÃO PRINCIPAL -----
        // Salva/Atualiza dados no Firestore USANDO O UID DO AUTH COMO ID DO DOCUMENTO
        console.log(`INFO: Salvando dados no Firestore com ID de documento = ${userRecord.uid}`);
        await admin.firestore().collection("usuarios").doc(userRecord.uid).set({ // <<< USA userRecord.uid AQUI
            nome,
            cpf: cpfLimpo,
            dataNascimento,
            cargo,
            email,
            perfil, // Garante que 'perfil' seja salvo
            status: 'ativo',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            // Adicione outros campos se necessário
        }); // Usa set() na primeira vez para garantir a criação do documento com o ID correto
        console.log(`INFO: Documento salvo no Firestore para ${userRecord.uid}`);
        // ----- FIM DA CORREÇÃO -----

        console.log("--- createNewUser: CONCLUÍDA COM SUCESSO ---");
        return { success: true, message: `Usuário ${nome} criado com sucesso.` };

    } catch (error) {
        console.error("--- createNewUser: FALHOU DURANTE A CRIAÇÃO ---");
        console.error("CF: Erro detalhado:", error);
        // Tenta deletar o usuário do Auth se a escrita no Firestore falhar
        if (error.code !== "auth/email-already-exists" && error.code !== "already-exists" && typeof userRecord !== 'undefined' && userRecord?.uid) {
            try {
                await admin.auth().deleteUser(userRecord.uid);
                console.log(`INFO: Usuário ${userRecord.uid} deletado do Auth devido a erro no Firestore.`);
            } catch (deleteError) {
                console.error(`ERRO CRÍTICO: Falha ao deletar usuário ${userRecord.uid} do Auth após erro no Firestore:`, deleteError);
            }
        }
        if (error.code === "auth/email-already-exists") { throw new functions.https.HttpsError("already-exists", "Este e-mail já está em uso."); }
        if (error.httpsErrorCode) { throw error; }
        throw new functions.https.HttpsError("internal", `Ocorreu um erro interno ao criar o usuário: ${error.message}`);
    }
});

// --- FUNÇÃO 2: INATIVAR/REATIVAR USUÁRIO ---
// (Sem alterações necessárias aqui, pois já recebe o UID correto)
exports.toggleUserStatus = functions.https.onCall(async (data, context) => {
    if (!context.auth || context.auth.token.perfil !== 'admin') { throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem alterar o status.'); }
    const { uid, newStatus } = data;
    if (!uid || !newStatus || !['ativo', 'inativo'].includes(newStatus)) { throw new functions.https.HttpsError('invalid-argument', 'UID e status válidos são obrigatórios.'); }
    if (context.auth.uid === uid) { throw new functions.https.HttpsError('failed-precondition', 'Você não pode inativar a si mesmo.'); }
    try {
        const isDisabled = newStatus === 'inativo';
        await admin.auth().updateUser(uid, { disabled: isDisabled });
        // Assume que o ID do documento é o UID
        await admin.firestore().collection("usuarios").doc(uid).update({ status: newStatus });
        const actionMessage = newStatus === 'ativo' ? 'reativado' : 'inativado';
        return { success: true, message: `Usuário ${actionMessage} com sucesso.` };
    } catch (error) {
        console.error("CF: Erro ao alterar status:", error);
        // Verifica se o erro foi porque o documento não existe (caso ID não seja UID)
        if (error.code === 5) { // Código 'NOT_FOUND' do Firestore
             console.error(`ERRO: Documento de usuário com ID ${uid} não encontrado no Firestore para atualizar status.`);
             // Poderia tentar buscar pelo email e atualizar, mas é complexo
             throw new functions.https.HttpsError('internal', 'Erro ao atualizar status: usuário não encontrado no banco de dados.');
        }
        throw new functions.https.HttpsError('internal', 'Erro interno ao atualizar status.');
    }
});
// --- FUNÇÃO 3: NOTIFICAR SOBRE ANIVERSÁRIOS ---
exports.checkAniversarios = onSchedule("every day 09:00", async (event) => { // Executa todo dia às 9:00
    // Define o fuso horário para São Paulo
    const timeZone = "America/Sao_Paulo";
    const db = admin.firestore();
    console.log("Iniciando verificação de aniversários...");

    // Obtém a data e hora atual no fuso horário de São Paulo
    const hoje = new Date(new Date().toLocaleString("en-US", { timeZone }));
    const diaHoje = String(hoje.getDate()).padStart(2, '0');
    const mesHoje = String(hoje.getMonth() + 1).padStart(2, '0');
    // Formato MM-DD para comparar com a parte final da data no Firestore (assumindo YYYY-MM-DD)
    const diaMesHoje = `${mesHoje}-${diaHoje}`;

    try {
        const clientesSnapshot = await db.collection("clientes").get();
        const usuariosSnapshot = await db.collection("usuarios").where("status", "==", "ativo").get();
        const allUserIds = usuariosSnapshot.docs.map(doc => doc.id);
        if (allUserIds.length === 0) {
            console.log("Nenhum usuário ativo encontrado para notificar.");
            return null;
        }

        let notificacoesCriadas = 0;
        for (const clienteDoc of clientesSnapshot.docs) {
            const clienteData = clienteDoc.data();
            // Verifica se dataNascimento existe, é string e tem o formato YYYY-MM-DD
            if (clienteData.dataNascimento && typeof clienteData.dataNascimento === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(clienteData.dataNascimento)) {
                 const diaMesNascimento = clienteData.dataNascimento.substring(5); // Pega MM-DD
                 if (diaMesNascimento === diaMesHoje) {
                    const notificationPromises = allUserIds.map(userId =>
                        db.collection("notificacoes").add({
                            usuarioId: userId,
                            titulo: "Aniversário de Cliente",
                            mensagem: `Hoje é aniversário de ${clienteData.nomeCliente || 'Cliente sem nome'}!`,
                            clienteId: clienteDoc.id,
                            clienteNome: clienteData.nomeCliente || 'Cliente sem nome',
                            dataNascimento: clienteData.dataNascimento,
                            tipo: "aniversario_cliente",
                            lida: false,
                            timestamp: admin.firestore.FieldValue.serverTimestamp(),
                            link: `/cliente/${clienteDoc.id}` // Ajuste o link se necessário
                        })
                    );
                    await Promise.all(notificationPromises);
                    console.log(`Notificação de aniversário criada para ${clienteData.nomeCliente || clienteDoc.id}`);
                    notificacoesCriadas++;
                 }
            } else if (clienteData.dataNascimento) {
                // Loga um aviso se o formato da data estiver incorreto
                console.warn(`Cliente ${clienteDoc.id} (${clienteData.nomeCliente || 'sem nome'}) possui data de nascimento em formato inválido: ${clienteData.dataNascimento}`);
            }
        }
        console.log(`Verificação de aniversários concluída. ${notificacoesCriadas} notificações criadas.`);
    } catch (error) {
         console.error("Erro CRÍTICO ao verificar aniversários:", error);
         // Considerar enviar um alerta aqui se isso falhar consistentemente
    }
});


// --- FUNÇÃO 4: NOTIFICAR SOBRE ATENDIMENTOS AGENDADOS ---
exports.checkAtendimentos = onSchedule("every day 08:00", async (event) => { // Executa todo dia às 8:00
    const timeZone = "America/Sao_Paulo";
    const db = admin.firestore();
    console.log("Iniciando verificação de atendimentos agendados...");

    const agoraBrasil = new Date(new Date().toLocaleString("en-US", { timeZone }));
    const inicioHoje = new Date(agoraBrasil); inicioHoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date(agoraBrasil); fimHoje.setHours(23, 59, 59, 999);
    const inicioAmanha = new Date(inicioHoje); inicioAmanha.setDate(inicioHoje.getDate() + 1);
    const fimAmanha = new Date(fimHoje); fimAmanha.setDate(fimHoje.getDate() + 1);

    // Convertendo para Timestamps do Firestore para a consulta
    const inicioHojeTimestamp = admin.firestore.Timestamp.fromDate(inicioHoje);
    const fimHojeTimestamp = admin.firestore.Timestamp.fromDate(fimHoje);
    const inicioAmanhaTimestamp = admin.firestore.Timestamp.fromDate(inicioAmanha);
    const fimAmanhaTimestamp = admin.firestore.Timestamp.fromDate(fimAmanha);

    let notificacoesHoje = 0;
    let notificacoesAmanha = 0;

    try {
        // Busca atendimentos para HOJE
        const atendimentosHojeQuery = db.collection("agendamentos")
            .where('data', '>=', inicioHojeTimestamp)
            .where('data', '<=', fimHojeTimestamp);
        const hojeSnapshot = await atendimentosHojeQuery.get();
        const notificationPromisesHoje = [];

        hojeSnapshot.forEach(doc => {
            const atendimento = doc.data();
            if (!atendimento.advogadoId) {
                console.warn(`Atendimento ${doc.id} (hoje) sem advogadoId associado.`);
                return; // Pula este agendamento se não houver advogado
            }
            // Formata a data e hora para a mensagem
             const dataHoraAtendimento = atendimento.data ? atendimento.data.toDate().toLocaleString('pt-BR', { timeZone: timeZone, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'}) : 'Data/Hora não definida';

            notificationPromisesHoje.push( db.collection("notificacoes").add({
                 usuarioId: atendimento.advogadoId, // Notifica o advogado responsável
                 titulo: "Lembrete: Atendimento Hoje",
                 mensagem: `Você tem um atendimento agendado para hoje com ${atendimento.clienteNome || 'Cliente não especificado'} às ${dataHoraAtendimento.split(' ')[1]}.`, // Pega só a hora
                 clienteId: atendimento.clienteId || null,
                 clienteNome: atendimento.clienteNome || 'Cliente não especificado',
                 advogadoId: atendimento.advogadoId,
                 advogadoNome: atendimento.advogadoNome || 'Advogado não especificado',
                 horario: atendimento.horario || 'Não definido', // Pode ser útil manter o campo original
                 data: atendimento.data, // Salva o timestamp original
                 tipo: "atendimento_hoje",
                 lida: false,
                 timestamp: admin.firestore.FieldValue.serverTimestamp(),
                 link: `/atendimentos` // Ou link para o atendimento específico se tiver ID
            }));
            notificacoesHoje++;
        });

        // Busca atendimentos para AMANHÃ
        const atendimentosAmanhaQuery = db.collection("agendamentos")
            .where('data', '>=', inicioAmanhaTimestamp)
            .where('data', '<=', fimAmanhaTimestamp);
        const amanhaSnapshot = await atendimentosAmanhaQuery.get();
        const notificationPromisesAmanha = [];

        amanhaSnapshot.forEach(doc => {
            const atendimento = doc.data();
            if (!atendimento.advogadoId) {
                console.warn(`Atendimento ${doc.id} (amanhã) sem advogadoId associado.`);
                return;
            }
             const dataHoraAtendimento = atendimento.data ? atendimento.data.toDate().toLocaleString('pt-BR', { timeZone: timeZone, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'}) : 'Data/Hora não definida';

            notificationPromisesAmanha.push( db.collection("notificacoes").add({
                usuarioId: atendimento.advogadoId, // Notifica o advogado responsável
                titulo: "Lembrete: Atendimento Amanhã",
                mensagem: `Atendimento agendado para amanhã (${dataHoraAtendimento.split(' ')[0]}) com ${atendimento.clienteNome || 'Cliente não especificado'} às ${dataHoraAtendimento.split(' ')[1]}.`,
                clienteId: atendimento.clienteId || null,
                clienteNome: atendimento.clienteNome || 'Cliente não especificado',
                advogadoId: atendimento.advogadoId,
                advogadoNome: atendimento.advogadoNome || 'Advogado não especificado',
                horario: atendimento.horario || 'Não definido',
                data: atendimento.data,
                tipo: "atendimento_amanha",
                lida: false,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                link: `/atendimentos`
            }));
            notificacoesAmanha++;
        });

        // Aguarda todas as notificações serem criadas
        await Promise.all([...notificationPromisesHoje, ...notificationPromisesAmanha]);
        console.log(`Verificação de atendimentos concluída. ${notificacoesHoje} notificações para hoje, ${notificacoesAmanha} para amanhã.`);

    } catch (error) {
        console.error("Erro CRÍTICO ao verificar atendimentos:", error);
    }
});


// --- FUNÇÃO 5: CONCEDER PERFIL DE ADMINISTRADOR (COM LOG DE 'data') ---
exports.grantAdminRole = functions.https.onCall(async (data, context) => {
    // A verificação de segurança continua comentada para este teste
    /*
    if (!context.auth || context.auth.token.perfil !== 'admin') {
        throw new functions.https.HttpsError("permission-denied", "Apenas administradores podem executar esta ação.");
    }
    */

    console.log("--- grantAdminRole: INICIADA ---");

    // ***** LINHA DE DEPURAÇÃO MAIS IMPORTANTE *****
    // Mostra exatamente o que foi recebido no parâmetro 'data'
    console.log("grantAdminRole: Dados recebidos (data):", JSON.stringify(data, null, 2));
    // ***** FIM DA LINHA DE DEPURAÇÃO *****

    // Tenta extrair o email dos dados recebidos
    const email = data?.email; // Usa optional chaining (?) para evitar erro

    // Verifica se o email foi extraído corretamente
    if (!email) {
        console.error("grantAdminRole: ERRO - E-mail não encontrado no objeto 'data' recebido.");
        throw new functions.https.HttpsError("invalid-argument", "O e-mail é obrigatório."); // Este é o erro que você está vendo
    }

    console.log(`grantAdminRole: E-mail extraído: ${email}. Prosseguindo...`);

    try {
        const user = await admin.auth().getUserByEmail(email);
        console.log(`grantAdminRole: Usuário encontrado: ${user.uid}`);
        
        await admin.auth().setCustomUserClaims(user.uid, { perfil: 'admin' });
        console.log(`grantAdminRole: Custom claim definida para ${user.uid}`);
        
        await admin.firestore().collection("usuarios").doc(user.uid).set({ perfil: 'admin' }, { merge: true });
        console.log(`grantAdminRole: Documento Firestore atualizado para ${user.uid}`);
        
        console.log("--- grantAdminRole: CONCLUÍDA COM SUCESSO ---");
        return { message: `Sucesso! O usuário ${email} agora é um administrador.` };

    } catch (error) {
        console.error("--- grantAdminRole: FALHOU ---", error);
        if (error.code === 'auth/user-not-found') { throw new functions.https.HttpsError("not-found", `Usuário com e-mail ${email} não encontrado.`); }
        throw new functions.https.HttpsError("internal", "Falha ao conceder permissão. Verifique os logs da função.");
    }
});