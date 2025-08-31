import React, { useState, useEffect, useCallback } from 'react';
import { storage, auth, db } from '../../firebase-config/config';
import { ref, uploadBytes, listAll, getDownloadURL, deleteObject, getMetadata } from 'firebase/storage';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';
import Swal from 'sweetalert2';
import { logHistoryEvent } from '../../utils/historyLogger';
import './DocumentsTab.css';


const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).replace(',', ' -');
};

function DocumentsTab({ client }) {
  const [fileList, setFileList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [documentType, setDocumentType] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [user] = useAuthState(auth);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (user) {
        const userDocRef = doc(db, 'usuarios', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserInfo(userDoc.data());
        }
      }
    };
    fetchUserInfo();
  }, [user]);

  const fetchFiles = useCallback(async () => {
    setFileList([]);
    setIsLoading(true);
    try {
      if (!client || !client.id) throw new Error("ID do cliente não encontrado.");
      const folderRef = ref(storage, `clientes/${client.id}`);
      const res = await listAll(folderRef);
      const filesPromises = res.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        const metadata = await getMetadata(itemRef);
        // Evita erro se o nome do arquivo não tiver o prefixo
        const nameParts = metadata.name.split('___');
        const type = nameParts.length > 1 ? nameParts[0].replace(/-/g, ' ') : 'Desconhecido';
        const name = nameParts.length > 1 ? nameParts.slice(1).join('___') : metadata.name;

        const responsibleName = metadata.customMetadata?.responsibleUserName || 'Não identificado';
        const responsibleCargo = metadata.customMetadata?.responsibleUserCargo || '';
        const responsibleDisplay = responsibleCargo 
          ? `${responsibleCargo.toUpperCase()}: ${responsibleName.toUpperCase()}`
          : responsibleName.toUpperCase();
        return {
          name: name,
          type: type,
          url: url,
          fullPath: itemRef.fullPath,
          date: metadata.timeCreated,
          responsible: responsibleDisplay,
        };
      });
      const files = await Promise.all(filesPromises);
      files.sort((a, b) => new Date(b.date) - new Date(a.date));
      setFileList(files);
    } catch (error) {
      console.error("Erro ao buscar documentos:", error);
      if (error.code !== 'storage/object-not-found') {
        Swal.fire("Erro!", "Falha ao buscar os documentos.", "error");
      }
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (client?.id) {
        fetchFiles();
    }
  }, [client, fetchFiles]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !documentType.trim() || !userInfo) {
      Swal.fire("Atenção!", "Por favor, preencha o tipo, selecione um arquivo e certifique-se de estar logado.", "warning");
      return;
    }
    setIsUploading(true);
    const tipoDocumentoFormatado = documentType.trim();
    const sanitizedType = tipoDocumentoFormatado.replace(/\s+/g, '-');
    const newFileName = `${sanitizedType}___${selectedFile.name}`;
    const filePath = `clientes/${client.id}/${newFileName}`;
    const fileRef = ref(storage, filePath);
    const metadata = {
      customMetadata: {
        'responsibleUserName': userInfo.nome,
        'responsibleUserCargo': userInfo.cargo || ''
      }
    };
    try {
      await uploadBytes(fileRef, selectedFile, metadata);
      
      const responsavel = userInfo.nome || user.email;
      const acao = `Anexou o documento do tipo '${tipoDocumentoFormatado}' (${selectedFile.name})`;
      await logHistoryEvent(client.id, acao, responsavel);

      Swal.fire('Sucesso!', 'Documento enviado com sucesso!', 'success');
      resetAddForm();
      fetchFiles();
    } catch (error) {
      console.error("Erro ao enviar o documento:", error);
      Swal.fire("Erro!", "Falha ao enviar o documento.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const confirmDelete = (file) => {
    Swal.fire({
      title: `Excluir "${file.name}"?`,
      text: "Esta ação não pode ser desfeita!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        handleDeleteFile(file);
      }
    });
  };

  const handleDeleteFile = async (file) => {
    if (!userInfo) {
        Swal.fire("Erro!", "Não foi possível identificar o usuário para registrar a ação.", "error");
        return;
    }
    try {
      const fileRef = ref(storage, file.fullPath);
      await deleteObject(fileRef);

      const responsavel = userInfo.nome || user.email;
      const acao = `Excluiu o documento do tipo '${file.type}' (${file.name})`;
      await logHistoryEvent(client.id, acao, responsavel);

      Swal.fire('Excluído!', 'O documento foi excluído com sucesso.', 'success');
      fetchFiles();
    } catch (error) {
      console.error("Erro ao excluir o documento:", error);
      Swal.fire("Erro!", "Falha ao excluir o documento.", "error");
    }
  };
  
  const resetAddForm = () => {
    setShowAddForm(false);
    setDocumentType('');
    setSelectedFile(null);
  };

  return (
    <div className="documents-tab-container">
      <div className="documents-header">
        <h3>Documentos de {client.NOMECLIENTE}</h3>
        {!showAddForm && (
          <button onClick={() => setShowAddForm(true)} className="btn-add-document">
            + Adicionar documento
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="add-document-form-container">
            <form onSubmit={handleUpload}>
                <h4>Novo Documento</h4>
                <div className="form-inputs">
                    <div className="input-group">
                        <label htmlFor="doc-type">Tipo do Documento</label>
                        <input 
                            id="doc-type" type="text" value={documentType}
                            onChange={(e) => setDocumentType(e.target.value)}
                            placeholder="Ex: RG, CPF, Comprovante de Residência" required
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="doc-file">Arquivo</label>
                        <input 
                            id="doc-file" type="file" onChange={handleFileChange} required
                        />
                    </div>
                </div>
                <div className="form-actions">
                    <button type="submit" className="btn-save-document" disabled={isUploading}>
                        {isUploading ? 'Enviando...' : 'Salvar Documento'}
                    </button>
                    <button type="button" className="btn-cancel-document" onClick={resetAddForm}>
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
      )}

      <div className="documents-list-table">
        <div className="doc-table-header">
          <div className="doc-header-item col-type">Tipo</div>
          <div className="doc-header-item col-name">Nome do Arquivo</div>
          <div className="doc-header-item col-date">Data de Envio</div>
          <div className="doc-header-item col-responsible">Responsável</div>
          <div className="doc-header-item col-actions">Visualizar</div>
          <div className="doc-header-item col-actions">Excluir</div>
        </div>
        
        {isLoading && <div className="table-message">Carregando documentos...</div>}
        
        {!isLoading && fileList.length === 0 && (
          <div className="table-message">Nenhum documento encontrado.</div>
        )}
        
        {fileList.map((file) => (
          <div key={file.fullPath} className="doc-table-row">
            <div className="doc-cell-item col-type">{file.type}</div>
            <div className="doc-cell-item col-name">{file.name}</div>
            <div className="doc-cell-item col-date">{formatDate(file.date)}</div>
            <div className="doc-cell-item col-responsible">{file.responsible}</div>
            <div className="doc-cell-item col-actions">
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="action-icon">
                <i className="fa-regular fa-eye"></i>
              </a>
            </div>
            <div className="doc-cell-item col-actions">
              <button onClick={() => confirmDelete(file)} className="action-icon delete-icon">
                <i className="fa-regular fa-trash-can"></i>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DocumentsTab;