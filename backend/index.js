// backend/index.js

// --- 1. IMPORTAÇÕES ---
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const admin = require('firebase-admin');

// --- 2. INICIALIZAÇÃO DO APP EXPRESS ---
const app = express();
const PORT = process.env.PORT || 5000;

// --- 3. CONFIGURAÇÃO DO FIREBASE ADMIN ---
try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // --- ATUALIZADO COM O NOME DO SEU NOVO BUCKET ---
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

// --- 5. ROTAS DA APLICAÇÃO ---
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
        
        console.log('Iniciando o Puppeteer...');
        browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        
        for (const type of contractTypes) {
            console.log(`[LOOP INICIO] Gerando contrato do tipo: ${type}`);
            const templatePath = path.resolve(__dirname, 'templates', `tibagi_${type}.html`);
            if (!fs.existsSync(templatePath)) {
                console.warn(` - Template não encontrado, pulando: ${templatePath}`);
                continue;
            }
            
            let htmlContent = fs.readFileSync(templatePath, 'utf8');
            Object.keys(templateData).forEach(key => {
                const value = templateData[key] ?? '';
                const regex = new RegExp(`{{${key}}}`, 'g');
                htmlContent = htmlContent.replace(regex, String(value));
            });

            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
            
            const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '2.5cm', right: '2.5cm', bottom: '2.5cm', left: '2.5cm' } });
            
            const fileName = `${type}_${clientData.NOMECLIENTE.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
            const filePath = `clients/${clientId}/documents/${fileName}`;
            const fileUpload = bucket.file(filePath);

            console.log(` - Fazendo upload do arquivo ${fileName} para o Storage...`);
            await fileUpload.save(pdfBuffer, { metadata: { contentType: 'application/pdf' } });
            console.log(` - Upload de ${fileName} concluído com sucesso.`);
            
            const fileInfo = { name: fileName, path: filePath, createdAt: new Date() };
            generatedFilesInfo.push(fileInfo);
        }

        if (generatedFilesInfo.length > 0) {
            console.log("Atualizando o documento do cliente no Firestore...");
            await clientRef.update({
                documents: admin.firestore.FieldValue.arrayUnion(...generatedFilesInfo)
            });
        }
        
        console.log("Processo finalizado com sucesso!");
        res.status(200).json({ message: 'Documentos gerados e salvos com sucesso!', documents: generatedFilesInfo });

    } catch (error) {
        console.error('ERRO GERAL NA GERAÇÃO DE CONTRATOS:', error);
        res.status(500).json({ message: 'Ocorreu um erro inesperado no servidor ao gerar os documentos.', error: error.message });
    } finally {
        if (browser) { await browser.close(); }
    }
});

// --- 6. INICIALIZAÇÃO DO SERVIDOR ---
app.listen(PORT, () => {
    console.log(`Servidor backend rodando na porta http://localhost:${PORT}`);
});