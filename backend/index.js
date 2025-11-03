// backend/index.js

// --- 1. IMPORTAÇÕES ---
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const admin = require('firebase-admin');
const cron = require('node-cron');

// --- 2. INICIALIZAÇÃO DO APP EXPRESS ---
const app = express();
const PORT = process.env.PORT || 5000;

// --- 3. CONFIGURAÇÃO DO FIREBASE ADMIN ---
try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "sgac-projetofinal.appspot.com"
    });
} catch (error) {
    console.error("Erro ao inicializar o Firebase Admin:", error);
    process.exit(1);
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

// --- 4. MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// =================================================================
// ========= ROTAS E MIDDLEWARES DE USUÁRIOS E NOTIFICAÇÕES ========
// =================================================================

// Middleware para verificar se o usuário é Administrador
const checkAdmin = async (req, res, next) => {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) {
        return res.status(403).json({ message: 'Não autorizado: Token não fornecido.' });
    }
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        if (decodedToken.perfil === 'admin') {
            req.user = decodedToken;
            return next();
        } else {
            return res.status(403).json({ message: 'Permissão negada: Requer perfil de administrador.' });
        }
    } catch (error) {
        console.error('Erro ao verificar o token:', error);
        return res.status(403).json({ message: 'Token inválido ou expirado.' });
    }
};

// Middleware para verificar se o usuário está apenas autenticado
const checkAuth = async (req, res, next) => {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) {
        return res.status(403).json({ message: 'Não autorizado: Token não fornecido.' });
    }
    try {
        req.user = await admin.auth().verifyIdToken(idToken);
        next();
    } catch (error) {
        console.error('Erro ao verificar o token:', error);
        return res.status(403).json({ message: 'Token inválido ou expirado.' });
    }
};

