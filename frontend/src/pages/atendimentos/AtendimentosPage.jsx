import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase-config/config';
// --- CORREÇÃO AQUI: Adicionado 'getDocs' de volta à importação ---
import { collection, query, where, Timestamp, onSnapshot, addDoc, updateDoc, doc, getDocs } from 'firebase/firestore';
import Swal from 'sweetalert2';
import './AtendimentosPage.css';

// Componente AgendamentoModal (sem alterações)
const AgendamentoModal = ({ isOpen, onClose, diaSelecionado, clientes, advogados, onSave }) => {
    const [horario, setHorario] = useState('09:00');
    const [clienteId, setClienteId] = useState('');
    const [advogadoId, setAdvogadoId] = useState('');
    const [observacao, setObservacao] = useState('');

    useEffect(() => {
        if (isOpen) {
            setHorario('09:00');
            setClienteId('');
            setAdvogadoId('');
            setObservacao('');
        }
    }, [isOpen, diaSelecionado]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!clienteId || !advogadoId) {
            Swal.fire('Atenção!', 'Cliente e Advogado são obrigatórios.', 'warning');
            return;
        }
        onSave({ horario, clienteId, advogadoId, observacao });
    };
    
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button onClick={onClose} className="modal-close-btn">&times;</button>
                <h2>Novo Atendimento</h2>
                <p className="modal-date">{diaSelecionado.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <form onSubmit={handleSubmit}>
                    <div className="form-group"><label>Horário</label><input type="time" value={horario} onChange={e => setHorario(e.target.value)} required /></div>
                    <div className="form-group"><label>Cliente</label><select value={clienteId} onChange={e => setClienteId(e.target.value)} required><option value="">Selecione o Cliente</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.NOMECLIENTE}</option>)}</select></div>
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

            Swal.fire('Sucesso!', 'Atendimento agendado com sucesso.', 'success');
            setIsAddModalOpen(false);
        } catch (error) {
            Swal.fire('Erro!', 'Ocorreu um erro ao agendar.', 'error');
        }
    };
    
    const handleStatusChange = async (id, status) => {
        const atendimentoRef = doc(db, "agendamentos", id);
        try {
            await updateDoc(atendimentoRef, { status });
            Swal.fire('Sucesso!', `Atendimento atualizado para ${status}.`, 'success');
            setIsDetalhesModalOpen(false);
        } catch(error) {
            Swal.fire('Erro!', 'Não foi possível atualizar.', 'error');
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
            <div className="calendario-grid">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => <div key={dia} className="dia-semana">{dia}</div>)}{diasDoMes.map((dia, index) => (<div key={index} className={`dia-calendario ${dia ? '' : 'vazio'}`} onClick={() => handleDayClick(dia)}>{dia && (<><span className={dia.toDateString() === new Date().toDateString() ? 'dia-hoje' : ''}>{dia.getDate()}</span><div className="atendimentos-dots">{(atendimentosPorDia.get(dia.toDateString()) || []).map(at => (<div key={at.id} className={`dot status-${at.status.toLowerCase()}`}></div>))}</div></>)}</div>))}</div>
            <AgendamentoModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} diaSelecionado={diaSelecionado} clientes={clientes} advogados={advogados} onSave={handleSaveAgendamento}/>
            <DiaDetalhesModal isOpen={isDetalhesModalOpen} onClose={() => setIsDetalhesModalOpen(false)} dia={diaSelecionado} atendimentosDoDia={atendimentosPorDia.get(diaSelecionado?.toDateString()) || []} onStatusChange={handleStatusChange} onAddNovo={handleOpenAddModalFromDetalhes}/>
        </div>
    );
}

export default AtendimentosPage;