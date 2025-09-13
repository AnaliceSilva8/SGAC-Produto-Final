/* eslint-disable max-len */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {onSchedule} = require("firebase-functions/v2/scheduler");

admin.initializeApp();
const db = admin.firestore();

// Função auxiliar para formatar datas para o fuso horário de São Paulo
// Isso garante que a data seja sempre tratada como se estivesse no Brasil.
const formatToSaoPauloDateString = (date) => {
  return new Date(date.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"})).toISOString().split('T')[0];
};

const criarNotificacoesParaTodosUsuarios = async (notificacoesACriar) => {
  if (notificacoesACriar.length === 0) {
    return;
  }
  const usersSnapshot = await db.collection("usuarios").get();
  if (usersSnapshot.empty) {
    console.log("ERRO CRÍTICO: A coleção 'usuarios' está vazia.");
    return;
  }
  const batch = db.batch();
  usersSnapshot.forEach((userDoc) => {
    const userId = userDoc.id;
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
        // ... (esta função continua a mesma, sem alterações)
        console.log("Iniciando verificação diária de aniversários...");
        const hoje = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
        const diaHoje = hoje.getDate();
        const mesHoje = hoje.getMonth() + 1;
        const hojeString = `${diaHoje}/${mesHoje}`;
  
        const clientesSnapshot = await db.collection("clientes").get();
        if (clientesSnapshot.empty) {
          console.log("Nenhum cliente encontrado.");
          return null;
        }
  
        const notificacoesPendentes = [];
        for (const doc of clientesSnapshot.docs) {
          const cliente = doc.data();
          const clienteId = doc.id;
          const location = cliente.LOCATION; 
          if (!location) continue;
  
          if (cliente.DATANASCIMENTO && typeof cliente.DATANASCIMENTO === "string") {
            const partes = cliente.DATANASCIMENTO.split("-");
            if (partes.length === 3) {
              const anoNascimento = parseInt(partes[0], 10);
              const mesNascimento = parseInt(partes[1], 10);
              const diaNascimento = parseInt(partes[2], 10);
              if (`${diaNascimento}/${mesNascimento}` === hojeString) {
                notificacoesPendentes.push({
                  titulo: "Aniversário de Cliente",
                  mensagem: `Hoje é aniversário de ${cliente.NOMECLIENTE}, completando ${hoje.getFullYear() - anoNascimento} anos!`,
                  link: `/cliente/${clienteId}`,
                  tipo: "aniversario_cliente",
                  location: location,
                });
              }
            }
          }
        }
        if (notificacoesPendentes.length > 0) {
          await criarNotificacoesParaTodosUsuarios(notificacoesPendentes);
        }
        console.log("Verificação de aniversários concluída.");
        return null;
    });

// --- FUNÇÃO DE NOTIFICAÇÃO DE ATENDIMENTOS CORRIGIDA E ROBUSTA ---
exports.verificarAtendimentosProximos = onSchedule(
    {
      schedule: "every day 00:01",
      timeZone: "America/Sao_Paulo",
    },
    async (event) => {
      console.log("Iniciando verificação de atendimentos com lógica de fuso horário corrigida...");

      const agora = new Date();
      
      // Converte as datas para strings no formato YYYY-MM-DD para evitar problemas de fuso horário
      const hojeString = formatToSaoPauloDateString(agora);
      
      const amanha = new Date(agora);
      amanha.setDate(agora.getDate() + 1);
      const amanhaString = formatToSaoPauloDateString(amanha);

      console.log(`Data de hoje (São Paulo): ${hojeString}, Data de amanhã (São Paulo): ${amanhaString}`);

      const agendamentosSnapshot = await db.collection("agendamentos").where("status", "==", "Agendado").get();
      if (agendamentosSnapshot.empty) {
        console.log("Nenhum atendimento com status 'Agendado' encontrado.");
        return null;
      }

      const notificacoesPendentes = [];
      agendamentosSnapshot.forEach((doc) => {
        const agendamento = doc.data();
        const location = agendamento.location;
        if (!location || !agendamento.data || !agendamento.data.toDate) return;

        // Converte a data do agendamento para o mesmo formato string YYYY-MM-DD
        const dataAgendamentoString = formatToSaoPauloDateString(agendamento.data.toDate());

        if (dataAgendamentoString === hojeString) {
          console.log(`Lembrete para HOJE encontrado: Cliente ${agendamento.clienteNome}`);
          notificacoesPendentes.push({
            titulo: "Lembrete de Atendimento",
            mensagem: `Hoje há um atendimento com ${agendamento.clienteNome} às ${agendamento.horario}, com Dr(a). ${agendamento.advogadoNome}.`,
            link: `/atendimentos`,
            tipo: "atendimento_hoje",
            location: location,
          });
        }

        if (dataAgendamentoString === amanhaString) {
            console.log(`Aviso para AMANHÃ encontrado: Cliente ${agendamento.clienteNome}`);
            notificacoesPendentes.push({
              titulo: "Aviso de Atendimento",
              mensagem: `Amanhã há um atendimento com ${agendamento.clienteNome} às ${agendamento.horario}, com Dr(a). ${agendamento.advogadoNome}.`,
              link: `/atendimentos`,
              tipo: "atendimento_amanha",
              location: location,
            });
        }
      });

      if (notificacoesPendentes.length > 0) {
        await criarNotificacoesParaTodosUsuarios(notificacoesPendentes);
      } else {
        console.log("Nenhum atendimento encontrado para hoje ou amanhã.");
      }

      console.log("Verificação de atendimentos concluída.");
      return null;
    },
);