// --- Rotas de Usuário ---
app.post('/api/create-user', checkAdmin, async (req, res) => {
    const { email, password, nome, cpf, dataNascimento, cargo, perfil } = req.body;
    if (!email || !password || !nome || !cpf || !dataNascimento || !cargo || !perfil) {
        return res.status(400).json({ message: "Todos os campos obrigatórios devem ser preenchidos." });
    }
    try {
        const cpfLimpo = cpf.replace(/\D/g, '');
        const cpfQuery = await db.collection("usuarios").where("cpf", "==", cpfLimpo).get();
        if (!cpfQuery.empty) {
            return res.status(409).json({ message: "Este CPF já está cadastrado no sistema." });
        }
        const userRecord = await admin.auth().createUser({ email, password, displayName: nome });
        await admin.auth().setCustomUserClaims(userRecord.uid, { perfil: perfil });
        await db.collection("usuarios").doc(userRecord.uid).set({
            nome,
            cpf: cpfLimpo,
            dataNascimento,
            cargo,
            email,
            perfil,
            status: 'ativo',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(201).json({ success: true, message: `Usuário ${nome} criado com sucesso.` });
    } catch (error) {
        if (error.code === 'auth/email-already-exists') {
            return res.status(409).json({ message: "Este e-mail já está em uso." });
        }
        res.status(500).json({ message: 'Ocorreu um erro inesperado no servidor.', error: error.message });
    }
});

app.post('/api/toggle-user-status', checkAdmin, async (req, res) => {
    const { uid, newStatus } = req.body;
    if (!uid || !newStatus || !['ativo', 'inativo'].includes(newStatus)) {
        return res.status(400).json({ message: 'UID do usuário e um status válido são obrigatórios.' });
    }
    if (req.user.uid === uid) {
        return res.status(403).json({ message: 'Você não pode inativar a si mesmo.' });
    }
    try {
        const isDisabled = newStatus === 'inativo';
        await admin.auth().updateUser(uid, { disabled: isDisabled });
        await db.collection("usuarios").doc(uid).update({ status: newStatus });
        const actionMessage = newStatus === 'ativo' ? 'reativado' : 'inativado';
        res.status(200).json({ success: true, message: `Usuário ${actionMessage} com sucesso.` });
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({ message: "Usuário não encontrado no sistema." });
        }
        res.status(500).json({ message: 'Ocorreu um erro inesperado no servidor.', error: error.message });
    }
});

// --- Rota de Contratos ---
app.post('/api/gerar-contratos', async (req, res) => {
    const { clientId, contractTypes } = req.body;
    if (!clientId || !contractTypes || !Array.isArray(contractTypes) || contractTypes.length === 0) {
        return res.status(400).json({ message: 'O ID do cliente e a lista de tipos de contrato são obrigatórios.' });
    }
    let browser;
    try {
        const clientRef = db.collection('clientes').doc(clientId);
        const clientDoc = await clientRef.get();
        if (!clientDoc.exists) { return res.status(404).json({ message: 'Cliente não encontrado.' }); }
        const clientData = clientDoc.data();
        const today = new Date();
        const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const templateData = { ...clientData, dia: today.getDate(), mes: months[today.getMonth()], ano: today.getFullYear() };
        const generatedFilesInfo = [];
        browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        for (const type of contractTypes) {
            const templatePath = path.resolve(__dirname, 'templates', `tibagi_${type}.html`);
            if (!fs.existsSync(templatePath)) {
                console.warn(`Template não encontrado, pulando: ${templatePath}`);
                continue;
            }
            let htmlContent = fs.readFileSync(templatePath, 'utf8');
            Object.keys(templateData).forEach(key => {
                const value = templateData[key] ?? '';
                htmlContent = htmlContent.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
            });
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
            const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '2.5cm', right: '2.5cm', bottom: '2.5cm', left: '2.5cm' } });
            const fileName = `${type}_${clientData.NOMECLIENTE.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
            const filePath = `clients/${clientId}/documents/${fileName}`;
            const fileUpload = bucket.file(filePath);
            await fileUpload.save(pdfBuffer, { metadata: { contentType: 'application/pdf' } });
            generatedFilesInfo.push({ name: fileName, path: filePath, createdAt: new Date() });
        }
        if (generatedFilesInfo.length > 0) {
            await clientRef.update({ documents: admin.firestore.FieldValue.arrayUnion(...generatedFilesInfo) });
        }
        res.status(200).json({ message: 'Documentos gerados e salvos com sucesso!', documents: generatedFilesInfo });
    } catch (error) {
        console.error('ERRO GERAL NA GERAÇÃO DE CONTRATOS:', error);
        res.status(500).json({ message: 'Ocorreu um erro inesperado no servidor.', error: error.message });
    } finally {
        if (browser) { await browser.close(); }
    }
});

// --- Rota para buscar Notificações ---
app.get('/api/notificacoes', checkAuth, async (req, res) => {
    try {
        const userId = req.user.uid;
        const currentLocation = req.headers['x-current-location'];

        if (!currentLocation) {
            return res.status(400).json({ message: 'A unidade atual (location) não foi fornecida no cabeçalho X-Current-Location.' });
        }

        // ✅ CORREÇÃO APLICADA AQUI
        const locationQuery = currentLocation.toLowerCase();
        
        console.log(`Buscando notificações para a unidade ${locationQuery}`);

        const notificationsSnapshot = await db.collection('notificacoes')
            .where('location', '==', locationQuery) // Usando a versão em minúsculas
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();

        if (notificationsSnapshot.empty) {
            return res.status(200).json([]);
        }
        
        const notifications = [];
        for (const doc of notificationsSnapshot.docs) {
            const statusRef = doc.ref.collection('statusPorUsuario').doc(userId);
            const statusDoc = await statusRef.get();

            if (statusDoc.exists && statusDoc.data().apagada === true) {
                continue;
            }

            notifications.push({
                id: doc.id,
                ...doc.data(),
                lida: statusDoc.exists ? statusDoc.data().lida : false,
                timestamp: doc.data().timestamp.toDate()
            });
        }

        res.status(200).json(notifications);

    } catch (error) {
        console.error("ERRO ao buscar notificações:", error);
        res.status(500).json({ message: 'Ocorreu um erro inesperado no servidor.', error: error.message });
    }
});

// =================================================================
// ========= INÍCIO DAS TAREFAS AGENDADAS (NOTIFICAÇÕES) ===========
// =================================================================

const TIMEZONE = "America/Sao_Paulo";

async function criarNotificacaoGlobal(location, dadosNotificacao) {
    if (!location) {
        console.warn(`[AVISO] Tentativa de criar notificação sem um 'location'. Título: "${dadosNotificacao.titulo}".`);
        return;
    }
    const usuariosSnapshot = await db.collection("usuarios").where("status", "==", "ativo").get();
    if (usuariosSnapshot.empty) {
        return;
    }
    
    // Padronizando para minúsculas ao salvar
    const locationLowerCase = location.toLowerCase();

    const notificacaoRef = await db.collection("notificacoes").add({
        ...dadosNotificacao,
        location: locationLowerCase, // Salva a versão em minúsculas
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`[SUCESSO] Notificação (${dadosNotificacao.tipo}) criada para location ${locationLowerCase}. ID: ${notificacaoRef.id}`);
    
    const batch = db.batch();
    usuariosSnapshot.forEach(doc => {
        const userStatusRef = notificacaoRef.collection('statusPorUsuario').doc(doc.id);
        batch.set(userStatusRef, { lida: false, apagada: false });
    });
    await batch.commit();
}

// --- TAREFA 1: ANIVERSÁRIOS DE CLIENTES ---
// AVISO: '* * * * *' executa a cada minuto (bom para testes). Mude para '0 6 * * *' para rodar 1x por dia às 6h.
cron.schedule('* 6 * * *', async () => {
    console.log('--- TAREFA: Verificando Aniversários de Clientes ---');
    try {
        const hoje = new Date(new Date().toLocaleString("en-US", { timeZone: TIMEZONE }));
        const diaHoje = hoje.getDate();
        const mesHoje = hoje.getMonth(); // Mês em JS é 0-11
        const anoHoje = hoje.getFullYear();

        const clientesSnapshot = await db.collection("clientes").get();
        for (const doc of clientesSnapshot.docs) {
            const cliente = doc.data();
            const dataNascString = cliente.DATANASCIMENTO || cliente.dataNascimento;

            if (dataNascString && typeof dataNascString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dataNascString)) {
                try {
                    const [anoNasc, mesNasc, diaNasc] = dataNascString.split('-').map(Number);
                    if (diaNasc === diaHoje && (mesNasc - 1) === mesHoje) {
                        const idade = anoHoje - anoNasc;
                        const location = cliente.location || cliente.LOCATION;
                        await criarNotificacaoGlobal(location, {
                            titulo: `🎉 Aniversário de Cliente!`,
                            mensagem: `Hoje o cliente ${cliente.NOMECLIENTE || 'sem nome'} completa ${idade} anos. Deseje suas felicitações!`,
                            tipo: "aniversario_cliente",
                            link: `/cliente/${doc.id}`
                        });
                    }
                } catch (e) {
                    console.warn(`Data de nascimento em formato inválido para cliente ${doc.id}: ${dataNascString}`);
                }
            }
        }
    } catch (error) {
        console.error("ERRO na tarefa de aniversários de clientes:", error);
    }
}, { scheduled: true, timezone: TIMEZONE });

// --- TAREFA 2: ANIVERSÁRIO DE CADASTRO DE CLIENTE ---
cron.schedule('0 6 * * *', async () => {
    console.log('--- TAREFA: Verificando Aniversários de Cadastro ---');
    try {
        const hoje = new Date(new Date().toLocaleString("en-US", { timeZone: TIMEZONE }));
        const diaHoje = hoje.getDate();
        const mesHoje = hoje.getMonth();
        const anoHoje = hoje.getFullYear();

        const clientesSnapshot = await db.collection("clientes").get();
        for (const doc of clientesSnapshot.docs) {
            const cliente = doc.data();
            const dataCadastroTimestamp = cliente.DATA_CADASTRO || cliente.createdAt;

            if (dataCadastroTimestamp && dataCadastroTimestamp.toDate) {
                const dataCadastro = dataCadastroTimestamp.toDate();
                if (anoHoje > dataCadastro.getFullYear() && dataCadastro.getDate() === diaHoje && dataCadastro.getMonth() === mesHoje) {
                    const anos = anoHoje - dataCadastro.getFullYear();
                    const location = cliente.location || cliente.LOCATION;
                    await criarNotificacaoGlobal(location, {
                        titulo: `🎉 Aniversário de Cadastro`,
                        mensagem: `Hoje faz ${anos} ${anos > 1 ? 'anos' : 'ano'} que ${cliente.NOMECLIENTE || 'sem nome'} se tornou nosso cliente!`,
                        tipo: "aniversario_cadastro",
                        link: `/cliente/${doc.id}`
                    });
                }
            }
        }
    } catch (error) {
        console.error("ERRO na tarefa de aniversários de cadastro:", error);
    }
}, { scheduled: true, timezone: TIMEZONE });

// --- TAREFA 3: ATENDIMENTOS ---
cron.schedule('0 6 * * *', async () => {
    console.log('--- TAREFA: Verificando Atendimentos ---');
    try {
        const agora = new Date(new Date().toLocaleString("en-US", { timeZone: TIMEZONE }));
        const inicioHoje = new Date(agora); inicioHoje.setHours(0, 0, 0, 0);
        const fimHoje = new Date(agora); fimHoje.setHours(23, 59, 59, 999);
        const inicioAmanha = new Date(inicioHoje); inicioAmanha.setDate(inicioHoje.getDate() + 1);
        const fimAmanha = new Date(fimHoje); fimAmanha.setDate(fimHoje.getDate() + 1);
        const queries = [
            { tipo: 'hoje', start: admin.firestore.Timestamp.fromDate(inicioHoje), end: admin.firestore.Timestamp.fromDate(fimHoje) },
            { tipo: 'amanha', start: admin.firestore.Timestamp.fromDate(inicioAmanha), end: admin.firestore.Timestamp.fromDate(fimAmanha) }
        ];
        for (const q of queries) {
            const snapshot = await db.collection("agendamentos").where('data', '>=', q.start).where('data', '<=', q.end).get();
            for (const doc of snapshot.docs) {
                const atendimento = doc.data();
                const hora = atendimento.data.toDate().toLocaleTimeString('pt-BR', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' });
                const titulo = q.tipo === 'hoje' ? 'Lembrete: Atendimentos de Hoje' : 'Aviso: Atendimentos para Amanhã';
                const mensagem = `Atendimento com ${atendimento.clienteNome || '(Cliente não especificado)'} às ${hora}, com Dr(a). ${atendimento.advogadoNome || '(Advogado não especificado)'}.`;
                const location = atendimento.location || atendimento.LOCATION;
                await criarNotificacaoGlobal(location, {
                    titulo,
                    mensagem,
                    tipo: `atendimento_${q.tipo}`,
                    link: '/atendimentos'
                });
            }
        }
    } catch (error) {
        console.error("ERRO na tarefa de verificar atendimentos:", error);
    }
}, { scheduled: true, timezone: TIMEZONE });

// --- TAREFA 4: ANIVERSÁRIOS DE PROCESSOS ---
cron.schedule('0 6 * * *', async () => {
    console.log('--- TAREFA: Verificando Aniversários de Processos ---');
    try {
        const hoje = new Date(new Date().toLocaleString("en-US", { timeZone: TIMEZONE }));
        const diaHoje = hoje.getDate();

        const processosSnapshot = await db.collection("processos").get();
        for (const doc of processosSnapshot.docs) {
            const processo = doc.data();
            if (!processo.createdAt || !processo.createdAt.toDate || !processo.clienteId) {
                continue;
            }
            const dataCriacao = processo.createdAt.toDate();
            const meses = (hoje.getFullYear() - dataCriacao.getFullYear()) * 12 + (hoje.getMonth() - dataCriacao.getMonth());
            if (meses > 0 && meses % 6 === 0 && dataCriacao.getDate() === diaHoje) {
                let nomeDoCliente = '(Cliente não encontrado)';
                try {
                    const clienteDoc = await db.collection('clientes').doc(processo.clienteId).get();
                    if (clienteDoc.exists) {
                        nomeDoCliente = clienteDoc.data().NOMECLIENTE || '(Cliente sem nome)';
                    }
                } catch (e) {
                    console.error(`Erro ao buscar cliente com ID: ${processo.clienteId}`, e);
                }
                const location = processo.location || processo.LOCATION;
                await criarNotificacaoGlobal(location, {
                    titulo: `Revisão de Processo`,
                    mensagem: `O processo nº ${processo.numeroProcesso || 'N/A'} do cliente ${nomeDoCliente} completou ${meses} meses hoje.`,
                    tipo: "aniversario_processo",
                    link: `/cliente/${processo.clienteId}`
                });
            }
        }
    } catch (error) {
        console.error("ERRO na tarefa de aniversários de processos:", error);
    }
}, { scheduled: true, timezone: TIMEZONE });

// --- 6. INICIALIZAÇÃO DO SERVIDOR ---
app.listen(PORT, () => {
    console.log(`Servidor backend rodando na porta http://localhost:${PORT}`);
    console.log('Tarefas de notificação agendadas e prontas para execução.');
});