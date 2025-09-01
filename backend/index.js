// backend/index.js

// --- 1. IMPORTAÇÕES ---
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { Readable } = require('stream');
const admin = require('firebase-admin');

// --- 2. INICIALIZAÇÃO DO APP EXPRESS ---
// A variável 'app' deve ser criada aqui, no início, antes de ser usada.
const app = express();
const PORT = 5000;

// --- 3. CONFIGURAÇÃO DO FIREBASE ADMIN ---
// Verifique se o nome do arquivo corresponde ao que você baixou do Firebase
const serviceAccount = require('./serviceAccountKey.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // IMPORTANTE: Substitua 'seu-projeto-id.appspot.com' pelo seu Storage Bucket ID real do Firebase
  storageBucket: "sgac-projeto-e4d9c.appspot.com" 
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// --- 4. MIDDLEWARES ---
// Esta seção configura o 'app' depois de ele ter sido criado.
app.use(cors()); // Habilita o CORS para permitir a comunicação entre frontend e backend
app.use(express.json()); // Permite que o servidor entenda JSON no corpo das requisições

// --- 5. ROTAS DA APLICAÇÃO ---

// Rota de teste para verificar se o servidor está no ar
app.get('/', (req, res) => {
  res.send('Servidor SGAC rodando e pronto para receber requisições!');
});

// Rota para gerar os contratos
app.post('/api/gerar-contratos', async (req, res) => {
    const { clientId, contractTypes } = req.body;

    if (!clientId || !contractTypes || !Array.isArray(contractTypes) || contractTypes.length === 0) {
        return res.status(400).json({ message: 'ID do cliente e tipos de contrato são obrigatórios.' });
    }

    try {
        const clientRef = db.collection('clientes').doc(clientId);
        const clientDoc = await clientRef.get();
        if (!clientDoc.exists) {
            return res.status(404).json({ message: 'Cliente não encontrado.' });
        }
        const clientData = clientDoc.data();

        const today = new Date();
        const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const templateData = {
            ...clientData,
            dia: today.getDate(),
            mes: months[today.getMonth()],
            ano: today.getFullYear()
        };
        
        const generatedFilesInfo = [];
        // Adicionado { headless: "new" } para compatibilidade com versões mais recentes do Puppeteer
        const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        
        for (const type of contractTypes) {
            const templatePath = path.resolve(__dirname, 'templates', `tibagi_${type}.html`);
            if (!fs.existsSync(templatePath)) {
                console.warn(`Template não encontrado: ${templatePath}`);
                continue;
            }
            let htmlContent = fs.readFileSync(templatePath, 'utf8');

            // Garante que todos os dados sejam convertidos para string antes de substituir
            Object.keys(templateData).forEach(key => {
                const value = templateData[key] === null || templateData[key] === undefined ? '' : templateData[key];
                const regex = new RegExp(`{{${key}}}`, 'g');
                htmlContent = htmlContent.replace(regex, String(value));
            });

            const page = await browser.newPage();
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
            const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' } });
            await page.close();
            
            const fileName = `${type}_${clientData.NOMECLIENTE.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
            const filePath = `clients/${clientId}/documents/${fileName}`;
            const fileUpload = bucket.file(filePath);

            const stream = Readable.from(pdfBuffer);
            await new Promise((resolve, reject) => {
                stream.pipe(fileUpload.createWriteStream({ metadata: { contentType: 'application/pdf' } }))
                    .on('finish', resolve)
                    .on('error', reject);
            });
            
            const fileInfo = { name: fileName, path: filePath, createdAt: new Date() };
            generatedFilesInfo.push(fileInfo);
        }
        await browser.close();

        const currentDocs = clientDoc.data().documents || [];
        await clientRef.update({
            documents: [...currentDocs, ...generatedFilesInfo]
        });

        res.status(200).json({ message: 'Documentos gerados e salvos com sucesso!', documents: generatedFilesInfo });

    } catch (error) {
        console.error('Erro detalhado ao gerar contratos:', error);
        res.status(500).json({ message: 'Ocorreu um erro no servidor ao gerar documentos.' });
    }
});

// --- 6. INICIALIZAÇÃO DO SERVIDOR ---
app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
});