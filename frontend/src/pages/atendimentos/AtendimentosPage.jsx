import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase-config/config';
import { collection, query, where, Timestamp, onSnapshot, addDoc, updateDoc, doc, getDocs } from 'firebase/firestore';
import Swal from 'sweetalert2';
import './AtendimentosPage.css';
import { useHelp } from '../../contexto/HelpContext';

// --- DEFINIÇÃO DO TOAST ---
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  }
});

// --- NOVO COMPONENTE AgendamentoModal (com busca) ---
const AgendamentoModal = ({ isOpen, onClose, diaSelecionado, clientes, advogados, onSave }) => {
    const [horario, setHorario] = useState('09:00');
    const [advogadoId, setAdvogadoId] = useState('');
    const [observacao, setObservacao] = useState('');
    
    // Novos estados para a busca de cliente
    const [selectedClientId, setSelectedClientId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    
    // Filtra os clientes com base no que foi digitado
    const filteredClientes = useMemo(() => {
        if (!searchTerm) {
            return []; // Não mostra nada se o campo estiver vazio
        }
        // Filtra e limita os resultados (ex: 10) para performance
        return clientes.filter(c =>
            c.NOMECLIENTE.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 10); 
    }, [searchTerm, clientes]);
    
    // Reseta o formulário quando o modal é aberto
    useEffect(() => {
        if (isOpen) {
            setHorario('09:00');
            setSelectedClientId('');
            setAdvogadoId('');
            setObservacao('');
            setSearchTerm('');
            setIsDropdownOpen(false);
        }
    }, [isOpen]); // Removida a dependência 'diaSelecionado' que não era usada aqui

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedClientId || !advogadoId) { // Usa o ID selecionado
            Toast.fire({ icon: 'warning', title: 'Cliente e Advogado são obrigatórios.'});
            return;
        }
        onSave({ horario, clienteId: selectedClientId, advogadoId, observacao });
    };

    // Função para quando o usuário clica em um cliente na lista
    const handleClienteSelect = (cliente) => {
        setSelectedClientId(cliente.id);
        setSearchTerm(cliente.NOMECLIENTE); // Põe o nome no input
        setIsDropdownOpen(false);
    };
    
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button onClick={onClose} className="modal-close-btn">&times;</button>
                <h2>Novo Atendimento</h2>
                <p className="modal-date">{diaSelecionado.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <form onSubmit={handleSubmit}>
                    <div className="form-group"><label>Horário</label><input type="time" value={horario} onChange={e => setHorario(e.target.value)} required /></div>
                    
                    {/* --- CAMPO DE CLIENTE MODIFICADO --- */}
                    <div className="form-group searchable-select-container">
                        <label>Cliente</label>
                        <input 
                            type="text"
                            value={searchTerm}
                            onChange={e => {
                                setSearchTerm(e.target.value);
                                setSelectedClientId(''); // Limpa o ID se o usuário voltar a digitar
                                setIsDropdownOpen(true);
                            }}
                            onFocus={() => {
                                // Mostra sugestões se já houver texto, ou apenas abre
                                if (searchTerm) {
                                    setIsDropdownOpen(true);
                                }
                            }}
                            onBlur={() => {
                                // Pequeno delay para permitir o clique no item do dropdown
                                setTimeout(() => setIsDropdownOpen(false), 200);
                            }}
                            placeholder="Digite para buscar um cliente..."
                            required={!selectedClientId} // Obrigatório se nenhum cliente estiver selecionado
                            autoComplete="off"
                        />
                        {isDropdownOpen && filteredClientes.length > 0 && (
                            <ul className="search-results-dropdown">
                                {filteredClientes.map(c => (
                                    <li 
                                        key={c.id} 
                                        // Usar onMouseDown garante que o clique seja registrado antes do onBlur do input
                                        onMouseDown={() => handleClienteSelect(c)} 
                                    >
                                        {c.NOMECLIENTE}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    {/* --- FIM DA MODIFICAÇÃO --- */}

                    <div className="form-group"><label>Advogado</label><select value={advogadoId} onChange={e => setAdvogadoId(e.target.value)} required><option value="">Selecione o Advogado</option>{advogados.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}</select></div>
                    <div className="form-group"><label>Observação (Opcional)</label><textarea value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Adicione uma breve observação..."></textarea></div>
                    <div className="form-actions"><button type="submit" className="btn-salvar">Agendar</button></div>
                </form>
            </div>
        </div>
    );
};

// Componente DiaDetalhesModal (sem alterações)
const DiaDetalhesModal = ({ isOpen, onClose, dia, atendimentosDoDia, onStatusChange, onAddNovo }) => {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button onClick={onClose} className="modal-close-btn">&times;</button>
                <h2>Atendimentos do Dia</h2>
                <p className="modal-date">{dia.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <div className="lista-atendimentos-dia">
                    {atendimentosDoDia.length > 0 ? (
                        atendimentosDoDia.sort((a,b) => a.horario.localeCompare(b.horario)).map(at => (
                            <div key={at.id} className={`atendimento-item status-${at.status.toLowerCase()}`}>
                                <div className="atendimento-info"><strong>{at.horario}</strong> - {at.clienteNome}<small>com Dr(a). {at.advogadoNome}</small>{at.observacao && <p className="atendimento-obs">Obs: {at.observacao}</p>}</div>
                                <div className="atendimento-actions">{at.status === 'Agendado' && (<button onClick={() => onStatusChange(at.id, 'Concluído')} className="btn-concluir-dia"><i className="fa-solid fa-check"></i> Concluído</button>)}{at.status === 'Concluído' && (<button onClick={() => onStatusChange(at.id, 'Agendado')} className="btn-reagendar-dia"><i className="fa-solid fa-arrow-rotate-left"></i> Reagendar</button>)}</div>
                            </div>
                        ))
                    ) : ( <p>Nenhum atendimento agendado para este dia.</p> )}
                </div>
                <div className="modal-footer"><button onClick={onAddNovo} className="btn-add-novo"><i className="fa-solid fa-plus"></i> Adicionar Novo Atendimento</button></div>
            </div>
        </div>
    )
};


function AtendimentosPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [atendimentos, setAtendimentos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [advogados, setAdvogados] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [diaSelecionado, setDiaSelecionado] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDetalhesModalOpen, setIsDetalhesModalOpen] = useState(false);
    const { setHelpContent } = useHelp();

    useEffect(() => {
        const helpText = `
            <h2>Ajuda: Atendimentos</h2>
            <p>Esta tela funciona como uma agenda para marcar e gerenciar os atendimentos presenciais ou virtuais.</p>
            <ul>
                <li><strong>Navegação:</strong> Use as setas (< >) ao lado do nome do mês para navegar pelo calendário.</li>
                <li><strong>Agendar (Dia Vazio):</strong> Clicar em um dia sem atendimentos abre diretamente o modal para um novo agendamento.</li>
                <li><strong>Ver/Agendar (Dia com Ponto):</strong> Clicar em um dia que já possui atendimentos (indicado por pontos coloridos) abre um resumo daquele dia.</li>
                <li><strong>Botão Flutuante (+):</strong> Permite agendar um novo atendimento para o dia de hoje, independentemente de qual mês você está visualizando.</li>
                <li><strong>Status dos Pontos:</strong> Os pontos coloridos indicam o status dos atendimentos (Ex: Agendado, Concluído).</li>
            </ul>
        `;
        setHelpContent(helpText);

        // Limpa o conteúdo quando o usuário sair desta página
        return () => setHelpContent(null);
    }, [setHelpContent]);
    // --- FIM DA ALTERAÇÃO ---

    useEffect(() => {
        const fetchDataAndListen = async () => {
            setIsLoading(true);
            try {
                const selectedLocation = localStorage.getItem('selectedLocation');
                if (!selectedLocation) { setIsLoading(false); return; };
            
                const clientesQuery = query(collection(db, "clientes"), where("LOCATION", "==", selectedLocation));
                const clientesSnapshot = await getDocs(clientesQuery);
                const sortedClientes = clientesSnapshot.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => a.NOMECLIENTE.localeCompare(b.NOMECLIENTE));
                setClientes(sortedClientes);
                
                const advogadosQuery = query(collection(db, "usuarios"), where("cargo", "in", ["Advogado", "Advogado(a)"]));
                const advogadosSnapshot = await getDocs(advogadosQuery);
                const sortedAdvogados = advogadosSnapshot.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => a.nome.localeCompare(b.nome));
                setAdvogados(sortedAdvogados);

                const atendimentosQuery = query(collection(db, "agendamentos"), where("location", "==", selectedLocation));
                const unsubscribe = onSnapshot(atendimentosQuery, (atendimentosSnapshot) => {
                    setAtendimentos(atendimentosSnapshot.docs.map(d => ({ ...d.data(), id: d.id })));
                    setIsLoading(false);
                }, (error) => {
                    console.error("Erro ao ouvir agendamentos: ", error);
                    setIsLoading(false);
                });
                
                return unsubscribe;

            } catch (error) {
                console.error("Erro ao buscar dados iniciais: ", error);
                setIsLoading(false);
            }
        };

        const unsubscribePromise = fetchDataAndListen();

        return () => {
            unsubscribePromise.then(unsubscribe => {
                if (unsubscribe && typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            });
        };
    }, []);

    const diasDoMes = useMemo(() => {
        const ano = currentDate.getFullYear(); const mes = currentDate.getMonth();
        const primeiroDia = new Date(ano, mes, 1).getDay(); const diasNoMes = new Date(ano, mes + 1, 0).getDate();
        const dias = Array.from({ length: primeiroDia }).fill(null);
        for (let i = 1; i <= diasNoMes; i++) { dias.push(new Date(ano, mes, i)); }
        return dias;
    }, [currentDate]);

    const atendimentosPorDia = useMemo(() => {
        const map = new Map();
        atendimentos.forEach(at => {
            if (at.data && at.data.toDate) {
                const data = at.data.toDate().toDateString();
                if (!map.has(data)) { map.set(data, []); }
                map.get(data).push(at);
            }
        });
        return map;
    }, [atendimentos]);

    const handleSaveAgendamento = async (data) => {
        try {
            const clienteSelecionado = clientes.find(c => c.id === data.clienteId);
            const advogadoSelecionado = advogados.find(a => a.id === data.advogadoId);
            
            await addDoc(collection(db, "agendamentos"), {
                data: Timestamp.fromDate(diaSelecionado),
                horario: data.horario, clienteId: data.clienteId, clienteNome: clienteSelecionado.NOMECLIENTE,
                advogadoId: data.advogadoId, advogadoNome: advogadoSelecionado.nome, observacao: data.observacao,
                status: 'Agendado', location: clienteSelecionado.LOCATION,
            });

            Toast.fire({ icon: 'success', title: 'Atendimento agendado com sucesso.' });
            setIsAddModalOpen(false);
        } catch (error) {
            Toast.fire({ icon: 'error', title: 'Ocorreu um erro ao agendar.' });
        }
    };
    
    const handleStatusChange = async (id, status) => {
        const atendimentoRef = doc(db, "agendamentos", id);
        try {
            await updateDoc(atendimentoRef, { status });
            Toast.fire({ icon: 'success', title: `Atendimento atualizado para ${status}.` });
            setIsDetalhesModalOpen(false);
        } catch(error) {
            Toast.fire({ icon: 'error', title: 'Não foi possível atualizar.' });
        }
    };

    const changeMonth = (offset) => { setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1)); };
    const handleDayClick = (dia) => { if (!dia) return; setDiaSelecionado(dia); const atendimentosDoDia = atendimentosPorDia.get(dia.toDateString()) || []; if (atendimentosDoDia.length > 0) { setIsDetalhesModalOpen(true); } else { setIsAddModalOpen(true); } };
    const handleOpenAddModalFromDetalhes = () => { setIsDetalhesModalOpen(false); setIsAddModalOpen(true); };
    
    if (isLoading) { return <div className="loading-container">Carregando agenda...</div>; }
    
    return (
        <div className="calendario-container">
            <div className="calendario-header"><button onClick={() => changeMonth(-1)}>&lt;</button><h2>{currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h2><button onClick={() => changeMonth(1)}>&gt;</button></div>
            <button className="btn-novo-atendimento-flutuante" onClick={() => { setDiaSelecionado(new Date()); setIsAddModalOpen(true); }}><i className="fa-solid fa-plus"></i> Novo Atendimento</button>
            
            <div className="calendario-grid">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => <div key={dia} className="dia-semana">{dia}</div>)}
                
                {/* --- CORREÇÃO AQUI: (dia, index) em vez de (index, dia) --- */}
                {diasDoMes.map((dia, index) => (
                    <div 
                        key={index} 
                        className={`dia-calendario ${dia ? '' : 'vazio'}`} 
                        onClick={() => handleDayClick(dia)}>
                        {dia && (
                            <>
                                <span className={dia.toDateString() === new Date().toDateString() ? 'dia-hoje' : ''}>
                                    {dia.getDate()}
                                </span>
                                <div className="atendimentos-dots">
                                    {(atendimentosPorDia.get(dia.toDateString()) || []).map(at => (
                                        <div key={at.id} className={`dot status-${at.status.toLowerCase()}`}></div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
            
            <AgendamentoModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} diaSelecionado={diaSelecionado} clientes={clientes} advogados={advogados} onSave={handleSaveAgendamento}/>
            <DiaDetalhesModal isOpen={isDetalhesModalOpen} onClose={() => setIsDetalhesModalOpen(false)} dia={diaSelecionado} atendimentosDoDia={atendimentosPorDia.get(diaSelecionado?.toDateString()) || []} onStatusChange={handleStatusChange} onAddNovo={handleOpenAddModalFromDetalhes}/>
        </div>
    );
}

export default AtendimentosPage;