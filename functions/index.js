// functions/index.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// A ADMIN_REGISTRATION_KEY foi removida desta função para fins de debug temporário.
// Em produção, você DEVE implementar uma verificação de segurança robusta aqui.

exports.createNewUser = functions.https.onCall(async (data, context) => {
    // --- NOVOS LOGS PARA DEPURAR O OBJETO 'data' RECEBIDO ---
    console.log("CF: Objeto 'data' recebido na Cloud Function:", JSON.stringify(data, null, 2));
    console.log("CF: Tipo de 'data' recebido:", typeof data);
    console.log("CF: Conteúdo de 'data.userData':", data ? data.userData : 'data é undefined/null');
    console.log("CF: Tipo de 'data.userData':", typeof (data ? data.userData : 'undefined'));
    // --- FIM DOS LOGS DE DEPURAR O OBJETO 'data' RECEBIDO ---

    // Adiciona uma verificação para garantir que data.userData existe antes de desestruturar
    if (!data || !data.userData) {
        console.error("CF: data.userData está ausente ou é inválido na requisição.");
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados do usuário ausentes. Por favor, tente novamente.",
        );
    }

    // A linha abaixo é onde estava ocorrendo o erro 'Cannot destructure property 'email' of undefined'.
    // Ela agora está protegida pela verificação acima.
    const { email, password, nome, cpf, dataNascimento, cargo } = data.userData;

    // Adiciona validação de entrada antes de tentar criar o usuário
    if (!email || !password || !nome || !cpf || !dataNascimento || !cargo) {
        console.error("CF: Campos obrigatórios do usuário ausentes.");
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Todos os campos obrigatórios devem ser preenchidos.",
        );
    }

    if (password.length < 6) { // Firebase Auth exige no mínimo 6 caracteres
        console.error("CF: Senha muito curta.");
        throw new functions.https.HttpsError(
            "invalid-argument",
            "A senha deve ter no mínimo 6 caracteres.",
        );
    }

    try {
        // 2. Cria o usuário no Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: nome,
        });

        // 3. Salva as informações adicionais no Firestore
        await admin.firestore().collection("usuarios").doc(userRecord.uid).set({
            nome: nome,
            cpf: cpf,
            dataNascimento: dataNascimento,
            cargo: cargo,
            email: email, // Armazena o e-mail no Firestore também, útil para buscas
            createdAt: admin.firestore.FieldValue.serverTimestamp(), // Adiciona um timestamp de criação
        });

        // Log de sucesso
        console.log(`Usuário ${nome} (${userRecord.uid}) criado com sucesso.`);

        // 4. Retorna uma mensagem de sucesso
        return { success: true, message: `Usuário ${nome} criado com sucesso.` };

    } catch (error) {
        console.error("CF: Erro ao criar usuário na Cloud Function:", error);

        if (error.code === "auth/email-already-exists") {
            throw new functions.https.HttpsError(
                "already-exists",
                "Este e-mail já está em uso por outro usuário.",
            );
        } else if (error.code === "auth/weak-password") {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "A senha é muito fraca. Ela deve ter pelo menos 6 caracteres.",
            );
        }
        // Para quaisquer outros erros do Firebase Auth ou Firestore
        throw new functions.https.HttpsError(
            "internal",
            "Ocorreu um erro interno ao criar o usuário. " + error.message,
        );
    }
});