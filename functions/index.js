/* eslint-disable max-len */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {onSchedule} = require("firebase-functions/v2/scheduler");

admin.initializeApp();
const db = admin.firestore();

const criarNotificacoesParaTodosUsuarios = async (notificacoesACriar) => {
  if (notificacoesACriar.length === 0) {
    return;
  }

  const usersSnapshot = await db.collection("usuarios").get();
  if (usersSnapshot.empty) {
    console.log("ERRO CRÍTICO: A coleção 'usuarios' está vazia ou não foi encontrada.");
    return;
  }

  const batch = db.batch();
  usersSnapshot.forEach((userDoc) => {
    const userId = userDoc.id;
    // Para cada notificação pendente, cria uma cópia para cada usuário
    notificacoesACriar.forEach((notificacao) => {
      const notificacaoCompleta = {
        ...notificacao,
        usuarioId: userId,
        dataCriacao: admin.firestore.FieldValue.serverTimestamp(),
        lida: false,
      };
      const notificacaoRef = db.collection("notificacoes").doc();
      batch.set(notificacaoRef, notificacaoCompleta);
    });
  });

  await batch.commit();
  console.log(`SUCESSO: ${notificacoesACriar.length} evento(s) de notificação foram criados para ${usersSnapshot.size} usuário(s).`);
};

exports.verificarAniversariosDiarios = onSchedule(
    {
      schedule: "every day 09:00",
      timeZone: "America/Sao_Paulo",
    },
    async (event) => {
      console.log("Iniciando verificação diária...");
      const hoje = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
      const diaHoje = hoje.getDate();
      const mesHoje = hoje.getMonth() + 1;
      const hojeString = `${diaHoje}/${mesHoje}`;
      console.log(`Data de hoje para comparação: ${hojeString}`);

      const clientesSnapshot = await db.collection("clientes").get();
      if (clientesSnapshot.empty) {
        console.log("Nenhum cliente encontrado.");
        return null;
      }

      // Array para guardar os DADOS das notificações, não as tarefas
      const notificacoesPendentes = [];

      for (const doc of clientesSnapshot.docs) {
        const cliente = doc.data();
        const clienteId = doc.id;

        // Aniversário (DATANASCIMENTO - String)
        if (cliente.DATANASCIMENTO && typeof cliente.DATANASCIMENTO === 'string') {
          const partes = cliente.DATANASCIMENTO.split('-');
          if (partes.length === 3) {
            const anoNascimento = parseInt(partes[0], 10);
            const mesNascimento = parseInt(partes[1], 10);
            const diaNascimento = parseInt(partes[2], 10);
            
            if (`${diaNascimento}/${mesNascimento}` === hojeString) {
              const idade = hoje.getFullYear() - anoNascimento;
              console.log(`Aniversário correspondente para: ${cliente.NOMECLIENTE}, completando ${idade} anos.`);
              notificacoesPendentes.push({
                titulo: "Aniversário de Cliente",
                mensagem: `Hoje é aniversário de ${cliente.NOMECLIENTE}, completando ${idade} anos!`,
                link: `/cliente/${clienteId}`,
                tipo: "aniversario_cliente",
              });
            }
          }
        }

        // Aniversário de Cadastro (DATACADASTRO - Timestamp)
        if (cliente.DATACADASTRO && cliente.DATACADASTRO.toDate) {
          const dataCadastro = cliente.DATACADASTRO.toDate();
          const diaCadastro = dataCadastro.getDate();
          const mesCadastro = dataCadastro.getMonth() + 1;

          if (`${diaCadastro}/${mesCadastro}` === hojeString) {
            const anos = hoje.getFullYear() - dataCadastro.getFullYear();
            if (anos >= 0) {
              console.log(`Aniversário de cadastro correspondente para: ${cliente.NOMECLIENTE}`);
              notificacoesPendentes.push({
                titulo: "Aniversário de Cadastro",
                mensagem: `${cliente.NOMECLIENTE} completa hoje ${anos === 0 ? 'seu cadastro' : anos + ' ano(s) de cadastro'}.`,
                link: `/cliente/${clienteId}`,
                tipo: "aniversario_cadastro",
              });
            }
          }
        }
      }

      // Após verificar TODOS os clientes, cria as notificações pendentes de uma vez
      if (notificacoesPendentes.length > 0) {
        await criarNotificacoesParaTodosUsuarios(notificacoesPendentes);
      } else {
        console.log("Nenhuma data correspondente encontrada hoje.");
      }

      console.log("Verificação diária de aniversários concluída.");
      return null;
    });